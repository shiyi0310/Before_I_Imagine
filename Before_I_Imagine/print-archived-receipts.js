"use strict";

// Temporary exhibition utility for printing archived database records.
// This file is intentionally standalone and can be deleted after the exhibition.
// It only reads the public drawings API and never writes to the database.

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");

const DEFAULT_ARCHIVE_API_URL =
  process.env.ARCHIVE_API_URL ||
  "https://before-i-imagine.onrender.com/api/drawings";
const DEFAULT_MAX_GAP_MINUTES = Number(
  process.env.ARCHIVE_SESSION_MAX_GAP_MINUTES || 30
);
const RECEIPT_WIDTH = 384;
const PROMPT_NAMES = [
  "DEFAULT APPLE",
  "TOUCH MEMORY",
  "TASTE MEMORY",
  "IMPERFECT MEMORY"
];

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nArchived receipt task failed: ${error.message}`);
    if (process.env.PRINTER_DEBUG === "1" && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  });
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "help") {
    printHelp();
    return;
  }

  const apiUrl = options["api-url"] || DEFAULT_ARCHIVE_API_URL;
  const maxGapMinutes = parsePositiveNumber(
    options["max-gap-minutes"],
    DEFAULT_MAX_GAP_MINUTES,
    "--max-gap-minutes"
  );
  const records = await fetchArchivedRecords(apiUrl);
  const catalog = buildArchiveCatalog(records, maxGapMinutes);

  if (command === "list") {
    listCatalog(catalog, options);
    return;
  }

  if (command !== "inspect" && command !== "print") {
    throw new Error(`Unknown command: ${command}. Run with --help for usage.`);
  }

  const target = resolveTarget(catalog, options);
  printTargetDetails(target);

  if (command === "inspect") return;

  await confirmPhysicalPrint(target, options.yes === true);
  const receipt = target.type === "session"
    ? await createFourDrawingReceipt(target)
    : await createSingleDrawingReceipt(target.record);
  const printer = await sendRasterToPrinter(receipt);
  console.log("\nPrinted one archived receipt successfully.");
  console.log(printer);
}

function parseArguments(argv) {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    return { command: "help", options: {} };
  }

  const command = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === "yes") {
      options.yes = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`);
    }
    options[key] = value;
    index++;
  }
  return { command, options };
}

function printHelp() {
  console.log(`
Temporary archived receipt printer

Read-only commands:
  node print-archived-receipts.js list
  node print-archived-receipts.js inspect --id <drawing-id-or-archive-number>
  node print-archived-receipts.js inspect --session <start-end>

Print exactly one receipt:
  node print-archived-receipts.js print --id <drawing-id-or-archive-number>
  node print-archived-receipts.js print --session <start-end>

Options:
  --type <value>         With list: all, sessions, or singles (default: all)
  --max-gap-minutes <n>  Maximum gap between adjacent prompts in a candidate
                         0 -> 1 -> 2 -> 3 session (default: ${DEFAULT_MAX_GAP_MINUTES})
  --api-url <url>        Override the read-only drawings API URL
  --yes                  Skip the interactive PRINT confirmation

Safety:
  - Starting the script without an explicit print command never prints.
  - A print command accepts only one drawing or one four-drawing session.
  - The script performs GET requests only and never writes to the database.
`);
}

