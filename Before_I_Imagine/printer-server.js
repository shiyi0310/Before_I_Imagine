"use strict";

const express = require("express");
const cors = require("cors");
const sharp = require("sharp");
const opentype = require("opentype.js");
const fs = require("fs");
const path = require("path");
const { usb } = require("usb");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PRINTER_PORT || 3001);
const RECEIPT_WIDTH = 384;
const RECEIPT_PREVIEW_PATH = path.join(__dirname, "receipt-preview.png");
const IBM_PLEX_MONO_DIR = path.join(
  path.dirname(require.resolve("@ibm/plex-mono/package.json")),
  "fonts",
  "complete",
  "woff"
);
const receiptFonts = {
  regular: loadReceiptFont("IBMPlexMono-Regular.woff"),
  semibold: loadReceiptFont("IBMPlexMono-SemiBold.woff")
};

function loadReceiptFont(filename) {
  const data = fs.readFileSync(path.join(IBM_PLEX_MONO_DIR, filename));
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return opentype.parse(buffer);
}
const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://before-i-imagine.onrender.com"
];
const ALLOWED_ORIGINS = new Set(
  (process.env.PRINTER_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const app = express();
let printQueue = Promise.resolve();

app.use(express.json({ limit: "24mb" }));
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"] === "true") {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    // Requests without Origin are permitted for local curl/health checks.
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin is not allowed by the printer service: ${origin}`));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.get("/printer-status", async (_req, res) => {
  try {
    const descriptor = await detectPrinterDescriptor();
    res.json({ ok: true, printer: descriptor });
  } catch (error) {
    res.status(503).json({ ok: false, error: serializeError(error) });
  }
});

app.post("/print-report", async (req, res) => {
  const payload = req.body || {};

  try {
    const result = await enqueuePrint(async () => {
      const receipt = payload.test === true
        ? await createTestReceipt()
        : await createReportReceipt(payload);
      const printer = await sendRasterToPrinter(receipt);
      return {
        printer,
        width: receipt.width,
        height: receipt.height,
        test: payload.test === true
      };
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("[printer] Print failed:", error);
    res.status(500).json({ ok: false, error: serializeError(error) });
  }
});

app.post("/preview-report", async (req, res) => {
  try {
    const receipt = await createReportReceipt(req.body || {});
    await saveRasterPreview(receipt, RECEIPT_PREVIEW_PATH);
    res.json({
      ok: true,
      width: receipt.width,
      height: receipt.height,
      previewPath: RECEIPT_PREVIEW_PATH
    });
  } catch (error) {
    console.error("[printer] Preview generation failed:", error);
    res.status(500).json({ ok: false, error: serializeError(error) });
  }
});

app.get("/receipt-preview.png", (_req, res) => {
  res.sendFile(RECEIPT_PREVIEW_PATH);
});

app.use((error, _req, res, _next) => {
  console.error("[printer] Request error:", error);
  res.status(400).json({ ok: false, error: serializeError(error) });
});

if (require.main === module) {
  app.listen(PORT, HOST, async () => {
    console.log(`[printer] Local service listening at http://${HOST}:${PORT}`);
    console.log(`[printer] Allowed web origins: ${Array.from(ALLOWED_ORIGINS).join(", ")}`);
    try {
      const descriptor = await detectPrinterDescriptor();
      console.log("[printer] USB printer ready:", descriptor);
    } catch (error) {
      console.error("[printer] USB printer is not ready:", error);
    }
  });
}

function enqueuePrint(job) {
  const queued = printQueue.then(job, job);
  printQueue = queued.catch(() => {});
  return queued;
}

async function detectPrinterDevice() {
  const devices = await usb.getDevices();
  const expectedVendorId = parseOptionalUsbId(process.env.PRINTER_VENDOR_ID);
  const expectedProductId = parseOptionalUsbId(process.env.PRINTER_PRODUCT_ID);

  let printer = devices.find((device) => {
    if (expectedVendorId !== null && device.vendorId !== expectedVendorId) return false;
    if (expectedProductId !== null && device.productId !== expectedProductId) return false;
    return expectedVendorId !== null || expectedProductId !== null;
  });

  if (!printer) {
    printer = devices.find((device) => findBulkOutEndpoint(device) !== null);
  }
  if (!printer) {
    throw new Error("USB ESC/POS printer was not found.");
  }
  return printer;
}

