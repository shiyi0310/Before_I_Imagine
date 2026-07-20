// Apple Report UI.
// Similarity calculation and print output are intentionally kept separate.

let reportPrintState = "idle";
let reportPrintResetTimer = null;

function getAppleReportLayout() {
  let mobile = isMobileScreen();
  let sidebarW = mobile ? 0 : getDrawSidebarWidth();
  let contentX = sidebarW;
  let contentW = width - sidebarW;
  let pad = mobile ? 16 : constrain(contentW * 0.045, 34, 64);
  let innerX = contentX + pad;
  let innerW = contentW - pad * 2;
  let headerY = mobile ? 76 : 90;
  let cardsY = mobile ? 164 : 210;
  let columns = mobile ? 2 : 4;
  let gap = mobile ? 8 : 12;
  let cardW = (innerW - gap * (columns - 1)) / columns;
  let cardH = mobile
    ? min(218, max(188, (height - cardsY - 132) / 2))
    : min(510, max(378, height - cardsY - 150));
  let cards = [];

  for (let i = 0; i < 4; i++) {
    let col = i % columns;
    let row = floor(i / columns);
    cards.push({
      x: innerX + col * (cardW + gap),
      y: cardsY + row * (cardH + gap),
      w: cardW,
      h: cardH
    });
  }

  let cardsBottom = cards.reduce((bottom, card) => max(bottom, card.y + card.h), cardsY);
  let summaryY = cardsBottom + (mobile ? 10 : 12);
  let summaryH = mobile ? 104 : max(100, height - summaryY - 18);
  let summaryW = mobile ? innerW : innerW * 0.72;
  let printGap = mobile ? 8 : 12;
  let printButton = mobile ? {
    x: innerX,
    y: summaryY + summaryH + 8,
    w: innerW,
    h: 40
  } : {
    x: innerX + summaryW + printGap,
    y: summaryY,
    w: innerW - summaryW - printGap,
    h: summaryH
  };

  return {
    mobile,
    contentX,
    contentW,
    innerX,
    innerW,
    headerY,
    cards,
    summary: { x: innerX, y: summaryY, w: summaryW, h: summaryH },
    printButton
  };
}

function drawAppleReportView() {
  let layout = getAppleReportLayout();
  ensureAppleReportSimilarity();
  let personalDrawings = prompts.map((_, index) => {
    return getReportPersonalDrawing(index) || getLatestReportDrawing(index);
  });

  noStroke();
  fill(inkCol);
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  textSize(layout.mobile ? 18 : 24);
  text("APPLE REPORT", layout.innerX, layout.headerY);

  textSize(layout.mobile ? 9 : 12);
  fill(72, 67, 61);
  text("Personal Apple  ↔  Collective Apple", layout.innerX, layout.headerY + (layout.mobile ? 25 : 34));

  stroke(150, 142, 132, 95);
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  let dividerY = layout.headerY + (layout.mobile ? 43 : 55);
  line(layout.innerX, dividerY, layout.innerX + min(layout.innerW * 0.42, 420), dividerY);
  drawingContext.setLineDash([]);

  if (!layout.mobile) {
    noStroke();
    fill(72, 67, 61);
    textSize(9);
    text(
      "A comparison between your remembered apples\nand the collective trace from all participants.",
      layout.innerX,
      layout.headerY + 70
    );
    drawAppleReportStamp(layout, personalDrawings);
  }

  for (let i = 0; i < layout.cards.length; i++) {
    drawAppleReportCard(layout.cards[i], i, personalDrawings[i]);
  }

  drawAppleReportSummary(layout.summary, personalDrawings);
  drawAppleReportPrintButton(layout.printButton);
}

function drawAppleReportStamp(layout, personalDrawings) {
  let latest = personalDrawings.filter(Boolean).sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  })[0];
  let date = latest && latest.createdAt ? new Date(latest.createdAt) : new Date();
  let stampW = 124;
  let stampH = 76;
  let x = layout.innerX + layout.innerW - stampW;
  let y = layout.headerY + 4;

  noFill();
  stroke(150, 142, 132, 105);
  strokeWeight(1);
  drawingContext.setLineDash([2, 2]);
  rect(x, y, stampW, stampH, 5);
  drawingContext.setLineDash([]);

  noStroke();
  fill(inkCol);
  textAlign(LEFT, TOP);
  textSize(8);
  text("DATE", x + 14, y + 11);
  fill(92, 85, 77);
  text(formatReportDate(date), x + 14, y + 25);
  fill(inkCol);
  text("ID", x + 14, y + 44);
  fill(92, 85, 77);
  let id = latest ? String(latest.dbId || latest.id || "PENDING").slice(-8).toUpperCase() : "PENDING";
  text(`#${id}`, x + 14, y + 58);
}