async function fetchArchivedRecords(apiUrl) {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    throw new Error(`Archive API returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Archive API did not return a drawing array.");
  }

  return payload
    .map(normalizeArchivedRecord)
    .filter(Boolean)
    .sort((left, right) => left.sortTime - right.sortTime)
    .map((record, index) => ({ ...record, archiveNumber: index + 1 }));
}

function normalizeArchivedRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const dbId = raw.dbId || raw.db_id || raw.id;
  if (dbId === null || dbId === undefined || dbId === "") return null;
  const createdAt = raw.dbCreatedAt || raw.created_at || raw.createdAt || null;
  const date = createdAt ? new Date(createdAt) : null;
  const promptIndex = Number(raw.promptIndex);
  return {
    raw,
    dbId: String(dbId),
    sourceId: raw.id === undefined ? null : String(raw.id),
    dbCreatedAt: createdAt,
    sortTime: date && Number.isFinite(date.getTime()) ? date.getTime() : 0,
    promptIndex: Number.isInteger(promptIndex) ? promptIndex : null,
    promptName: Number.isInteger(promptIndex) && PROMPT_NAMES[promptIndex]
      ? PROMPT_NAMES[promptIndex]
      : cleanSingleLine(raw.promptEN || raw.prompt || "UNKNOWN PROMPT"),
    imageUrl: raw.image_url || raw.thumb_url || raw.imageUrl || raw.thumbUrl || null,
    reflection: typeof raw.reflection_text === "string"
      ? raw.reflection_text.trim()
      : ""
  };
}

function buildArchiveCatalog(records, maxGapMinutes) {
  const entries = [];
  const sessions = [];
  const singles = [];
  const maxGapMs = maxGapMinutes * 60 * 1000;

  for (let index = 0; index < records.length;) {
    const group = records.slice(index, index + 4);
    if (isCandidateSession(group, maxGapMs)) {
      const session = {
        type: "session",
        key: `${group[0].archiveNumber}-${group[3].archiveNumber}`,
        records: group,
        spanMinutes: (group[3].sortTime - group[0].sortTime) / 60000
      };
      sessions.push(session);
      entries.push(session);
      index += 4;
      continue;
    }

    const single = { type: "single", record: records[index] };
    singles.push(single);
    entries.push(single);
    index++;
  }

  return { records, entries, sessions, singles, maxGapMinutes };
}

function isCandidateSession(group, maxGapMs) {
  if (group.length !== 4) return false;
  for (let index = 0; index < group.length; index++) {
    if (group[index].promptIndex !== index) return false;
    if (index > 0) {
      const gap = group[index].sortTime - group[index - 1].sortTime;
      if (gap < 0 || gap > maxGapMs) return false;
    }
  }
  return true;
}

function listCatalog(catalog, options) {
  const filter = options.type || "all";
  if (!["all", "sessions", "singles"].includes(filter)) {
    throw new Error("--type must be all, sessions, or singles.");
  }

  console.log(`Read ${catalog.records.length} archived drawings.`);
  console.log(
    `Grouped ${catalog.sessions.length} candidate sessions and ` +
    `${catalog.singles.length} single drawings ` +
    `(maximum adjacent prompt gap: ${catalog.maxGapMinutes} minutes).`
  );

  if (filter === "all" || filter === "sessions") {
    console.log("\nCandidate four-drawing sessions (inferred, not stored in DB):");
    console.table(catalog.sessions.map((session) => ({
      session: session.key,
      date: formatIsoDateTime(session.records[0].dbCreatedAt),
      minutes: Number(session.spanMinutes.toFixed(1)),
      reflections: session.records.filter((record) => record.reflection).length,
      images: session.records.filter((record) => record.imageUrl).length
    })));
  }

  if (filter === "all" || filter === "singles") {
    console.log("\nSingle archived drawings:");
    console.table(catalog.singles.map(({ record }) => ({
      archive: `#${record.archiveNumber}`,
      id: record.dbId,
      prompt: record.promptIndex,
      date: formatIsoDateTime(record.dbCreatedAt),
      image: Boolean(record.imageUrl),
      reflection: Boolean(record.reflection)
    })));
  }
}