async function detectPrinterDescriptor() {
  const device = await detectPrinterDevice();
  const target = findBulkOutEndpoint(device);
  if (!target) {
    throw new Error("Printer was found, but no bulk OUT endpoint is available.");
  }
  return {
    productName: device.productName || "USB printer",
    vendorId: formatUsbId(device.vendorId),
    productId: formatUsbId(device.productId),
    interfaceNumber: target.interfaceNumber,
    endpointNumber: target.endpointNumber,
    packetSize: target.packetSize
  };
}

function findBulkOutEndpoint(device) {
  for (const configuration of device.configurations || []) {
    for (const usbInterface of configuration.interfaces || []) {
      for (const alternate of usbInterface.alternates || []) {
        if (alternate.interfaceClass !== 7) continue;
        const endpoint = (alternate.endpoints || []).find((candidate) => {
          return candidate.direction === "out" && candidate.type === "bulk";
        });
        if (endpoint) {
          return {
            configurationValue: configuration.configurationValue,
            interfaceNumber: usbInterface.interfaceNumber,
            alternateSetting: alternate.alternateSetting,
            endpointNumber: endpoint.endpointNumber,
            packetSize: endpoint.packetSize
          };
        }
      }
    }
  }
  return null;
}

async function sendRasterToPrinter(receipt) {
  const device = await detectPrinterDevice();
  const target = findBulkOutEndpoint(device);
  if (!target) {
    throw new Error("Unable to find a bulk OUT endpoint on the printer.");
  }

  let claimed = false;
  try {
    await device.open();
    if (!device.configuration ||
        device.configuration.configurationValue !== target.configurationValue) {
      await device.selectConfiguration(target.configurationValue);
    }
    await device.claimInterface(target.interfaceNumber);
    claimed = true;
    if (target.alternateSetting !== 0) {
      await device.selectAlternateInterface(
        target.interfaceNumber,
        target.alternateSetting
      );
    }

    await transferOutChecked(
      device,
      target.endpointNumber,
      Uint8Array.from([0x1b, 0x40, 0x1b, 0x61, 0x00])
    );

    const stripHeight = 192;
    for (let top = 0; top < receipt.height; top += stripHeight) {
      const height = Math.min(stripHeight, receipt.height - top);
      const raster = sliceRasterRows(receipt.data, receipt.bytesPerRow, top, height);
      const xL = receipt.bytesPerRow & 0xff;
      const xH = (receipt.bytesPerRow >> 8) & 0xff;
      const yL = height & 0xff;
      const yH = (height >> 8) & 0xff;
      const command = Buffer.concat([
        Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
        raster
      ]);
      await transferOutChecked(device, target.endpointNumber, command);
    }

    // Feed four lines. This printer has no cutter, so no cut command is sent.
    await transferOutChecked(
      device,
      target.endpointNumber,
      Uint8Array.from([0x1b, 0x64, 0x04])
    );

    return {
      productName: device.productName || "USB printer",
      vendorId: formatUsbId(device.vendorId),
      productId: formatUsbId(device.productId),
      interfaceNumber: target.interfaceNumber,
      endpointNumber: target.endpointNumber
    };
  } catch (error) {
    error.message = [
      error.message,
      `device=${device.productName || "USB printer"}`,
      `interface=${target.interfaceNumber}`,
      `bulkOut=${target.endpointNumber}`,
      `claimed=${claimed}`
    ].join("; ");
    throw error;
  } finally {
    if (claimed) {
      try {
        await device.releaseInterface(target.interfaceNumber);
      } catch (error) {
        console.warn("[printer] Could not release USB interface:", error.message);
      }
    }
    if (device.opened) {
      try {
        await device.close();
      } catch (error) {
        console.warn("[printer] Could not close USB device:", error.message);
      }
    }
  }
}

async function transferOutChecked(device, endpointNumber, data) {
  const result = await device.transferOut(endpointNumber, data);
  if (!result || result.status !== "ok") {
    throw new Error(`USB transfer failed with status: ${result && result.status}`);
  }
}

async function createTestReceipt() {
  const svg = buildReceiptSvg({
    titleLines: ["BEFORE I IMAGINE", "USB PRINT TEST"]
  });
  return rasterizeReceipt(svg);
}

async function createReportReceipt(payload) {
  const apples = Array.isArray(payload.apples) ? payload.apples.slice(0, 4) : [];
  if (apples.length !== 4) {
    throw new Error("A report must contain exactly four apple entries.");
  }

  const preparedApples = await Promise.all(apples.map(async (apple) => {
    const source = apple.imageUrl || apple.thumbUrl || apple.image || null;
    return {
      prompt: cleanSingleLine(apple.prompt || "APPLE"),
      similarity: formatSimilarity(apple.similarity),
      appleNumber: normalizeAppleNumber(apple.appleNumber),
      imageDataUrl: source ? await prepareAppleImage(source) : null
    };
  }));

  const svg = buildReceiptSvg({
    reportId: cleanSingleLine(payload.reportId || "PENDING"),
    date: cleanSingleLine(payload.date || ""),
    reflection: cleanMultiline(payload.reflection || ""),
    apples: preparedApples
  });
  return rasterizeReceipt(svg);
}