function drawAppleReportCard(card, promptNumber, personalDrawing) {
  let mobile = isMobileScreen();
  let prompt = prompts[promptNumber];
  let representative = getReportRepresentativeDrawing(promptNumber);
  let score = getReportSimilarityScore(promptNumber);
  let hasCloseMatch = hasCloseReportMatch(promptNumber);
  let pad = mobile ? 9 : 14;
  let imageH = mobile ? 56 : constrain(card.h * 0.25, 82, 118);
  let title = ["DEFAULT APPLE", "TOUCH MEMORY", "TASTE MEMORY", "IMPERFECT MEMORY"][promptNumber];

  noStroke();
  fill(251, 249, 244, 185);
  rect(card.x, card.y, card.w, card.h, 6);
  noFill();
  stroke(190, 182, 171, 105);
  strokeWeight(1);
  rect(card.x + 0.5, card.y + 0.5, card.w - 1, card.h - 1, 6);

  noStroke();
  fill(inkCol);
  textAlign(LEFT, TOP);
  textSize(mobile ? 7.5 : 9);
  text(`0${promptNumber + 1}`, card.x + pad, card.y + pad);
  textSize(mobile ? 8 : 10);
  text(title, card.x + pad, card.y + pad + (mobile ? 13 : 17), card.w - pad * 2);
  fill(92, 85, 77);
  textSize(mobile ? 6 : 7.5);
  text(prompt.shortTitle + ".", card.x + pad, card.y + pad + (mobile ? 27 : 34), card.w - pad * 2);

  let firstLabelY = card.y + (mobile ? 54 : 73);
  drawAppleReportImageSlot(
    personalDrawing,
    "Your Apple",
    card.x + pad,
    firstLabelY,
    card.w - pad * 2,
    imageH
  );

  let similarityY = firstLabelY + imageH + (mobile ? 18 : 25);
  stroke(190, 182, 171, 85);
  line(card.x + pad, similarityY - 6, card.x + card.w - pad, similarityY - 6);
  noStroke();
  fill(92, 85, 77);
  textAlign(CENTER, TOP);
  textSize(mobile ? 6 : 7);
  text("Similarity", card.x + card.w / 2, similarityY);
  fill(inkCol);
  textSize(hasCloseMatch ? (mobile ? 15 : 21) : (mobile ? 7 : 9));
  let scoreText = Number.isFinite(score)
    ? (hasCloseMatch ? `${round(score)}%` : "NO CLOSE MATCH")
    : "--%";
  text(scoreText, card.x + card.w / 2, similarityY + (mobile ? 9 : 12));

  let collectiveY = similarityY + (mobile ? 32 : 44);
  stroke(190, 182, 171, 85);
  line(card.x + pad, collectiveY - 6, card.x + card.w - pad, collectiveY - 6);
  drawAppleReportImageSlot(
    hasCloseMatch ? representative : null,
    "Collective Apple",
    card.x + pad,
    collectiveY,
    card.w - pad * 2,
    imageH,
    hasCloseMatch ? "image pending" : "no close archive match"
  );
}

function drawAppleReportImageSlot(drawing, label, x, y, w, h, emptyLabel = "image pending") {
  let mobile = isMobileScreen();
  noStroke();
  fill(inkCol);
  textAlign(CENTER, TOP);
  textSize(mobile ? 6 : 7);
  text(label, x + w / 2, y);

  let boxY = y + (mobile ? 9 : 12);
  let boxH = max(28, h - (mobile ? 9 : 12));
  noFill();
  stroke(198, 190, 179, 105);
  rect(x, boxY, w, boxH, 5);

  if (drawing) {
    push();
    translate(x + 5, boxY + 5);
    drawStaticMini(drawing, w - 10, boxH - 10);
    pop();
  } else {
    noStroke();
    fill(132, 124, 115, 120);
    textAlign(CENTER, CENTER);
    textSize(mobile ? 6 : 7.5);
    text(emptyLabel, x + w / 2, boxY + boxH / 2);
  }
}

function drawAppleReportSummary(summary, personalDrawings) {
  let mobile = isMobileScreen();
  noStroke();
  fill(251, 249, 244, 175);
  rect(summary.x, summary.y, summary.w, summary.h, 6);
  noFill();
  stroke(190, 182, 171, 95);
  rect(summary.x + 0.5, summary.y + 0.5, summary.w - 1, summary.h - 1, 6);

  let splitX = summary.x + summary.w * (mobile ? 0.52 : 0.48);
  line(splitX, summary.y + 12, splitX, summary.y + summary.h - 12);
  noStroke();
  fill(inkCol);
  textAlign(LEFT, TOP);
  textSize(mobile ? 7 : 8.5);
  text("APPLE REPORT", summary.x + 14, summary.y + 12);
  text("REFLECTION", splitX + 14, summary.y + 12);

  let names = ["DEFAULT APPLE", "TOUCH MEMORY", "TASTE MEMORY", "IMPERFECT MEMORY"];
  textSize(mobile ? 5.5 : 7.5);
  for (let i = 0; i < names.length; i++) {
    let rowY = summary.y + 30 + i * (mobile ? 13 : 14);
    text(names[i], summary.x + 14, rowY);
    let score = getReportSimilarityScore(i);
    let summaryScore = Number.isFinite(score)
      ? (hasCloseReportMatch(i) ? `${round(score)}%` : "NO MATCH")
      : "--%";
    text(summaryScore, splitX - 52, rowY);
  }

  let reflection = "";
  for (let drawing of personalDrawings) {
    if (drawing && drawing.reflection_text) {
      reflection = drawing.reflection_text;
      break;
    }
  }
  fill(70, 66, 61);
  textSize(mobile ? 5.5 : 7.5);
  text(
    reflection ? `"${reflection}"` : "Reflection will appear here after the drawing flow.",
    splitX + 14,
    summary.y + 34,
    summary.w - (splitX - summary.x) - 28,
    summary.h - 42
  );
}