function resolveTarget(catalog, options) {
  const hasId = typeof options.id === "string";
  const hasSession = typeof options.session === "string";
  if (hasId === hasSession) {
    throw new Error("Specify exactly one of --id or --session.");
  }

  if (hasSession) {
    const normalized = options.session.replace(/^#/, "");
    const session = catalog.sessions.find((candidate) => candidate.key === normalized);
    if (!session) {
      throw new Error(
        `Candidate session ${options.session} was not found with the current grouping rule.`
      );
    }
    return session;
  }

  const record = resolveRecord(catalog.records, options.id);
  const candidate = catalog.sessions.find((session) => {
    return session.records.some((item) => item.dbId === record.dbId);
  });
  return { type: "single", record, candidateSession: candidate || null };
}

function resolveRecord(records, input) {
  const value = String(input).trim().replace(/^#/, "");
  if (/^\d+$/.test(value)) {
    const archiveNumber = Number(value);
    const byNumber = records.find((record) => record.archiveNumber === archiveNumber);
    if (byNumber) return byNumber;
  }

  const exact = records.find((record) => {
    return record.dbId === value || record.sourceId === value;
  });
  if (exact) return exact;

  if (value.length >= 4) {
    const matches = records.filter((record) => record.dbId.startsWith(value));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new Error(`Drawing ID prefix ${input} matches more than one record.`);
    }
  }
  throw new Error(`Archived drawing ${input} was not found.`);
}

function printTargetDetails(target) {
  if (target.type === "session") {
    console.log(`\nCandidate four-drawing session ${target.key}`);
    console.log(
      "This grouping is inferred from adjacent timestamps and prompt order; " +
      "the database does not store a session ID."
    );
    console.table(target.records.map(recordSummary));
    return;
  }

  console.log(`\nSingle archived drawing #${target.record.archiveNumber}`);
  console.table([recordSummary(target.record)]);
  if (target.candidateSession) {
    console.log(
      `Note: this drawing is also part of candidate session ${target.candidateSession.key}. ` +
      "Using --id will intentionally print it as a single record."
    );
  }
}

function recordSummary(record) {
  return {
    archive: `#${record.archiveNumber}`,
    id: record.dbId,
    prompt: `${record.promptIndex ?? "?"} ${record.promptName}`,
    created_at: record.dbCreatedAt,
    image: Boolean(record.imageUrl),
    reflection: record.reflection || "(none)"
  };
}

async function confirmPhysicalPrint(target, skipConfirmation) {
  if (skipConfirmation) return;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Interactive confirmation requires a terminal. Add --yes to print explicitly.");
  }

  const label = target.type === "session"
    ? `candidate session ${target.key}`
    : `single archive #${target.record.archiveNumber}`;
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(
      `\nReady to physically print ${label}. Type PRINT to continue: `
    );
    if (answer.trim() !== "PRINT") {
      throw new Error("Print cancelled; confirmation did not match PRINT.");
    }
  } finally {
    prompt.close();
  }
}

async function createFourDrawingReceipt(session) {
  const { createReportReceipt } = require("./printer-server");
  const latest = session.records[session.records.length - 1];
  const printImages = await Promise.all(session.records.map((record) => {
    return record.imageUrl
      ? prepareArchivedImage(record.imageUrl, 420, 420)
      : null;
  }));
  const reflection = session.records
    .filter((record) => record.reflection)
    .map((record) => {
      const number = String(record.promptIndex + 1).padStart(2, "0");
      return `${number} ${record.promptName}\n${record.reflection}`;
    })
    .join("\n\n");

  return createReportReceipt({
    reportId: shortReportId(latest.dbId),
    date: formatReceiptDate(latest.dbCreatedAt),
    reflection,
    apples: session.records.map((record, index) => ({
      prompt: record.promptName,
      similarity: null,
      appleNumber: record.archiveNumber,
      imageUrl: printImages[index]
    }))
  });
}

async function createSingleDrawingReceipt(record) {
  const imageDataUrl = record.imageUrl
    ? await prepareArchivedImage(record.imageUrl, 260, 230)
    : null;
  const svg = buildSingleReceiptSvg({
    reportId: shortReportId(record.dbId),
    date: formatReceiptDate(record.dbCreatedAt),
    archiveNumber: record.archiveNumber,
    prompt: record.promptName,
    reflection: cleanMultiline(record.reflection),
    imageDataUrl
  });
  return rasterizeReceipt(svg);
}