function buildReceiptSvg(data) {
  const margin = 28;
  const parts = [];
  let y = 47;

  const text = (value, x, top, options = {}) => {
    parts.push(svgText(value, x, top, options));
  };
  const rule = (top, dashed = false) => {
    parts.push(
      `<line x1="${margin}" y1="${top}" x2="${RECEIPT_WIDTH - margin}" ` +
      `y2="${top}" stroke="#000" stroke-width="1"` +
      `${dashed ? ` stroke-dasharray="4 4"` : ""}/>`
    );
  };

  if (data.titleLines) {
    text(data.titleLines[0], RECEIPT_WIDTH / 2, y, {
      anchor: "middle",
      size: 25,
      weight: 700
    });
    y += 36;
    text(data.titleLines[1], RECEIPT_WIDTH / 2, y, {
      anchor: "middle",
      size: 22,
      weight: 700
    });
    y += 36;
    rule(y);
    y += 28;
    text("Printer connection successful.", RECEIPT_WIDTH / 2, y, {
      anchor: "middle",
      size: 16
    });
    y += 38;
    rule(y);
    y += 18;
    return wrapSvg(parts, y);
  }

  text("BEFORE I IMAGINE", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 21,
    weight: 600
  });
  y = 93;
  text("APPLE REPORT", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 21,
    weight: 600
  });
  drawBinaryApple(parts, 350, 80);
  y = 190;
  text("A record of one drawing session.", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 13
  });
  rule(221, true);

  text("REPORT ID:", margin, 235, { size: 14 });
  text(`#${data.reportId}`, RECEIPT_WIDTH - margin, 230, {
    anchor: "end",
    size: 24
  });
  text("DATE:", margin, 273, { size: 14 });
  text(data.date || "PENDING", RECEIPT_WIDTH - margin, 273, {
    anchor: "end",
    size: 15
  });
  rule(311, true);
  text(`ARCHIVE ${formatAppleNumberRange(data.apples)}`, margin, 326, {
    size: 17,
    weight: 600
  });
  y = 385;

  const imageW = 112;
  const imageH = 100;
  const imageXs = [56, 214];
  const imageRows = [395, 550];
  drawCropMark(parts, RECEIPT_WIDTH - 36, 338, "top-right");
  data.apples.forEach((apple, index) => {
    const imageX = imageXs[index % 2];
    const imageY = imageRows[Math.floor(index / 2)];
    if (apple.imageDataUrl) {
      parts.push(
        `<image href="${apple.imageDataUrl}" x="${imageX}" y="${imageY}" ` +
        `width="${imageW}" height="${imageH}" preserveAspectRatio="xMidYMid meet"/>`
      );
    } else {
      text("[IMAGE UNAVAILABLE]", imageX + imageW / 2, imageY + 48, {
        anchor: "middle",
        size: 10
      });
    }
  });
  y = 706;
  drawCropMark(parts, margin, 706, "bottom-left");
  rule(735, true);
  y = 754;

  text("REFLECTION", margin, y, { size: 15, weight: 600 });
  y = 808;
  if (data.reflection) {
    const reflectionLines = wrapReceiptText(data.reflection, 32);
    text("'", RECEIPT_WIDTH / 2 - 112, y, { size: 15 });
    reflectionLines.forEach((line) => {
      text(line, RECEIPT_WIDTH / 2, y, {
        anchor: "middle",
        size: 14
      });
      y += 20;
    });
    text("'", RECEIPT_WIDTH / 2 + 112, y - 20, { size: 15 });
  } else {
    y += 20;
  }
  y = Math.max(y + 52, 950);
  rule(y, true);
  y += 35;
  text("Thank you for contributing", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 13
  });
  y += 20;
  text("to the growing archive.", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 13
  });
  y += 42;
  text("<before-i-imagine>", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 13,
    weight: 600
  });
  y += 34;
  text("https://before-i-imagine.onrender.com/", RECEIPT_WIDTH / 2, y, {
    anchor: "middle",
    size: 10
  });
  y += 42;

  return wrapSvg(parts, y);
}