function drawAppleReportPrintButton(button) {
  let mobile = isMobileScreen();
  noStroke();
  fill(reportPrintState === "failed" ? 110 : 28, 27, 25);
  let innerH = mobile ? button.h : min(44, button.h - 24);
  let y = mobile ? button.y : button.y + (button.h - innerH) / 2;
  rect(button.x, y, button.w, innerH, 5);
  fill(251, 250, 246);
  textAlign(CENTER, CENTER);
  textSize(mobile ? 7.5 : 9);
  let label = {
    idle: "PRINT RECEIPT",
    printing: "PRINTING...",
    printed: "PRINTED",
    failed: "PRINT FAILED"
  }[reportPrintState] || "PRINT RECEIPT";
  text(label, button.x + button.w / 2, y + innerH / 2);
}

function getLatestReportDrawing(promptNumber) {
  for (let i = archive.length - 1; i >= 0; i--) {
    if (getDrawingPromptIndex(archive[i]) === promptNumber) return archive[i];
  }
  return null;
}

function getReportCollectiveDrawing(promptNumber, personalDrawing) {
  return getReportRepresentativeDrawing(promptNumber);
}

function formatReportDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "PENDING";
  let day = String(date.getDate()).padStart(2, "0");
  let month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][date.getMonth()];
  return `${day} ${month} ${date.getFullYear()}`;
}

function handleAppleReportClick(x, y) {
  if (modalOpen || backgroundViewMode !== "report") return false;
  let layout = getAppleReportLayout();
  if (pointInsideRect(x, y, layout.printButton)) {
    if (reportPrintState !== "printing") {
      printCurrentAppleReport();
    }
    return true;
  }
  return false;
}

async function printCurrentAppleReport() {
  if (reportPrintState === "printing") return;
  clearTimeout(reportPrintResetTimer);
  reportPrintState = "printing";
  requestRender("report-printing");

  try {
    let payload = buildAppleReportPrintPayload();
    let response = await fetch("http://localhost:3001/print-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let result = await response.json().catch(() => null);
    if (!response.ok || !result || result.ok !== true) {
      let detail = result && result.error && result.error.message
        ? result.error.message
        : `Printer service returned HTTP ${response.status}`;
      throw new Error(detail);
    }
    console.info("[Apple Report] Receipt printed:", result);
    reportPrintState = "printed";
  } catch (error) {
    console.error("[Apple Report] PRINT RECEIPT failed:", error);
    reportPrintState = "failed";
  }

  requestRender("report-print-result");
  reportPrintResetTimer = setTimeout(() => {
    reportPrintState = "idle";
    requestRender("report-print-reset");
  }, 2600);
}

function buildAppleReportPrintPayload() {
  let personalDrawings = prompts.map((_, index) => {
    return getReportPersonalDrawing(index) || getLatestReportDrawing(index);
  });
  let latest = personalDrawings.filter(Boolean).sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  })[0] || null;
  let date = latest && latest.createdAt ? new Date(latest.createdAt) : new Date();
  let reportId = latest
    ? String(latest.dbId || latest.id || "PENDING").slice(-8).toUpperCase()
    : "PENDING";
  let reflectionDrawing = personalDrawings.find((drawing) => {
    return drawing && typeof drawing.reflection_text === "string" &&
      drawing.reflection_text.trim();
  });
  let promptNames = [
    "DEFAULT APPLE",
    "TOUCH MEMORY",
    "TASTE MEMORY",
    "IMPERFECT MEMORY"
  ];

  return {
    reportId,
    date: formatReportDate(date),
    reflection: reflectionDrawing ? reflectionDrawing.reflection_text.trim() : "",
    apples: personalDrawings.map((drawing, index) => {
      return {
        prompt: promptNames[index],
        similarity: hasCloseReportMatch(index)
          ? getReportSimilarityScore(index)
          : null,
        imageUrl: getReportPrintImageUrl(drawing)
      };
    })
  };
}

function getReportPrintImageUrl(drawing) {
  if (!drawing) return null;
  return drawing.image_url ||
    drawing.thumb_url ||
    drawing.imageUrl ||
    drawing.thumbUrl ||
    null;
}