function buildSingleReceiptSvg(data) {
  const margin = 28;
  const parts = [];
  const text = (value, x, y, options = {}) => {
    parts.push(svgText(value, x, y, options));
  };
  const rule = (y) => {
    parts.push(
      `<line x1="${margin}" y1="${y}" x2="${RECEIPT_WIDTH - margin}" ` +
      `y2="${y}" stroke="#000" stroke-width="1" stroke-dasharray="4 4"/>`
    );
  };

  text("BEFORE I IMAGINE", RECEIPT_WIDTH / 2, 47, {
    anchor: "middle", size: 21, weight: 600
  });
  text("APPLE REPORT", RECEIPT_WIDTH / 2, 93, {
    anchor: "middle", size: 21, weight: 600
  });
  drawBinaryApple(parts, 350, 80);
  text("A record of one archived drawing.", RECEIPT_WIDTH / 2, 190, {
    anchor: "middle", size: 13
  });
  rule(221);

  text("REPORT ID:", margin, 235, { size: 14 });
  text(`#${data.reportId}`, RECEIPT_WIDTH - margin, 230, {
    anchor: "end", size: 24
  });
  text("DATE:", margin, 273, { size: 14 });
  text(data.date, RECEIPT_WIDTH - margin, 273, {
    anchor: "end", size: 15
  });
  rule(311);
  text(`ARCHIVE #${data.archiveNumber}`, margin, 326, {
    size: 17, weight: 600
  });
  drawCropMark(parts, RECEIPT_WIDTH - 36, 338, "top-right");

  if (data.imageDataUrl) {
    parts.push(
      `<image href="${data.imageDataUrl}" x="62" y="376" width="260" height="230" ` +
      `preserveAspectRatio="xMidYMid meet"/>`
    );
  } else {
    text("[IMAGE UNAVAILABLE]", RECEIPT_WIDTH / 2, 474, {
      anchor: "middle", size: 12
    });
  }
  drawCropMark(parts, margin, 624, "bottom-left");
  rule(654);
  text(`PROMPT: ${cleanSingleLine(data.prompt)}`, margin, 674, {
    size: 14, weight: 600
  });
  rule(712);

  let y = 733;
  text("REFLECTION", margin, y, { size: 15, weight: 600 });
  y += 54;
  if (data.reflection) {
    const lines = wrapReceiptText(data.reflection, 32);
    text("'", RECEIPT_WIDTH / 2 - 112, y, { size: 15 });
    lines.forEach((line) => {
      text(line, RECEIPT_WIDTH / 2, y, {
        anchor: "middle", size: 14
      });
      y += 20;
    });
    text("'", RECEIPT_WIDTH / 2 + 112, y - 20, { size: 15 });
  } else {
    text("No reflection recorded.", RECEIPT_WIDTH / 2, y, {
      anchor: "middle", size: 13
    });
    y += 20;
  }

  y = Math.max(y + 52, 930);
  rule(y);
  y += 35;
  text("Thank you for contributing", RECEIPT_WIDTH / 2, y, {
    anchor: "middle", size: 13
  });
  y += 20;
  text("to the growing archive.", RECEIPT_WIDTH / 2, y, {
    anchor: "middle", size: 13
  });
  y += 42;
  text("<before-i-imagine>", RECEIPT_WIDTH / 2, y, {
    anchor: "middle", size: 13, weight: 600
  });
  y += 34;
  text("https://before-i-imagine.onrender.com/", RECEIPT_WIDTH / 2, y, {
    anchor: "middle", size: 10
  });
  y += 42;
  return wrapSvg(parts, y);
}

let receiptFonts = null;

function getReceiptFonts() {
  if (receiptFonts) return receiptFonts;
  const opentype = require("opentype.js");
  const fontDir = path.join(
    path.dirname(require.resolve("@ibm/plex-mono/package.json")),
    "fonts",
    "complete",
    "woff"
  );
  const load = (filename) => {
    const data = fs.readFileSync(path.join(fontDir, filename));
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return opentype.parse(buffer);
  };
  receiptFonts = {
    regular: load("IBMPlexMono-Regular.woff"),
    semibold: load("IBMPlexMono-SemiBold.woff")
  };
  return receiptFonts;
}

function svgText(value, x, y, options = {}) {
  const size = options.size || 15;
  const weight = options.weight || 400;
  const anchor = options.anchor || "start";
  const fonts = getReceiptFonts();
  const font = weight >= 600 ? fonts.semibold : fonts.regular;
  const stringValue = String(value);
  const canUseFont = Array.from(stringValue).every((character) => {
    return character === "\n" || font.charToGlyph(character).index !== 0;
  });
  if (!canUseFont) {
    return svgFallbackText(stringValue, x, y, { size, weight, anchor });
  }
  const advanceWidth = font.getAdvanceWidth(stringValue, size);
  let pathX = x;
  if (anchor === "middle") pathX -= advanceWidth / 2;
  if (anchor === "end") pathX -= advanceWidth;
  const pathData = font.getPath(stringValue, pathX, y + size, size).toPathData(2);
  // A few glyph outlines in the packaged WOFF contain invalid coordinates when
  // parsed by opentype.js. Fall back to native SVG text instead of emitting a
  // path that stops rendering halfway through the line.
  if (/NaN|Infinity/.test(pathData)) {
    return svgFallbackText(stringValue, x, y, { size, weight, anchor });
  }
  return `<path d="${pathData}" fill="#000" stroke="#000" stroke-width="0.18"/>`;
}