function wrapSvg(parts, height) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" width="${RECEIPT_WIDTH}" ` +
    `height="${Math.ceil(height)}" viewBox="0 0 ${RECEIPT_WIDTH} ${Math.ceil(height)}">` +
    `<rect width="100%" height="100%" fill="#fff"/>${parts.join("")}</svg>`
  );
}

function svgText(value, x, y, options = {}) {
  const size = options.size || 15;
  const weight = options.weight || 400;
  const anchor = options.anchor || "start";
  const font = weight >= 600 ? receiptFonts.semibold : receiptFonts.regular;
  const stringValue = String(value);
  const canUseIbmPlexMono = Array.from(stringValue).every((character) => {
    return character === "\n" || font.charToGlyph(character).index !== 0;
  });
  if (!canUseIbmPlexMono) {
    return (
      `<text x="${x}" y="${y + size}" fill="#000" ` +
      `font-family="PingFang SC, Hiragino Sans GB, sans-serif" ` +
      `font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">` +
      `${escapeXml(stringValue)}</text>`
    );
  }

  const advanceWidth = font.getAdvanceWidth(stringValue, size);
  let pathX = x;
  if (anchor === "middle") pathX -= advanceWidth / 2;
  if (anchor === "end") pathX -= advanceWidth;
  const pathData = font.getPath(stringValue, pathX, y + size, size).toPathData(2);
  return `<path d="${pathData}" fill="#000"/>`;
}

async function prepareAppleImage(source) {
  const input = await loadImageSource(source);
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .grayscale()
    .threshold(190)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = getInkBounds(data, info.width, info.height);
  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 1 }
  })
    .extract(bounds)
    .resize(112, 100, {
      fit: "contain",
      background: "#ffffff",
      withoutEnlargement: false
    })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function getInkBounds(pixels, width, height) {
  const xCounts = new Uint32Array(width);
  const yCounts = new Uint32Array(height);
  let inkCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x] < 128) {
        xCounts[x]++;
        yCounts[y]++;
        inkCount++;
      }
    }
  }
  if (inkCount < 12) return { left: 0, top: 0, width, height };

  const percentile = Math.max(1, Math.floor(inkCount * 0.01));
  const left = findHistogramEdge(xCounts, percentile, false);
  const right = findHistogramEdge(xCounts, percentile, true);
  const top = findHistogramEdge(yCounts, percentile, false);
  const bottom = findHistogramEdge(yCounts, percentile, true);
  const contentW = Math.max(1, right - left + 1);
  const contentH = Math.max(1, bottom - top + 1);
  const padX = Math.max(4, Math.round(contentW * 0.09));
  const padY = Math.max(4, Math.round(contentH * 0.09));
  const cropLeft = Math.max(0, left - padX);
  const cropTop = Math.max(0, top - padY);
  const cropRight = Math.min(width - 1, right + padX);
  const cropBottom = Math.min(height - 1, bottom + padY);
  return {
    left: cropLeft,
    top: cropTop,
    width: cropRight - cropLeft + 1,
    height: cropBottom - cropTop + 1
  };
}

function findHistogramEdge(histogram, target, reverse) {
  let total = 0;
  if (reverse) {
    for (let index = histogram.length - 1; index >= 0; index--) {
      total += histogram[index];
      if (total >= target) return index;
    }
    return histogram.length - 1;
  }
  for (let index = 0; index < histogram.length; index++) {
    total += histogram[index];
    if (total >= target) return index;
  }
  return 0;
}

function normalizeAppleNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function formatAppleNumberRange(apples) {
  const numbers = apples
    .map((apple) => apple.appleNumber)
    .filter((number) => Number.isFinite(number));
  if (!numbers.length) return "#----";
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  return first === last ? `#${first}` : `#${first}-#${last}`;
}

function drawBinaryApple(parts, x, y) {
  const rows = [
    "11",
    "10",
    "00111100",
    "01111110",
    "111001111",
    "111001111",
    "011111110",
    "001111100"
  ];
  rows.forEach((row, index) => {
    parts.push(svgText(row, x, y + index * 7, {
      anchor: "middle",
      size: 5,
      weight: 600
    }));
  });
}

function drawCropMark(parts, x, y, corner) {
  const size = 30;
  if (corner === "top-right") {
    parts.push(
      `<path d="M ${x - size} ${y} H ${x} V ${y + size}" ` +
      `fill="none" stroke="#000" stroke-width="2"/>`
    );
    return;
  }
  parts.push(
    `<path d="M ${x} ${y - size} V ${y} H ${x + size}" ` +
    `fill="none" stroke="#000" stroke-width="2"/>`
  );
}

async function loadImageSource(source) {
  if (typeof source !== "string") {
    throw new Error("Apple image source must be a URL or data URL.");
  }
  if (source.startsWith("data:image/")) {
    const comma = source.indexOf(",");
    if (comma < 0) throw new Error("Invalid image data URL.");
    return Buffer.from(source.slice(comma + 1), "base64");
  }

  const url = new URL(source);
  const allowedHosts = (process.env.PRINTER_IMAGE_HOSTS || ".supabase.co")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  const isAllowed = url.protocol === "https:" && allowedHosts.some((host) => {
    return host.startsWith(".")
      ? url.hostname.endsWith(host)
      : url.hostname === host;
  });
  if (!isAllowed) {
    throw new Error(`Image host is not allowed: ${url.hostname}`);
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    throw new Error(`Could not load apple image (${response.status}).`);
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 8 * 1024 * 1024) {
    throw new Error("Apple image is too large.");
  }
  return Buffer.from(await response.arrayBuffer());
}

async function rasterizeReceipt(svg) {
  const image = sharp(svg, { density: 72 })
    .flatten({ background: "#ffffff" })
    .grayscale();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== RECEIPT_WIDTH) {
    throw new Error(`Unexpected receipt width: ${info.width}px.`);
  }
  const raster = floydSteinbergToRaster(data, info.width, info.height);
  return {
    width: info.width,
    height: info.height,
    bytesPerRow: Math.ceil(info.width / 8),
    data: raster
  };
}

async function saveRasterPreview(receipt, outputPath) {
  const pixels = Buffer.alloc(receipt.width * receipt.height, 255);
  for (let y = 0; y < receipt.height; y++) {
    for (let x = 0; x < receipt.width; x++) {
      const byte = receipt.data[y * receipt.bytesPerRow + (x >> 3)];
      if (byte & (0x80 >> (x & 7))) {
        pixels[y * receipt.width + x] = 0;
      }
    }
  }
  await sharp(pixels, {
    raw: {
      width: receipt.width,
      height: receipt.height,
      channels: 1
    }
  }).png().toFile(outputPath);
}

function floydSteinbergToRaster(grayscale, width, height) {
  const pixels = Float32Array.from(grayscale);
  const bytesPerRow = Math.ceil(width / 8);
  const output = Buffer.alloc(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const oldValue = pixels[index];
      const newValue = oldValue < 176 ? 0 : 255;
      const error = oldValue - newValue;
      pixels[index] = newValue;
      if (newValue === 0) {
        output[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
      distributeDitherError(pixels, width, height, x + 1, y, error * 7 / 16);
      distributeDitherError(pixels, width, height, x - 1, y + 1, error * 3 / 16);
      distributeDitherError(pixels, width, height, x, y + 1, error * 5 / 16);
      distributeDitherError(pixels, width, height, x + 1, y + 1, error / 16);
    }
  }
  return output;
}

function distributeDitherError(pixels, width, height, x, y, error) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const index = y * width + x;
  pixels[index] = Math.max(0, Math.min(255, pixels[index] + error));
}

function sliceRasterRows(raster, bytesPerRow, top, height) {
  return raster.subarray(top * bytesPerRow, (top + height) * bytesPerRow);
}

function wrapReceiptText(value, maxUnits) {
  const paragraphs = String(value).split(/\r?\n/);
  const lines = [];
  paragraphs.forEach((paragraph) => {
    let line = "";
    let units = 0;
    for (const character of paragraph) {
      const characterUnits = character.codePointAt(0) > 0x7f ? 2 : 1;
      if (units + characterUnits > maxUnits && line) {
        lines.push(line);
        line = "";
        units = 0;
      }
      line += character;
      units += characterUnits;
    }
    lines.push(line);
  });
  return lines.length ? lines : [""];
}

function formatSimilarity(value) {
  if (value === null || value === undefined || value === "") {
    return "NO CLOSE MATCH";
  }
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}%` : "NO CLOSE MATCH";
}

function cleanSingleLine(value) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 80);
}

function cleanMultiline(value) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, 1600);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseOptionalUsbId(value) {
  if (!value) return null;
  const parsed = Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid USB ID: ${value}`);
  return parsed;
}

function formatUsbId(value) {
  return `0x${Number(value).toString(16).padStart(4, "0")}`;
}

function serializeError(error) {
  return {
    message: error && error.message ? error.message : String(error),
    name: error && error.name ? error.name : "Error",
    stack: process.env.PRINTER_DEBUG === "1" && error && error.stack
      ? error.stack
      : undefined
  };
}

module.exports = {
  RECEIPT_PREVIEW_PATH,
  createReportReceipt,
  saveRasterPreview
};