function svgFallbackText(value, x, y, options) {
  return (
    `<text x="${x}" y="${y + options.size}" fill="#000" ` +
    `font-family="IBM Plex Mono, Courier New, Menlo, PingFang SC, monospace" ` +
    `font-size="${options.size}" font-weight="${options.weight}" ` +
    `text-anchor="${options.anchor}">${escapeXml(value)}</text>`
  );
}

function wrapSvg(parts, height) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" width="${RECEIPT_WIDTH}" ` +
    `height="${Math.ceil(height)}" viewBox="0 0 ${RECEIPT_WIDTH} ${Math.ceil(height)}">` +
    `<rect width="100%" height="100%" fill="#fff"/>${parts.join("")}</svg>`
  );
}

async function prepareArchivedImage(source, targetWidth, targetHeight) {
  const sharp = require("sharp");
  const input = await loadImageSource(source);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const inkMask = buildThermalInkMask(data, info.width, info.height, info.channels);
  const bounds = getInkBounds(inkMask, info.width, info.height);
  const png = await sharp(inkMask, {
    raw: { width: info.width, height: info.height, channels: 1 }
  })
    .extract(bounds)
    .resize(targetWidth, targetHeight, {
      fit: "contain",
      background: "#ffffff",
      withoutEnlargement: false
    })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function buildThermalInkMask(data, width, height, channels) {
  const pixelCount = width * height;
  const visible = new Uint8Array(pixelCount);
  const neutralInk = new Uint8Array(pixelCount);
  const colourBoundary = new Uint8Array(pixelCount);

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const sourceIndex = pixel * channels;
    const red = data[sourceIndex];
    const green = data[sourceIndex + 1];
    const blue = data[sourceIndex + 2];
    const alpha = data[sourceIndex + 3];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const chroma = maximum - minimum;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const distanceFromWhite = 255 - minimum;
    if (alpha <= 16 || distanceFromWhite <= 20) continue;

    visible[pixel] = 1;
    // Neutral dark pixels are the original black/grey pen strokes. Very dark
    // coloured pixels are also kept because they visually behave as outlines.
    if ((chroma <= 48 && luminance < 232) || maximum < 58) {
      neutralInk[pixel] = 1;
    }
  }

  // A saturated fill is made white, but its outside edge is retained. Thin
  // coloured strokes naturally consist almost entirely of boundary pixels and
  // therefore remain visible in the thermal output.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if (!visible[pixel] || neutralInk[pixel]) continue;
      let edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      for (let offsetY = -1; !edge && offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighbour = (y + offsetY) * width + (x + offsetX);
          if (!visible[neighbour]) {
            edge = true;
            break;
          }
        }
      }
      if (edge) colourBoundary[pixel] = 1;
    }
  }

  const outlineRadius = Math.max(1, Math.min(4, Math.round(Math.min(width, height) / 180)));
  const inkMask = Buffer.alloc(pixelCount, 255);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    if (neutralInk[pixel]) inkMask[pixel] = 0;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if (!colourBoundary[pixel]) continue;
      for (let offsetY = -outlineRadius; offsetY <= outlineRadius; offsetY++) {
        const targetY = y + offsetY;
        if (targetY < 0 || targetY >= height) continue;
        for (let offsetX = -outlineRadius; offsetX <= outlineRadius; offsetX++) {
          const targetX = x + offsetX;
          if (targetX < 0 || targetX >= width) continue;
          const target = targetY * width + targetX;
          if (visible[target]) inkMask[target] = 0;
        }
      }
    }
  }
  return inkMask;
}

async function loadImageSource(source) {
  if (typeof source !== "string") {
    throw new Error("Archived image source must be a URL or data URL.");
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
  const allowed = url.protocol === "https:" && allowedHosts.some((host) => {
    return host.startsWith(".")
      ? url.hostname.endsWith(host)
      : url.hostname === host;
  });
  if (!allowed) throw new Error(`Image host is not allowed: ${url.hostname}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Could not load archived image (${response.status}).`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 8 * 1024 * 1024) {
    throw new Error("Archived image is too large.");
  }
  return Buffer.from(await response.arrayBuffer());
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
  const contentWidth = Math.max(1, right - left + 1);
  const contentHeight = Math.max(1, bottom - top + 1);
  const padX = Math.max(4, Math.round(contentWidth * 0.09));
  const padY = Math.max(4, Math.round(contentHeight * 0.09));
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

async function rasterizeReceipt(svg) {
  const sharp = require("sharp");
  const image = sharp(svg, { density: 72 })
    .flatten({ background: "#ffffff" })
    .grayscale();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== RECEIPT_WIDTH) {
    throw new Error(`Unexpected receipt width: ${info.width}px.`);
  }
  return {
    width: info.width,
    height: info.height,
    bytesPerRow: Math.ceil(info.width / 8),
    data: floydSteinbergToRaster(data, info.width, info.height)
  };
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

async function sendRasterToPrinter(receipt) {
  const { usb } = require("usb");
  const devices = await usb.getDevices();
  const expectedVendorId = parseOptionalUsbId(process.env.PRINTER_VENDOR_ID);
  const expectedProductId = parseOptionalUsbId(process.env.PRINTER_PRODUCT_ID);
  let device = devices.find((candidate) => {
    if (expectedVendorId !== null && candidate.vendorId !== expectedVendorId) return false;
    if (expectedProductId !== null && candidate.productId !== expectedProductId) return false;
    return expectedVendorId !== null || expectedProductId !== null;
  });
  if (!device) {
    device = devices.find((candidate) => findBulkOutEndpoint(candidate) !== null);
  }
  if (!device) throw new Error("USB ESC/POS printer was not found.");

  const target = findBulkOutEndpoint(device);
  if (!target) throw new Error("Unable to find a bulk OUT endpoint on the printer.");
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
      const raster = receipt.data.subarray(
        top * receipt.bytesPerRow,
        (top + height) * receipt.bytesPerRow
      );
      const command = Buffer.concat([
        Buffer.from([
          0x1d, 0x76, 0x30, 0x00,
          receipt.bytesPerRow & 0xff,
          (receipt.bytesPerRow >> 8) & 0xff,
          height & 0xff,
          (height >> 8) & 0xff
        ]),
        raster
      ]);
      await transferOutChecked(device, target.endpointNumber, command);
    }
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
  } finally {
    if (claimed) {
      try {
        await device.releaseInterface(target.interfaceNumber);
      } catch (error) {
        console.warn(`Could not release printer interface: ${error.message}`);
      }
    }
    if (device.opened) {
      try {
        await device.close();
      } catch (error) {
        console.warn(`Could not close printer: ${error.message}`);
      }
    }
  }
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
            endpointNumber: endpoint.endpointNumber
          };
        }
      }
    }
  }
  return null;
}

async function transferOutChecked(device, endpointNumber, data) {
  const result = await device.transferOut(endpointNumber, data);
  if (!result || result.status !== "ok") {
    throw new Error(`USB transfer failed with status: ${result && result.status}`);
  }
}

function drawBinaryApple(parts, x, y) {
  const rows = [
    "      11    ", "     10  00 ", "  000  00   ",
    " 00      00 ", "00        00", "00        00",
    " 00      00 ", "  00    00  ", "   000000   "
  ];
  rows.forEach((row, index) => {
    parts.push(svgText(row, x, y + index * 7, {
      anchor: "middle", size: 6.5, weight: 600
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

function wrapReceiptText(value, maxUnits) {
  const lines = [];
  String(value).split(/\r?\n/).forEach((paragraph) => {
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

function formatReceiptDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "PENDING";
  const day = String(date.getDate()).padStart(2, "0");
  const month = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ][date.getMonth()];
  return `${day} ${month} ${date.getFullYear()}`;
}

function formatIsoDateTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "unknown";
}

function shortReportId(value) {
  return String(value || "PENDING").slice(-8).toUpperCase();
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

function parsePositiveNumber(value, fallback, label) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return number;
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

module.exports = {
  buildSingleReceiptSvg,
  buildArchiveCatalog,
  buildThermalInkMask,
  createFourDrawingReceipt,
  createSingleDrawingReceipt,
  isCandidateSession,
  normalizeArchivedRecord
};
