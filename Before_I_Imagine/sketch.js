// Before I Imagine - Prompt Test Version
// Full-screen drawing + bilingual prompt + Brush/Bucket/Eraser
// Archive Wall auto stroke replay + Grid View + Layer View
// localStorage + JSON export
// High-resolution version

let page = "draw";
// pages: "draw", "archiveWall", "archiveGrid", "layer", "stack"

let prompts = [
  {
    task: "TASK 01 / DEFAULT",
    shortTitle: "The apple I already know",
    en: "Draw the first apple that comes to your mind.",
    cn: "画下你脑中第一个出现的苹果。",
    noteEn: "Do not search for images. Draw only from memory.",
    noteCn: "不要搜索图片，只根据记忆画。"
  },
  {
    task: "TASK 02 / TOUCH MEMORY",
    shortTitle: "The apple my hand remembers",
    en: "Imagine holding an apple in your hand. Draw the apple your hand remembers.",
    cn: "想象你手里正拿着一个苹果。画下你的手记得的苹果。",
    noteEn: "Think about its weight, skin, temperature, smoothness, dents, or uneven shape.",
    noteCn: "想一想它的重量、果皮、温度、光滑感、凹痕，或不规则的形状。"
  },
  {
    task: "TASK 03 / TASTE MEMORY",
    shortTitle: "The apple my mouth remembers",
    en: "Remember the last time you ate an apple. Draw the apple your mouth remembers.",
    cn: "回忆你上一次吃苹果的时候。画下你的嘴巴记得的苹果。",
    noteEn: "Was it sour, sweet, crisp, juicy, dry, soft, or slightly oxidised?",
    noteCn: "它是酸的、甜的、脆的、多汁的、干的、软的，还是有点氧化的？"
  },
  {
    task: "TASK 04 / IMPERFECT MEMORY",
    shortTitle: "The apple that is not too correct",
    en: "Draw an apple that is not perfect anymore.",
    cn: "画一个已经不再完美的苹果。",
    noteEn: "It may be bruised, bitten, old, soft, strange, ordinary, or hard to recognise.",
    noteCn: "它可以是有伤痕的、被咬过的、变老的、变软的、奇怪的、普通的，或不太容易被认出的。"
  }
];

let archiveTaskTitles = [
  "TASK 01 / DEFAULT — The apple I already know",
  "TASK 02 / TOUCH MEMORY — The apple my hand remembers",
  "TASK 03 / TASTE MEMORY — The apple my mouth remembers",
  "TASK 04 / IMPERFECT MEMORY — The apple that is not too correct"
];

let promptIndex = 0;

let actions = [];
let currentAction = null;
let archive = [];

let drawingLayer;

let currentTool = "brush"; // brush / bucket / eraser

let colorPicker;
let sizeSlider;

let brushBtn;
let bucketBtn;
let eraserBtn;
let undoBtn;
let bgCol = "#f4f1eb";
let paperCol = "#fbfaf6";
let inkCol = "#161616";
let mutedCol = "#77716a";
let lineCol = "#b9afa2";
let interfaceFont = '"Courier New", Courier, monospace';

let clearBtn;
let submitBtn;
let nextPromptBtn;
let archiveBtn;

let backBtn;
let gridBtn;
let wallBtn;
let layerBtn;
let stackBtn;
let exportBtn;
let clearArchiveBtn;

let startTime;

let headerH = 190;
let drawLayout = {};

function isMobileScreen() {
  return width < 700;
}

function updateHeaderHeight() {
  headerH = isMobileScreen() ? 260 : 300;
}

let storageKey = "beforeIImaginePromptTestArchive_v3";
let oldStorageKeys = [
  "beforeIImaginePromptTestArchive_v2",
  "beforeIImaginePromptTestArchive_v1"
];

let archiveWallLayout = [];
let layerLayout = [];
let layerReplayIndex = 0;
let maxLayerUnits = 0;
let stackBuffer = null;
let stackPromptIndex = 0;
let stackCountMode = 30;
let stackDirty = true;
let stackRenderedCount = 0;
let gridMiniCache = {};
let archivePan = { x: 0, y: 0 };
let isArchivePanning = false;
let lastPanPoint = { x: 0, y: 0 };

let pd = 1;

function setup() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
  document.body.style.touchAction = "none";
  document.body.style.fontFamily = interfaceFont;
  document.body.style.fontWeight = "400";

  pd = min(displayDensity(), 2);
  pixelDensity(pd);

  createCanvas(windowWidth, windowHeight);
  updateHeaderHeight();
  smooth();

  drawingLayer = createGraphics(width, height);
  drawingLayer.pixelDensity(pd);
  drawingLayer.clear();
  drawingLayer.smooth();

  loadArchive().then(() => {
    refreshArchiveViews();
  }).catch((error) => {
    console.warn("Cloud archive loading failed:", error);
  });

  createInterface();
  layoutInterface();

  startTime = millis();
  
}

function draw() {
  background(bgCol);
  applyCanvasTypography();

  if (page === "draw") {
    drawDrawingPage();
  } else if (page === "archiveWall") {
    drawArchiveWallPage();
  } else if (page === "archiveGrid") {
    drawArchiveGridPage();
  } else if (page === "layer") {
    drawLayerPage();
  } else if (page === "stack") {
    drawStackPage();
  }

  updateButtonVisibility();
  updateToolButtonStyles();
}

// -------------------------
// INTERFACE
// -------------------------

function createInterface() {
  colorPicker = createColorPicker("#111111");

  sizeSlider = createSlider(1, 45, 5, 1);
  sizeSlider.size(120);
  colorPicker.style("z-index", "20");
  sizeSlider.style("z-index", "20");
  colorPicker.style("touch-action", "manipulation");
  sizeSlider.style("touch-action", "manipulation");

  brushBtn = createButton("Brush<br>画笔");
  brushBtn.mousePressed(() => currentTool = "brush");

  bucketBtn = createButton("Fill<br>填色");
  bucketBtn.mousePressed(() => currentTool = "bucket");

  eraserBtn = createButton("Eraser<br>橡皮擦");
  eraserBtn.mousePressed(() => currentTool = "eraser");

  undoBtn = createButton("Undo<br>撤回");
  undoBtn.mousePressed(undoLastAction);

  clearBtn = createButton("Clear<br>清除");
  clearBtn.mousePressed(clearDrawing);

  submitBtn = createButton("Submit<br>提交");
  submitBtn.mousePressed(submitDrawing);

  nextPromptBtn = createButton("Next<br>下一题");
  nextPromptBtn.mousePressed(nextPrompt);

  archiveBtn = createButton("Archive<br>档案库");
  archiveBtn.mousePressed(() => {
    page = "archiveWall";
    resetArchivePan();
    generateArchiveWallLayout();
  });

  backBtn = createButton("Back");
  backBtn.mousePressed(() => {
    page = "draw";
  });

  gridBtn = createButton("Grid");
  gridBtn.mousePressed(() => {
    page = "archiveGrid";
    resetArchivePan();
  });

  wallBtn = createButton("Wall");
  wallBtn.mousePressed(() => {
    page = "archiveWall";
    resetArchivePan();
    generateArchiveWallLayout();
  });

  layerBtn = createButton("Layer");
  layerBtn.mousePressed(() => {
    page = "layer";
    layerReplayIndex = 0;
    calculateMaxLayerUnits();
    generateLayerLayout();
    resetArchivePan();
  });

  stackBtn = createButton("Stack");
  stackBtn.mousePressed(() => {
    page = "stack";
    resetArchivePan();
    markStackDirty();
  });

  exportBtn = createButton("Export");
  exportBtn.mousePressed(exportArchiveJSON);

  //clearArchiveBtn = createButton("Clear Data 清除数据");
  //clearArchiveBtn.mousePressed(clearArchive);

  let allBtns = [
  brushBtn, bucketBtn, eraserBtn, undoBtn,
  clearBtn, submitBtn, nextPromptBtn, archiveBtn,
  backBtn, gridBtn, wallBtn, layerBtn, stackBtn, exportBtn
  ];

  for (let b of allBtns) {
    styleButton(b);
  }
}

function layoutInterface() {
  let mobile = isMobileScreen();
  drawLayout = getDrawingLayout();

  if (mobile) {
    let x = drawLayout.toolbarX + 16;
    let y = drawLayout.toolbarY + 8;
    let gap = 6;
    let innerW = drawLayout.toolbarW - 32;
    let toolBtnW = (innerW - gap * 2) / 3;
    let actionBtnW = (innerW - gap * 3) / 4;

    colorPicker.position(x, y + 22);
    colorPicker.size(48, 28);
    sizeSlider.position(x + 70, y + 27);
    sizeSlider.size(max(112, innerW - 86));

    brushBtn.position(x, y + 56);
    bucketBtn.position(x + (toolBtnW + gap), y + 56);
    eraserBtn.position(x + (toolBtnW + gap) * 2, y + 56);

    clearBtn.position(x, y + 96);
    submitBtn.position(x + (actionBtnW + gap), y + 96);
    nextPromptBtn.position(x + (actionBtnW + gap) * 2, y + 96);
    archiveBtn.position(x + (actionBtnW + gap) * 3, y + 96);

    undoBtn.position(drawLayout.drawX + drawLayout.drawW - 64, drawLayout.drawY + 12);

    let archiveNavX = 14;
    let archiveNavGap = 4;
    let archiveNavW = max(44, floor((width - archiveNavX * 2 - archiveNavGap * 5) / 6));
    backBtn.position(archiveNavX, 92);
    gridBtn.position(archiveNavX + (archiveNavW + archiveNavGap), 92);
    wallBtn.position(archiveNavX + (archiveNavW + archiveNavGap) * 2, 92);
    layerBtn.position(archiveNavX + (archiveNavW + archiveNavGap) * 3, 92);
    stackBtn.position(archiveNavX + (archiveNavW + archiveNavGap) * 4, 92);
    exportBtn.position(archiveNavX + (archiveNavW + archiveNavGap) * 5, 92);

  } else {
    let y = drawLayout.toolbarY + 32;
    let x = drawLayout.toolbarX + 38;
    let gap = 12;
    let btnW = min(100, max(82, (drawLayout.toolbarW - 480) / 7));

    colorPicker.position(x, y + 20);
    colorPicker.size(70, 36);
    sizeSlider.position(x + 118, y + 28);
    sizeSlider.size(180);

    let toolX = x + 300;
    brushBtn.position(toolX, y);
    bucketBtn.position(toolX + (btnW + gap), y);
    eraserBtn.position(toolX + (btnW + gap) * 2, y);

    let actionX = min(toolX + (btnW + gap) * 3 + 34, drawLayout.toolbarX + drawLayout.toolbarW - (btnW * 4 + gap * 3) - 36);
    clearBtn.position(actionX, y);
    submitBtn.position(actionX + (btnW + gap), y);
    nextPromptBtn.position(actionX + (btnW + gap) * 2, y);
    archiveBtn.position(actionX + (btnW + gap) * 3, y);
    undoBtn.position(drawLayout.drawX + drawLayout.drawW - 78, drawLayout.drawY + 16);

    backBtn.position(50, 96);
    gridBtn.position(118, 96);
    wallBtn.position(176, 96);
    layerBtn.position(238, 96);
    stackBtn.position(304, 96);
    exportBtn.position(370, 96);
  }

  sizeDrawingButton(brushBtn);
  sizeDrawingButton(bucketBtn);
  sizeDrawingButton(eraserBtn);
  sizeUndoButton(undoBtn);
  sizeDrawingButton(clearBtn);
  sizeDrawingButton(submitBtn);
  sizeDrawingButton(nextPromptBtn);
  sizeDrawingButton(archiveBtn);
  if (mobile) {
    let innerW = drawLayout.toolbarW - 32;
    let gap = 6;
    let toolBtnW = (innerW - gap * 2) / 3;
    let actionBtnW = (innerW - gap * 3) / 4;

    brushBtn.size(toolBtnW, 34);
    bucketBtn.size(toolBtnW, 34);
    eraserBtn.size(toolBtnW, 34);
    undoBtn.size(56, 32);
    clearBtn.size(actionBtnW, 34);
    submitBtn.size(actionBtnW, 34);
    nextPromptBtn.size(actionBtnW, 34);
    archiveBtn.size(actionBtnW, 34);
  }
  sizeArchiveButton(backBtn);
  sizeArchiveButton(gridBtn);
  sizeArchiveButton(wallBtn);
  sizeArchiveButton(layerBtn);
  sizeArchiveButton(stackBtn);
  sizeArchiveButton(exportBtn);
  if (mobile) {
    let archiveNavW = max(44, floor((width - 28 - 20) / 6));
    backBtn.size(archiveNavW, 28);
    gridBtn.size(archiveNavW, 28);
    wallBtn.size(archiveNavW, 28);
    layerBtn.size(archiveNavW, 28);
    stackBtn.size(archiveNavW, 28);
    exportBtn.size(archiveNavW, 28);
  }
}

function styleButton(btn) {
  btn.style("font-size", "13px");
  btn.style("line-height", "1.18");
  btn.style("padding", "6px 12px");
  btn.style("height", "58px");
  btn.style("min-width", "96px");
  btn.style("border", "1px solid #2b2926");
  btn.style("background", "#f9f6ef");
  btn.style("border-radius", "0px");
  btn.style("font-family", interfaceFont);
  btn.style("font-weight", "400");
  btn.style("letter-spacing", "0.02em");
  btn.style("white-space", "nowrap");
  btn.style("cursor", "pointer");
  btn.style("outline-color", "rgba(80, 72, 62, 0.35)");
  btn.style("z-index", "20");
  btn.attribute("translate", "no");
  btn.style("touch-action", "manipulation");
}

function applyCanvasTypography() {
  textFont(interfaceFont);
  textStyle(NORMAL);
  drawingContext.fontKerning = "normal";
  drawingContext.letterSpacing = "0px";
}

function sizeDrawingButton(btn) {
  let mobile = isMobileScreen();
  btn.size(mobile ? 72 : 100, mobile ? 34 : 58);
  btn.style("font-size", mobile ? "11px" : "14px");
  btn.style("height", mobile ? "34px" : "58px");
  btn.style("padding", mobile ? "2px 4px" : "6px 12px");
  btn.style("border", "1px solid #2b2926");
}

function sizeArchiveButton(btn) {
  btn.size(isMobileScreen() ? 54 : 58, 28);
  btn.style("height", "28px");
  btn.style("min-width", "0");
  btn.style("padding", "3px 8px");
  btn.style("font-size", "11px");
  btn.style("line-height", "1");
  btn.style("border", "1px solid rgba(30, 28, 25, 0.32)");
  btn.style("background", "rgba(251, 250, 246, 0.5)");
  btn.style("color", "#4d4943");
}

function sizeUndoButton(btn) {
  let mobile = isMobileScreen();
  btn.size(mobile ? 56 : 64, mobile ? 32 : 36);
  btn.style("height", mobile ? "32px" : "36px");
  btn.style("min-width", "0");
  btn.style("padding", mobile ? "2px 4px" : "4px 8px");
  btn.style("font-size", mobile ? "10px" : "12px");
  btn.style("line-height", "1.05");
  btn.style("border", "1px solid rgba(43, 41, 38, 0.45)");
  btn.style("background", "rgba(251, 250, 246, 0.72)");
  btn.style("color", "#2b2926");
}

function updateToolButtonStyles() {
  if (!brushBtn || !bucketBtn || !eraserBtn) return;

  let inactiveBg = "#f8f5ef";
  let activeBg = "#222";

  brushBtn.style("background", currentTool === "brush" ? activeBg : inactiveBg);
  brushBtn.style("color", currentTool === "brush" ? "#fff" : "#000");

  bucketBtn.style("background", currentTool === "bucket" ? activeBg : inactiveBg);
  bucketBtn.style("color", currentTool === "bucket" ? "#fff" : "#000");

  eraserBtn.style("background", currentTool === "eraser" ? activeBg : inactiveBg);
  eraserBtn.style("color", currentTool === "eraser" ? "#fff" : "#000");
}

function updateButtonVisibility() {
  if (page === "draw") {
    colorPicker.show();
    sizeSlider.show();

    brushBtn.show();
    bucketBtn.show();
    eraserBtn.show();
    undoBtn.show();

    clearBtn.show();
    submitBtn.show();
    nextPromptBtn.show();
    archiveBtn.show();

    backBtn.hide();
    gridBtn.hide();
    wallBtn.hide();
    layerBtn.hide();
    stackBtn.hide();
    exportBtn.hide();
    //clearArchiveBtn.hide();
  } else {
    colorPicker.hide();
    sizeSlider.hide();

    brushBtn.hide();
    bucketBtn.hide();
    eraserBtn.hide();
    undoBtn.hide();

    clearBtn.hide();
    submitBtn.hide();
    nextPromptBtn.hide();
    archiveBtn.hide();

    backBtn.show();
    gridBtn.show();
    wallBtn.show();
    layerBtn.show();
    stackBtn.show();
    exportBtn.show();
    //clearArchiveBtn.show();
  }
}

// -------------------------
// DRAWING PAGE
// -------------------------

function getDrawingLayout() {
  let mobile = isMobileScreen();
  let margin = mobile ? 18 : 72;
  let pageW = width - margin * 2;
  let titleY = mobile ? 34 : 58;
  let cardY = mobile ? 88 : 118;
  let cardH = mobile ? 220 : 174;
  let drawY = cardY + cardH + (mobile ? 22 : 22);
  let toolbarH = mobile ? 142 : 110;
  let footerH = mobile ? 34 : 54;
  let toolbarY = height - toolbarH - footerH - (mobile ? 8 : 0);
  let drawH = max(180, toolbarY - drawY - (mobile ? 18 : 22));

  return {
    margin: margin,
    pageW: pageW,
    titleY: titleY,
    cardX: margin,
    cardY: cardY,
    cardW: pageW,
    cardH: cardH,
    drawX: margin,
    drawY: drawY,
    drawW: pageW,
    drawH: drawH,
    toolbarX: margin,
    toolbarY: toolbarY,
    toolbarW: pageW,
    toolbarH: toolbarH,
    footerY: height - footerH,
    footerH: footerH
  };
}

function drawDrawingPage() {
  drawLayout = getDrawingLayout();
  let p = prompts[promptIndex];

  drawPaperBackground();
  drawDrawingTitle();
  drawPromptCard(p);
  drawDrawingSurface();

  clipRect(drawLayout.drawX, drawLayout.drawY, drawLayout.drawW, drawLayout.drawH);
  image(drawingLayer, 0, 0);
  unclip();

  drawToolbarPanel();
  drawDrawingFooter();
}

function drawPaperBackground() {
  noStroke();
  fill(bgCol);
  rect(0, 0, width, height);
}

function drawDrawingTitle() {
  textAlign(CENTER);
  noStroke();
  fill(inkCol);
  textStyle(NORMAL);
  textSize(isMobileScreen() ? 26 : 34);
  drawingContext.letterSpacing = isMobileScreen() ? "1.2px" : "2.2px";
  text("BEFORE I IMAGINE", width / 2, drawLayout.titleY);
  drawingContext.letterSpacing = "0px";

  fill(92);
  textSize(isMobileScreen() ? 14 : 16);
  text("A sensory drawing experiment", width / 2, drawLayout.titleY + (isMobileScreen() ? 24 : 34));
}

function drawPromptCard(p) {
  let x = drawLayout.cardX;
  let y = drawLayout.cardY;
  let w = drawLayout.cardW;
  let h = drawLayout.cardH;
  let mobile = isMobileScreen();

  noStroke();
  fill(238, 234, 226, 210);
  rect(x, y, w, h, 8);

  if (mobile) {
    fill(mutedCol);
    textAlign(LEFT);
    textSize(13);
    text(p.task, x + 18, y + 26);

    fill(inkCol);
    textSize(19);
    textLeading(23);
    text(p.en, x + 18, y + 64, w - 44);
    fill(60);
    textSize(15);
    textLeading(20);
    text(p.cn, x + 18, y + 112, w - 44);

    fill(105);
    textSize(11);
    textLeading(16);
    text(p.noteEn, x + 18, y + 148, w - 64);
    text(p.noteCn, x + 18, y + 176, w - 64);
  } else {
    fill(mutedCol);
    textAlign(CENTER);
    textSize(13);
    text(p.task, x + 110, y + 42);

    stroke(lineCol);
    strokeWeight(1);
    line(x + 235, y + 24, x + 235, y + h - 24);

    noStroke();
    drawEyeIcon(x + 118, y + 88);

    noStroke();
    textStyle(NORMAL);
    textAlign(LEFT);

    let textX = x + 275;
    let textW = w - 600;
    let baseY = y + 34;

    fill(inkCol);
    textSize(15);
    textLeading(20);
    text(p.en, textX, baseY, textW, 44);

    fill(45);
    textSize(12.5);
    textLeading(18);
    text(p.cn, textX, baseY + 48, textW, 30);

    fill(105);
    textSize(11);
    textLeading(16);
    text(p.noteEn, textX, baseY + 86, textW, 24);
    text(p.noteCn, textX, baseY + 112, textW, 24);
  }

  drawProgressDots(x + w - (mobile ? 96 : 150), y + (mobile ? 32 : 56));
}

function drawEyeIcon(cx, cy) {
  noFill();
  stroke(126);
  strokeWeight(2);
  beginShape();
  vertex(cx - 27, cy);
  bezierVertex(cx - 14, cy - 18, cx + 14, cy - 18, cx + 27, cy);
  bezierVertex(cx + 14, cy + 18, cx - 14, cy + 18, cx - 27, cy);
  endShape(CLOSE);
  circle(cx, cy, 19);
}

function drawProgressDots(x, y) {
  let step = isMobileScreen() ? 18 : 28;
  for (let i = 0; i < prompts.length; i++) {
    stroke(80);
    strokeWeight(1);
    fill(i === promptIndex ? 35 : bgCol);
    circle(x + i * step, y, 15);
  }

  noStroke();
  if (!isMobileScreen()) {
    fill(92);
    textAlign(CENTER);
    textSize(15);
    text(`${promptIndex + 1} / ${prompts.length}`, x + step * (prompts.length - 1) / 2, y + 40);
  }
}

function drawDrawingSurface() {
  let x = drawLayout.drawX;
  let y = drawLayout.drawY;
  let w = drawLayout.drawW;
  let h = drawLayout.drawH;

  noStroke();
  fill(paperCol);
  rect(x, y, w, h, 8);

  drawingContext.save();
  drawingContext.setLineDash([8, 6]);
  noFill();
  stroke(164, 154, 142);
  strokeWeight(1.2);
  rect(x + 1, y + 1, w - 2, h - 2, 8);
  drawingContext.restore();

  noStroke();
  fill(145);
  textAlign(RIGHT);
  textSize(isMobileScreen() ? 12 : 14);
  text("Draw here", x + w - 58, y + h - 78);
  text("在这里画", x + w - 58, y + h - 52);
}

function drawToolbarPanel() {
  let x = drawLayout.toolbarX;
  let y = drawLayout.toolbarY;
  let w = drawLayout.toolbarW;
  let h = drawLayout.toolbarH;

  noStroke();
  fill(238, 234, 226, 210);
  rect(x, y, w, h, 8);

  fill(inkCol);
  textAlign(LEFT);
  textSize(12);
  text("Colour", x + 6, y + (isMobileScreen() ? 14 : 34));
  text("Thickness", x + (isMobileScreen() ? 70 : 148), y + (isMobileScreen() ? 14 : 34));

  if (!isMobileScreen()) {
    stroke(lineCol);
    strokeWeight(1);
    line(x + 620, y + 26, x + 620, y + h - 26);
  }
}

function drawDrawingFooter() {
  fill(116);
  noStroke();
  textAlign(CENTER);
  textSize(isMobileScreen() ? 9 : 13);
  if (isMobileScreen()) {
    text("Draw above. Submit when finished.", width / 2, drawLayout.footerY + 12);
    text(`${archive.length} drawings saved   已保存 ${archive.length} 张`, width / 2, drawLayout.footerY + 26);
  } else {
    text("Draw anywhere in the area above the prompt. Submit when finished.", width / 2, drawLayout.footerY + 20);
    text(`请在提示区域上方的画布中作画。完成后提交。   |   ${archive.length} drawings saved   已保存 ${archive.length} 张`, width / 2, drawLayout.footerY + 42);
  }
}

// -------------------------
// MOUSE DRAWING
// -------------------------

function mousePressed() {
  handlePointerPressed(mouseX, mouseY);
}

function mouseDragged() {
  handlePointerDragged(mouseX, mouseY);
}

function mouseReleased() {
  handlePointerReleased();
}

function touchStarted() {
  if (touches.length > 0) {
    let x = touches[0].x;
    let y = touches[0].y;

    if (page === "stack" && handleStackControlPress(x, y)) {
      return false;
    }

    if (page === "draw" && pointInsideUndoButton(x, y)) {
      return true;
    }

    if (page === "draw" && pointInsideDrawingArea(x, y)) {
      handlePointerPressed(x, y);
      return false;
    }

    if (archiveCanPanAt(x, y)) {
      handlePointerPressed(x, y);
      return false;
    }
  }

  return true;
}

function touchMoved() {
  if (touches.length > 0) {
    let x = touches[0].x;
    let y = touches[0].y;

    if (page === "draw" && pointInsideUndoButton(x, y)) {
      return true;
    }

    if (isArchivePanning || (page === "draw" && pointInsideDrawingArea(x, y))) {
      handlePointerDragged(x, y);
      return false;
    }
  }

  return true;
}

function touchEnded() {
  handlePointerReleased();
  return true;
}

function handlePointerPressed(x, y) {
  if (page === "stack" && handleStackControlPress(x, y)) {
    return;
  }

  if (page === "draw" && pointInsideUndoButton(x, y)) {
    return;
  }

  if (page === "draw" && pointInsideDrawingArea(x, y)) {
    if (currentTool === "bucket") {
      bucketFillAt(x, y);
      return;
    }

    if (currentTool === "brush" || currentTool === "eraser") {
      currentAction = {
        type: "stroke",
        tool: currentTool,
        color: colorPicker.value(),
        size: sizeSlider.value(),
        points: []
      };

      let p = createPoint(x, y);
      currentAction.points.push(p);
    }
  } else if (archiveCanPanAt(x, y)) {
    isArchivePanning = true;
    lastPanPoint = { x: x, y: y };
  }
}

function handlePointerDragged(x, y) {
  if (page === "draw" && pointInsideUndoButton(x, y)) {
    return false;
  }

  if (isArchivePanning && archiveCanPanAt(x, y)) {
    let dx = x - lastPanPoint.x;
    let dy = y - lastPanPoint.y;

    if (page === "layer") {
      archivePan.x = constrain(archivePan.x + dx * 0.35, -width * 0.12, width * 0.12);
    } else {
      archivePan.x = 0;
    }

    archivePan.y += dy;
    constrainArchivePan();
    lastPanPoint = { x: x, y: y };
    return false;
  }

  if (page === "draw" && pointInsideDrawingArea(x, y)) {
    if (!currentAction) return;
    if (currentAction.type !== "stroke") return;

    let p = createPoint(x, y);
    currentAction.points.push(p);

    if (currentAction.points.length > 1) {
      let p1 = currentAction.points[currentAction.points.length - 2];
      let p2 = currentAction.points[currentAction.points.length - 1];
      drawActionLineOnLayer(currentAction, p1, p2);
    }
  }
}

function handlePointerReleased() {
  if (isArchivePanning) {
    isArchivePanning = false;
  }

  if (page === "draw" && currentAction) {
    if (currentAction.type === "stroke" && currentAction.points.length > 0) {
      if (currentAction.points.length === 1) {
        drawDotOnLayer(currentAction, currentAction.points[0]);
      }
      actions.push(currentAction);
    }
    currentAction = null;
  }
}

function archiveCanPan() {
  return archiveCanPanAt(mouseX, mouseY);
}

function archiveCanPanAt(x, y) {
  return (
    (page === "archiveGrid" || page === "archiveWall" || page === "layer") &&
    y > archiveHeaderHeight() &&
    y < height - 58
  );
}

function mouseWheel(event) {
  if (!archiveCanPan()) return;

  if (page === "layer") {
    archivePan.x = constrain(archivePan.x - event.deltaX * 0.25, -width * 0.12, width * 0.12);
  } else {
    archivePan.x = 0;
  }

  archivePan.y -= event.delta;
  constrainArchivePan();
  return false;
}

function constrainArchivePan() {
  if (page === "archiveGrid" || page === "archiveWall") {
    archivePan.x = 0;
  } else if (page === "layer") {
    archivePan.x = constrain(archivePan.x, -width * 0.1, width * 0.1);
  }

  let contentH = getArchiveContentHeight();
  let viewportH = max(120, height - archiveHeaderHeight() - 58);
  let minY = min(0, viewportH - contentH);
  archivePan.y = constrain(archivePan.y, minY, 0);
}

function getArchiveContentHeight() {
  if (page === "archiveGrid") return getArchiveGridContentHeight();
  if (page === "archiveWall") return getArchiveWallContentHeight();
  if (page === "layer") return getLayerContentHeight();
  return height - archiveHeaderHeight() - 58;
}

function createPoint(x, y) {
  return {
    x: x,
    y: y,
    t: millis()
  };
}

function mouseInsideDrawingArea() {
  return pointInsideDrawingArea(mouseX, mouseY);
}

function pointInsideDrawingArea(x, y) {
  drawLayout = getDrawingLayout();
  return (
    x >= drawLayout.drawX &&
    x <= drawLayout.drawX + drawLayout.drawW &&
    y >= drawLayout.drawY &&
    y <= drawLayout.drawY + drawLayout.drawH
  );
}

function pointInsideUndoButton(x, y) {
  if (!undoBtn) return false;

  let bx = undoBtn.x || 0;
  let by = undoBtn.y || 0;
  let bw = undoBtn.width || (isMobileScreen() ? 56 : 64);
  let bh = undoBtn.height || (isMobileScreen() ? 32 : 36);

  return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

function drawActionLineOnLayer(action, p1, p2) {
  if (action.tool === "eraser") {
    drawingLayer.erase();
    drawingLayer.stroke(0);
    drawingLayer.strokeWeight(action.size * 2.2);
    drawingLayer.strokeCap(ROUND);
    drawingLayer.strokeJoin(ROUND);
    drawingLayer.line(p1.x, p1.y, p2.x, p2.y);
    drawingLayer.noErase();
  } else {
    drawingLayer.stroke(action.color);
    drawingLayer.strokeWeight(action.size);
    drawingLayer.strokeCap(ROUND);
    drawingLayer.strokeJoin(ROUND);
    drawingLayer.line(p1.x, p1.y, p2.x, p2.y);
  }
}

function drawDotOnLayer(action, p) {
  if (action.tool === "eraser") {
    drawingLayer.erase();
    drawingLayer.noStroke();
    drawingLayer.fill(0);
    drawingLayer.circle(p.x, p.y, action.size * 2.2);
    drawingLayer.noErase();
  } else {
    drawingLayer.noStroke();
    drawingLayer.fill(action.color);
    drawingLayer.circle(p.x, p.y, action.size);
  }
}
// -------------------------
// BUCKET TOOL
// -------------------------

function bucketFillAt(x, y) {
  let fillColor = colorPicker.value();

  let filled = floodFillOnGraphics(
    drawingLayer,
    floor(x),
    floor(y),
    fillColor,
    0,
    headerH,
    width - 1,
    height - 1
  );

  if (filled) {
    actions.push({
      type: "fill",
      x: x,
      y: y,
      color: fillColor,
      t: millis()
    });
  }
}

function floodFillOnGraphics(g, startX, startY, fillHex, minX, minY, maxX, maxY) {
  if (startX < minX || startX > maxX || startY < minY || startY > maxY) {
    return false;
  }

  g.loadPixels();

  let target = getPixelFromGraphics(g, startX, startY);
  let replacement = hexToRGBA(fillHex);

  if (sameFillTarget(target, replacement)) {
    return false;
  }

  let w = g.width;
  let h = g.height;
  let visited = new Uint8Array(w * h);
  let stack = [];
  stack.push([startX, startY]);

  while (stack.length > 0) {
    let item = stack.pop();
    let x = item[0];
    let y = item[1];

    if (x < minX || x > maxX || y < minY || y > maxY) continue;

    let idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    let current = getPixelFromGraphics(g, x, y);

    if (!sameFillTarget(current, target)) continue;

    setPixelOnGraphics(g, x, y, replacement);

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  g.updatePixels();
  return true;
}

function getPixelFromGraphics(g, x, y) {
  let d = g.pixelDensity();
  let px = floor(x * d);
  let py = floor(y * d);
  let pw = floor(g.width * d);
  let index = 4 * (py * pw + px);

  return {
    r: g.pixels[index],
    g: g.pixels[index + 1],
    b: g.pixels[index + 2],
    a: g.pixels[index + 3]
  };
}

function setPixelOnGraphics(g, x, y, c) {
  let d = g.pixelDensity();
  let pw = floor(g.width * d);

  for (let ox = 0; ox < d; ox++) {
    for (let oy = 0; oy < d; oy++) {
      let px = floor(x * d + ox);
      let py = floor(y * d + oy);
      let index = 4 * (py * pw + px);

      g.pixels[index] = c.r;
      g.pixels[index + 1] = c.g;
      g.pixels[index + 2] = c.b;
      g.pixels[index + 3] = 255;
    }
  }
}

function hexToRGBA(hex) {
  let c = color(hex);

  return {
    r: floor(red(c)),
    g: floor(green(c)),
    b: floor(blue(c)),
    a: 255
  };
}

function sameFillTarget(c1, c2) {
  // Transparent target: only fill transparent pixels.
  if (c2.a < 20) {
    return c1.a < 20;
  }

  // Coloured target: approximate comparison.
  return (
    abs(c1.r - c2.r) < 25 &&
    abs(c1.g - c2.g) < 25 &&
    abs(c1.b - c2.b) < 25 &&
    abs(c1.a - c2.a) < 25
  );
}

// -------------------------
// SUBMIT / SAVE / LOAD
// -------------------------

function submitDrawing() {
  if (!saveCurrentDrawing()) {
    alert("Please draw something first.");
    return;
  }

  alert("Drawing saved.");
  advancePrompt();
}

function saveCurrentDrawing() {
  if (actions.length === 0) {
    return false;
  }

  let duration = (millis() - startTime) / 1000;

  let drawingData = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    promptIndex: promptIndex,
    promptEN: prompts[promptIndex].en,
    promptCN: prompts[promptIndex].cn,
    canvasWidth: width,
    canvasHeight: height,
    headerHeight: headerH,
    durationSeconds: Number(duration.toFixed(2)),
    actions: JSON.parse(JSON.stringify(actions))
  };

  archive.push(drawingData);
  saveArchive();
  refreshArchiveViews();
  saveDrawingToCloud(drawingData);

  return true;
}

function clearDrawing() {
  actions = [];
  currentAction = null;
  drawingLayer.clear();
  startTime = millis();
}

function undoLastAction() {
  if (page !== "draw" || actions.length === 0) return;

  actions.pop();
  currentAction = null;
  redrawDrawingLayerFromActions();
}

function redrawDrawingLayerFromActions() {
  drawingLayer.clear();

  for (let action of actions) {
    if (action.type === "stroke") {
      let pts = action.points || [];

      if (pts.length === 1) {
        drawDotOnLayer(action, pts[0]);
      }

      for (let i = 1; i < pts.length; i++) {
        drawActionLineOnLayer(action, pts[i - 1], pts[i]);
      }
    } else if (action.type === "fill") {
      floodFillOnGraphics(
        drawingLayer,
        floor(action.x),
        floor(action.y),
        action.color,
        0,
        headerH,
        width - 1,
        height - 1
      );
    }
  }
}

function nextPrompt() {
  if (actions.length > 0) {
    saveCurrentDrawing();
  }

  advancePrompt();
}

function advancePrompt() {
  promptIndex = (promptIndex + 1) % prompts.length;
  clearDrawing();
}

function saveArchive() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(archive));
  } catch (error) {
    console.warn("Could not save archive to localStorage:", error);
  }
}

async function loadArchive() {
  try {
    const response = await fetch("/api/drawings");

    if (response.ok) {
      const cloudArchive = await response.json();
      if (Array.isArray(cloudArchive)) {
        archive = cloudArchive.map(normalizeDrawingData).filter(Boolean);
        saveArchive();
        return;
      }
    } else {
      console.warn("Cloud archive request failed:", await response.text());
    }
  } catch (error) {
    console.warn("Could not load archive from server. Falling back to localStorage:", error);
  }

  try {
    let saved = localStorage.getItem(storageKey);

    if (!saved) {
      for (let key of oldStorageKeys) {
        saved = localStorage.getItem(key);
        if (saved) break;
      }
    }

    if (saved) {
      archive = JSON.parse(saved).map(normalizeDrawingData).filter(Boolean);
      saveArchive();
    } else {
      archive = [];
    }
  } catch (error) {
    console.warn("Could not load archive from localStorage:", error);
    archive = [];
  }
}

async function saveDrawingToCloud(drawingData) {
  try {
    const response = await fetch("/api/drawings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(drawingData)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  } catch (error) {
    console.warn("Could not save drawing to server. It is still saved locally:", error);
  }
}

function refreshArchiveViews() {
  clearGridMiniCache();
  generateArchiveWallLayout();
  calculateMaxLayerUnits();
  generateLayerLayout();
  markStackDirty();
}

function normalizeDrawingData(d) {
  if (!d.actions && d.strokes) {
    d.actions = [];

    for (let s of d.strokes) {
      let action = {
        type: "stroke",
        tool: "brush",
        color: "#111111",
        size: 4,
        points: []
      };

      for (let p of s) {
        action.points.push({
          x: p.x,
          y: p.y,
          t: p.t || 0
        });

        if (p.color) action.color = p.color;
        if (p.size) action.size = p.size;
      }

      d.actions.push(action);
    }
  }

  if (!d.headerHeight) d.headerHeight = headerH;
  if (!d.canvasWidth) d.canvasWidth = width;
  if (!d.canvasHeight) d.canvasHeight = height;

  return d;
}

function clearArchive() {
  let confirmClear = confirm("Clear all saved drawings?");
  if (!confirmClear) return;

  archive = [];
  localStorage.removeItem(storageKey);
  clearGridMiniCache();

  for (let key of oldStorageKeys) {
    localStorage.removeItem(key);
  }

  refreshArchiveViews();
}

// -------------------------
// ARCHIVE WALL
// -------------------------

function generateArchiveWallLayout() {
  archiveWallLayout = [];

  let header = archiveHeaderHeight();
  let marginX = isMobileScreen() ? 34 : 82;
  let availableW = width - marginX * 2;
  let itemsPerRow = max(1, floor(availableW / (isMobileScreen() ? 140 : 188)));
  itemsPerRow = min(itemsPerRow, max(1, archive.length));
  let spacingY = isMobileScreen() ? 138 : 172;
  let startY = header + (isMobileScreen() ? 54 : 68);
  let rowCenters = [];

  for (let i = 0; i < archive.length; i++) {
    let row = floor(i / itemsPerRow);
    if (!rowCenters[row]) rowCenters[row] = [];

    let miniW = isMobileScreen() ? 118 : 150;
    let miniH = isMobileScreen() ? 96 : 120;
    let minCenterX = marginX + miniW * 0.48;
    let maxCenterX = width - marginX - miniW * 0.48;
    let centerX = random(minCenterX, maxCenterX);
    let minDist = miniW * (isMobileScreen() ? 0.78 : 0.86);

    for (let attempt = 0; attempt < 14; attempt++) {
      let tooClose = false;
      for (let placedX of rowCenters[row]) {
        if (abs(centerX - placedX) < minDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) break;
      centerX = random(minCenterX, maxCenterX);
    }
    rowCenters[row].push(centerX);

    let jitterY = random(isMobileScreen() ? -12 : -18, isMobileScreen() ? 12 : 18);

    let miniLayer = createGraphics(miniW, miniH);
    miniLayer.pixelDensity(pd);
    miniLayer.clear();
    miniLayer.smooth();

    archiveWallLayout.push({
      x: centerX - miniW / 2,
      y: startY + row * spacingY + jitterY,
      scale: 0.88 + ((i % 5) * 0.025),
      alpha: 0.82 + ((i % 4) * 0.04),
      replayIndex: 0,
      replaySpeed: 0.62 + ((i % 4) * 0.1),
      miniW: miniW,
      miniH: miniH,
      miniLayer: miniLayer,
      lastDrawnIndex: 0
    });
  }
}

function getArchiveWallContentHeight() {
  if (archive.length === 0) return height - archiveHeaderHeight() - 58;

  let marginX = isMobileScreen() ? 34 : 82;
  let availableW = width - marginX * 2;
  let itemsPerRow = max(1, floor(availableW / (isMobileScreen() ? 140 : 188)));
  itemsPerRow = min(itemsPerRow, max(1, archive.length));
  let rows = ceil(archive.length / itemsPerRow);
  let spacingY = isMobileScreen() ? 138 : 172;
  let startY = isMobileScreen() ? 54 : 68;
  let miniH = isMobileScreen() ? 96 : 120;

  return startY + max(0, rows - 1) * spacingY + miniH + 82;
}

function generateLayerLayout() {
  layerLayout = [];

  let marginX = isMobileScreen() ? 38 : 86;
  let availableW = max(160, width - marginX * 2);
  let slotsPerRow = max(2, floor(availableW / (isMobileScreen() ? 96 : 150)));
  slotsPerRow = min(slotsPerRow, max(1, archive.length));
  let slotW = availableW / slotsPerRow;
  let cellH = isMobileScreen() ? 148 : 184;
  let startY = archiveHeaderHeight() + 76;
  let baseScale = isMobileScreen() ? 0.7 : 0.84;
  let rows = ceil(archive.length / slotsPerRow);
  let slotOrders = [];

  for (let row = 0; row < rows; row++) {
    let order = [];
    for (let slot = 0; slot < slotsPerRow; slot++) {
      order.push(slot);
    }
    slotOrders.push(shuffle(order, false));
  }

  for (let i = 0; i < archive.length; i++) {
    let row = floor(i / slotsPerRow);
    let slotIndex = i % slotsPerRow;
    let slot = slotOrders[row][slotIndex];
    let jitterX = random(-slotW * 0.28, slotW * 0.28);
    let jitterY = random(isMobileScreen() ? -26 : -34, isMobileScreen() ? 26 : 34);

    layerLayout.push({
      x: marginX + slotW * (slot + 0.5) + jitterX,
      y: startY + row * cellH + jitterY,
      scale: random(baseScale - 0.06, baseScale + 0.1),
      rotation: random(-0.08, 0.08),
      alpha: random(0.48, 0.72)
    });
  }
}

function getLayerContentHeight() {
  if (archive.length === 0) return height - archiveHeaderHeight() - 58;

  let marginX = isMobileScreen() ? 38 : 86;
  let availableW = max(160, width - marginX * 2);
  let slotsPerRow = max(2, floor(availableW / (isMobileScreen() ? 96 : 150)));
  slotsPerRow = min(slotsPerRow, max(1, archive.length));
  let cellH = isMobileScreen() ? 148 : 184;
  let rows = ceil(archive.length / slotsPerRow);
  let startY = 76;

  return startY + max(0, rows - 1) * cellH + 190;
}

function drawArchiveWallPage() {
  drawArchiveHeader(
    "Archive of Remembered Apples",
    "A quiet exhibition wall of remembered forms."
  );

  if (archive.length === 0) {
    drawEmptyArchiveMessage();
    return;
  }

  clipBelowHeader();
  push();
  translate(archivePan.x, archivePan.y);

  for (let i = 0; i < archive.length; i++) {
    let d = archive[i];
    let layout = archiveWallLayout[i];
    if (!layout) continue;

    let totalUnits = countDrawingUnits(d);

    updateMiniReplayLayer(d, layout);

    push();
    translate(layout.x, layout.y);
    scale(layout.scale);
    tint(255, 230 * layout.alpha);
    image(layout.miniLayer, 0, 0);
    noTint();
    drawWallHoverLabel(d, i, layout);
    pop();

    layout.replayIndex += layout.replaySpeed;

    if (layout.replayIndex > totalUnits + 40) {
      layout.replayIndex = 0;
      layout.lastDrawnIndex = 0;
      layout.miniLayer.clear();
    }
  }

  pop();
  unclip();

  drawArchiveFooter("Each apple is replayed from a participant's drawing trace.");
}

// -------------------------
// ARCHIVE GRID
// -------------------------

function drawArchiveGridPage() {
  drawArchiveHeader(
    "Archive of Remembered Apples",
    "Drawings are gathered by sensory task."
  );

  if (archive.length === 0) {
    drawEmptyArchiveMessage();
    return;
  }

  let cardW = isMobileScreen() ? 150 : 210;
  let cardH = isMobileScreen() ? 154 : 184;
  let gap = isMobileScreen() ? 14 : 26;
  let startX = isMobileScreen() ? 22 : 70;
  let y = archiveHeaderHeight() + 38 + archivePan.y;

  let cols = floor((width - startX * 2) / (cardW + gap));
  cols = max(1, cols);

  // 按 promptIndex 分组
  let groups = {};

  for (let d of archive) {
    let key = d.promptIndex !== undefined ? d.promptIndex : "unknown";

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(d);
  }

  let promptKeys = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
  let drawingNumber = 1;

  clipBelowHeader();

  for (let key of promptKeys) {
    let group = groups[key];

    if (y > archiveHeaderHeight() - 40 && y < height - 58) {
      noStroke();
      fill(45);
      textAlign(LEFT);
      textSize(isMobileScreen() ? 12 : 14);
      text(getArchiveTaskTitle(key), startX, y);

      fill(125);
      textSize(10);
      text(`${group.length} drawings`, startX, y + 18);
    }

    y += 38;

    for (let i = 0; i < group.length; i++) {
      let col = i % cols;
      let row = floor(i / cols);

      let x = startX + col * (cardW + gap);
      let cardY = y + row * (cardH + gap);

      if (cardY > height - 58 || cardY + cardH < archiveHeaderHeight()) continue;

      let d = group[i];

      fill(251, 250, 246, 230);
      stroke(216, 208, 197);
      strokeWeight(1);
      rect(x, cardY, cardW, cardH, 3);

      push();
      translate(x + 13, cardY + 12);
      drawStaticMini(d, cardW - 26, cardH - 64);
      pop();

      noStroke();
      fill(88);
      textAlign(LEFT);
      textSize(10);
      text(`#${drawingNumber}`, x + 13, cardY + cardH - 34);

      fill(138);
      textSize(9);
      text(formatArchiveTime(d), x + 13, cardY + cardH - 17);

      drawingNumber++;
    }

    let rowsUsed = ceil(group.length / cols);
    y += rowsUsed * (cardH + gap) + 32;
  }

  unclip();

  drawArchiveFooter("Drawings are grouped by sensory task, not by raw prompt text.");
}

function getArchiveGridContentHeight() {
  if (archive.length === 0) return height - archiveHeaderHeight() - 58;

  let cardW = isMobileScreen() ? 150 : 210;
  let cardH = isMobileScreen() ? 154 : 184;
  let gap = isMobileScreen() ? 14 : 26;
  let startX = isMobileScreen() ? 22 : 70;
  let cols = floor((width - startX * 2) / (cardW + gap));
  cols = max(1, cols);
  let groups = {};

  for (let d of archive) {
    let key = d.promptIndex !== undefined ? d.promptIndex : "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }

  let promptKeys = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
  let totalH = 38;

  for (let key of promptKeys) {
    let rowsUsed = ceil(groups[key].length / cols);
    totalH += 38 + rowsUsed * (cardH + gap) + 32;
  }

  return totalH + 40;
}

// -------------------------
// LAYER VIEW
// -------------------------

function calculateMaxLayerUnits() {
  maxLayerUnits = 0;

  for (let d of archive) {
    maxLayerUnits = max(maxLayerUnits, countDrawingUnits(d));
  }
}

function drawLayerPage() {
  drawArchiveHeader(
    "Archive of Remembered Apples",
    "Layer view gathers every remembered apple into one field."
  );

  if (archive.length === 0) {
    drawEmptyArchiveMessage();
    return;
  }

  if (layerLayout.length !== archive.length) {
    generateLayerLayout();
  }

  clipBelowHeader();
  push();
  translate(archivePan.x, archivePan.y);

  for (let i = 0; i < archive.length; i++) {
    let d = archive[i];
    let layout = layerLayout[i];
    if (!layout) continue;

    push();
    translate(layout.x, layout.y);
    rotate(layout.rotation);
    scale(layout.scale);

    drawReplayCentered(d, layerReplayIndex, layout.alpha);

    pop();
  }

  pop();
  unclip();

  layerReplayIndex += 1.6;

  if (layerReplayIndex > maxLayerUnits + 80) {
    layerReplayIndex = 0;
  }

  drawArchiveFooter("Layer view lets individual traces overlap without flattening them into one image.");
}

// -------------------------
// COLLECTIVE STACK VIEW
// -------------------------

function markStackDirty() {
  stackDirty = true;
}

function getStackControlLayout() {
  let outerMargin = isMobileScreen() ? 18 : 50;
  let gap = isMobileScreen() ? 5 : 8;
  let categoryY = archiveHeaderHeight() + 18;
  let categoryH = isMobileScreen() ? 28 : 30;
  let availableW = min(width - outerMargin * 2, isMobileScreen() ? width : 760);
  let margin = (width - availableW) / 2;
  let categoryW = (availableW - gap * (prompts.length - 1)) / prompts.length;
  let countY = categoryY + categoryH + (isMobileScreen() ? 10 : 12);
  let countW = isMobileScreen() ? 52 : 62;
  let countH = 26;

  let categories = [];
  for (let i = 0; i < prompts.length; i++) {
    categories.push({
      x: margin + i * (categoryW + gap),
      y: categoryY,
      w: categoryW,
      h: categoryH,
      value: i
    });
  }

  let counts = [];
  let countValues = [10, 30, "all"];
  for (let i = 0; i < countValues.length; i++) {
    counts.push({
      x: margin + i * (countW + gap),
      y: countY,
      w: countW,
      h: countH,
      value: countValues[i]
    });
  }

  return {
    margin: margin,
    categories: categories,
    counts: counts,
    stackY: countY + countH + (isMobileScreen() ? 14 : 18)
  };
}

function handleStackControlPress(x, y) {
  if (page !== "stack") return false;

  let controls = getStackControlLayout();

  for (let item of controls.categories) {
    if (pointInsideRect(x, y, item)) {
      if (stackPromptIndex !== item.value) {
        stackPromptIndex = item.value;
        markStackDirty();
      }
      return true;
    }
  }

  for (let item of controls.counts) {
    if (pointInsideRect(x, y, item)) {
      if (stackCountMode !== item.value) {
        stackCountMode = item.value;
        markStackDirty();
      }
      return true;
    }
  }

  return false;
}

function pointInsideRect(x, y, rectData) {
  return (
    x >= rectData.x &&
    x <= rectData.x + rectData.w &&
    y >= rectData.y &&
    y <= rectData.y + rectData.h
  );
}

function drawStackPage() {
  drawArchiveHeader(
    "Archive of Remembered Apples",
    "Collective Stack compares one sensory task at a time."
  );

  drawStackControls();

  let frame = getStackFrame();
  if (
    stackDirty ||
    !stackBuffer ||
    stackBuffer.width !== floor(frame.w) ||
    stackBuffer.height !== floor(frame.h)
  ) {
    generateStackBuffer(frame.w, frame.h);
  }

  noStroke();
  fill(paperCol);
  rect(frame.x, frame.y, frame.w, frame.h, 4);
  stroke(205, 197, 186);
  strokeWeight(1);
  noFill();
  rect(frame.x, frame.y, frame.w, frame.h, 4);

  if (stackRenderedCount > 0 && stackBuffer) {
    image(stackBuffer, frame.x, frame.y, frame.w, frame.h);
  } else {
    noStroke();
    fill(124);
    textAlign(CENTER);
    textSize(isMobileScreen() ? 12 : 14);
    text("No drawings saved for this task.", width / 2, frame.y + frame.h / 2);
  }

  let selectedTitle = getArchiveTaskTitle(stackPromptIndex).split(" — ")[0];
  drawArchiveFooter(
    `${stackRenderedCount} drawings overlaid / ${selectedTitle}`
  );
}

function drawStackControls() {
  let controls = getStackControlLayout();
  let categoryLabels = ["DEFAULT", "TOUCH", "TASTE", "IMPERFECT"];

  for (let item of controls.categories) {
    let active = stackPromptIndex === item.value;
    stroke(active ? 45 : 160);
    strokeWeight(1);
    fill(active ? 45 : color(bgCol));
    rect(item.x, item.y, item.w, item.h, 2);

    noStroke();
    fill(active ? 250 : 82);
    textAlign(CENTER, CENTER);
    textSize(isMobileScreen() ? 9 : 11);
    text(categoryLabels[item.value], item.x + item.w / 2, item.y + item.h / 2 + 1);
  }

  noStroke();
  fill(112);
  textAlign(RIGHT, CENTER);
  textSize(10);
  let labelX = width - controls.margin;
  let countY = controls.counts[0].y + controls.counts[0].h / 2;
  text("RECENT", labelX, countY);

  for (let item of controls.counts) {
    let active = stackCountMode === item.value;
    stroke(active ? 55 : 174);
    strokeWeight(1);
    fill(active ? 55 : color(bgCol));
    rect(item.x, item.y, item.w, item.h, 2);

    noStroke();
    fill(active ? 250 : 92);
    textAlign(CENTER, CENTER);
    textSize(10);
    text(item.value === "all" ? "ALL" : String(item.value), item.x + item.w / 2, item.y + item.h / 2 + 1);
  }
}

function getStackFrame() {
  let controls = getStackControlLayout();
  let marginX = isMobileScreen() ? 18 : max(70, width * 0.12);
  let bottom = height - 72;

  return {
    x: marginX,
    y: controls.stackY,
    w: max(120, width - marginX * 2),
    h: max(90, bottom - controls.stackY)
  };
}

function generateStackBuffer(bufferW, bufferH) {
  let w = max(1, floor(bufferW));
  let h = max(1, floor(bufferH));

  if (stackBuffer) {
    stackBuffer.remove();
  }
  stackBuffer = createGraphics(w, h);
  stackBuffer.pixelDensity(pd);
  stackBuffer.clear();
  stackBuffer.smooth();

  let matching = archive
    .filter(d => Number(d.promptIndex) === stackPromptIndex)
    .slice()
    .sort((a, b) => {
      let aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id) || 0;
      let bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id) || 0;
      return bTime - aTime;
    });

  // "All" is capped to protect mobile performance. Raise this value if needed.
  let limit = stackCountMode === "all" ? 100 : stackCountMode;
  let selected = matching.slice(0, limit);
  stackRenderedCount = selected.length;

  if (selected.length === 0) {
    stackDirty = false;
    return;
  }

  let drawingBuffer = createGraphics(w, h);
  drawingBuffer.pixelDensity(pd);
  drawingBuffer.smooth();

  let opacity = constrain(map(selected.length, 1, 100, 0.15, 0.08), 0.08, 0.15);

  for (let drawing of selected) {
    drawingBuffer.clear();
    renderNormalizedDrawingForStack(drawingBuffer, drawing);

    stackBuffer.push();
    stackBuffer.tint(255, floor(opacity * 255));
    stackBuffer.image(drawingBuffer, 0, 0);
    stackBuffer.noTint();
    stackBuffer.pop();
  }

  drawingBuffer.remove();
  stackDirty = false;
}

function renderNormalizedDrawingForStack(g, drawing) {
  // Stored action geometry represents the non-transparent drawn content, so it
  // provides the same useful crop bounds without scanning every source pixel.
  let bounds = getDrawingBounds(drawing);
  let contentW = max(1, bounds.maxX - bounds.minX);
  let contentH = max(1, bounds.maxY - bounds.minY);
  let targetW = g.width * (isMobileScreen() ? 0.82 : 0.76);
  let targetH = g.height * 0.78;
  let scaleFactor = min(targetW / contentW, targetH / contentH);
  let offsetX = (g.width - contentW * scaleFactor) / 2;
  let offsetY = (g.height - contentH * scaleFactor) / 2;
  let acts = drawing.actions || [];

  for (let action of acts) {
    if (action.type === "stroke") {
      let pts = action.points || [];

      if (action.tool === "eraser") {
        g.erase();
        g.stroke(0);
      } else {
        g.noErase();
        g.stroke(action.color || "#111111");
      }

      g.strokeWeight(max(0.8, action.size * scaleFactor));
      g.strokeCap(ROUND);
      g.strokeJoin(ROUND);

      if (pts.length === 1) {
        let p = mapPointToStack(pts[0], bounds, scaleFactor, offsetX, offsetY);
        g.noStroke();
        g.fill(action.tool === "eraser" ? 0 : action.color || "#111111");
        g.circle(p.x, p.y, max(1, action.size * scaleFactor));
      }

      for (let i = 1; i < pts.length; i++) {
        let p1 = mapPointToStack(pts[i - 1], bounds, scaleFactor, offsetX, offsetY);
        let p2 = mapPointToStack(pts[i], bounds, scaleFactor, offsetX, offsetY);
        g.line(p1.x, p1.y, p2.x, p2.y);
      }

      g.noErase();
    } else if (action.type === "fill") {
      // Fill actions store a point but not their original contour. Keep them as
      // a quiet mark so a large flood fill cannot flatten the collective trace.
      let p = mapPointToStack(action, bounds, scaleFactor, offsetX, offsetY);
      g.noStroke();
      g.fill(action.color || "#111111");
      g.circle(p.x, p.y, constrain(24 * scaleFactor, 10, 48));
    }
  }
}

function mapPointToStack(p, bounds, scaleFactor, offsetX, offsetY) {
  return {
    x: (p.x - bounds.minX) * scaleFactor + offsetX,
    y: (p.y - bounds.minY) * scaleFactor + offsetY
  };
}

// -------------------------
// REPLAY RENDERING
// -------------------------

function updateMiniReplayLayer(d, layout) {
  let targetIndex = floor(layout.replayIndex);

  // 如果播放重置了，清空小画布
  if (targetIndex < layout.lastDrawnIndex) {
    layout.miniLayer.clear();
    layout.lastDrawnIndex = 0;
  }

  // 一次只补画新增的部分，不要每帧从头重画
  renderDrawingRangeToGraphics(
    layout.miniLayer,
    d,
    layout.lastDrawnIndex,
    targetIndex,
    true,
    layout.alpha
  );

  layout.lastDrawnIndex = targetIndex;
}
function countDrawingUnits(d) {
  let count = 0;
  let acts = d.actions || [];

  for (let a of acts) {
    if (a.type === "stroke") {
      count += max(1, (a.points || []).length);
    } else if (a.type === "fill") {
      count += 8;
    }
  }

  return count;
}

function drawReplayMini(d, limit, miniW, miniH, alphaValue) {
  let g = createGraphics(miniW, miniH);
  g.pixelDensity(pd);
  g.clear();
  g.smooth();

  renderDrawingToGraphics(g, d, limit, true, alphaValue);

  image(g, 0, 0);
}

function drawStaticMini(d, miniW, miniH) {
  let g = getCachedStaticMini(d, miniW, miniH);
  image(g, 0, 0);
}

function getCachedStaticMini(d, miniW, miniH) {
  let key = [
    d.id || d.createdAt || archive.indexOf(d),
    floor(miniW),
    floor(miniH),
    countDrawingUnits(d)
  ].join("_");

  if (!gridMiniCache[key]) {
    let g = createGraphics(miniW, miniH);
    g.pixelDensity(pd);
    g.clear();
    g.smooth();
    renderDrawingToGraphics(g, d, 999999, true, 1);
    gridMiniCache[key] = g;
  }

  return gridMiniCache[key];
}

function clearGridMiniCache() {
  gridMiniCache = {};
}

function resetArchivePan() {
  archivePan = { x: 0, y: 0 };
  isArchivePanning = false;
  constrainArchivePan();
}

function drawReplayCentered(d, limit, alphaValue) {
  let bounds = getDrawingBounds(d);

  let contentW = bounds.maxX - bounds.minX;
  let contentH = bounds.maxY - bounds.minY;

  let targetW = 180;
  let targetH = 150;

  let scaleFactor = min(targetW / contentW, targetH / contentH);

  let acts = d.actions || [];
  let used = 0;

  for (let a of acts) {
    if (used >= limit) break;

    if (a.type === "stroke") {
      let pts = a.points || [];

      for (let i = 1; i < pts.length; i++) {
        if (used >= limit) break;

        let p1 = mapPointToCenteredLayer(pts[i - 1], bounds, scaleFactor);
        let p2 = mapPointToCenteredLayer(pts[i], bounds, scaleFactor);

        if (a.tool === "eraser") {
          stroke(red(color(paperCol)), green(color(paperCol)), blue(color(paperCol)), 180);
          strokeWeight(max(2, a.size * 0.8));
        } else {
          let c = color(a.color || "#111111");
          c.setAlpha(255 * alphaValue);
          stroke(c);
          strokeWeight(max(0.8, a.size * 0.5));
        }

        strokeCap(ROUND);
        strokeJoin(ROUND);
        line(p1.x, p1.y, p2.x, p2.y);

        used++;
      }
    } else if (a.type === "fill") {
      if (used < limit) {
        let p = mapPointToCenteredLayer(a, bounds, scaleFactor);
        let c = color(a.color);
        c.setAlpha(90 * alphaValue);
        noStroke();
        fill(c);
        ellipse(p.x, p.y, 80, 70);
        used += 8;
      }
    }
  }
}

function mapPointToCenteredLayer(p, bounds, scaleFactor) {
  let contentW = bounds.maxX - bounds.minX;
  let contentH = bounds.maxY - bounds.minY;

  return {
    x: (p.x - bounds.minX - contentW / 2) * scaleFactor,
    y: (p.y - bounds.minY - contentH / 2) * scaleFactor
  };
}

function renderDrawingToGraphics(g, d, limit, includeFills, alphaValue) {
  let acts = d.actions || [];
  let used = 0;

  for (let a of acts) {
    if (used >= limit) break;

    if (a.type === "stroke") {
      let pts = a.points || [];

      if (pts.length === 1 && used < limit) {
        let p = mapPointToMini(pts[0], d, g.width, g.height);
        drawMiniDot(g, a, p, alphaValue);
        used++;
      }

      for (let i = 1; i < pts.length; i++) {
        if (used >= limit) break;

        let p1 = mapPointToMini(pts[i - 1], d, g.width, g.height);
        let p2 = mapPointToMini(pts[i], d, g.width, g.height);

        if (a.tool === "eraser") {
          g.erase();
          g.stroke(0);
          g.strokeWeight(max(1, a.size * 0.32));
          g.strokeCap(ROUND);
          g.strokeJoin(ROUND);
          g.line(p1.x, p1.y, p2.x, p2.y);
          g.noErase();
        } else {
          let c = color(a.color || "#111111");
          c.setAlpha(220 * alphaValue);
          g.stroke(c);
          g.strokeWeight(max(0.7, a.size * 0.25));
          g.strokeCap(ROUND);
          g.strokeJoin(ROUND);
          g.line(p1.x, p1.y, p2.x, p2.y);
        }

        used++;
      }
    } else if (a.type === "fill" && includeFills) {
      if (used < limit) {
        let p = mapPointToMini(a, d, g.width, g.height);

        floodFillOnGraphics(
          g,
          floor(p.x),
          floor(p.y),
          a.color,
          0,
          0,
          g.width - 1,
          g.height - 1
        );

        used += 8;
      }
    }
  }
}

function renderDrawingRangeToGraphics(g, d, fromLimit, toLimit, includeFills, alphaValue) {
  let acts = d.actions || [];
  let used = 0;

  for (let a of acts) {
    if (used >= toLimit) break;

    if (a.type === "stroke") {
      let pts = a.points || [];

      if (pts.length === 1) {
        if (used >= fromLimit && used < toLimit) {
          let p = mapPointToMini(pts[0], d, g.width, g.height);
          drawMiniDot(g, a, p, alphaValue);
        }
        used++;
      }

      for (let i = 1; i < pts.length; i++) {
        if (used >= toLimit) break;

        if (used >= fromLimit) {
          let p1 = mapPointToMini(pts[i - 1], d, g.width, g.height);
          let p2 = mapPointToMini(pts[i], d, g.width, g.height);

          if (a.tool === "eraser") {
            g.stroke(paperCol);
            g.strokeWeight(max(1, a.size * 0.45));
            g.strokeCap(ROUND);
            g.strokeJoin(ROUND);
            g.line(p1.x, p1.y, p2.x, p2.y);
          } else {
            let c = color(a.color || "#111111");
            c.setAlpha(220 * alphaValue);
            g.stroke(c);
            g.strokeWeight(max(0.7, a.size * 0.25));
            g.strokeCap(ROUND);
            g.strokeJoin(ROUND);
            g.line(p1.x, p1.y, p2.x, p2.y);
          }
        }

        used++;
      }
    } else if (a.type === "fill" && includeFills) {
      if (used >= fromLimit && used < toLimit) {
        let p = mapPointToMini(a, d, g.width, g.height);

        floodFillOnGraphics(
          g,
          floor(p.x),
          floor(p.y),
          a.color,
          0,
          0,
          g.width - 1,
          g.height - 1
        );
      }

      used += 8;
    }
  }
}

function drawMiniDot(g, action, p, alphaValue) {
  if (action.tool === "eraser") {
    g.noStroke();
    g.fill(paperCol);
    g.circle(p.x, p.y, max(2, action.size * 0.7));
  } else {
    let c = color(action.color || "#111111");
    c.setAlpha(220 * alphaValue);
    g.noStroke();
    g.fill(c);
    g.circle(p.x, p.y, max(1, action.size * 0.3));
  }
}

function drawReplayDirect(d, limit, alphaValue) {
  let acts = d.actions || [];
  let used = 0;

  for (let a of acts) {
    if (used >= limit) break;

    if (a.type === "stroke") {
      let pts = a.points || [];

      if (pts.length === 1 && used < limit) {
        let p = mapPointToLayer(pts[0], d);
        drawLayerDot(a, p, alphaValue);
        used++;
      }

      for (let i = 1; i < pts.length; i++) {
        if (used >= limit) break;

        let p1 = mapPointToLayer(pts[i - 1], d);
        let p2 = mapPointToLayer(pts[i], d);

        if (a.tool === "eraser") {
          stroke(red(color(paperCol)), green(color(paperCol)), blue(color(paperCol)), 160);
          strokeWeight(max(2, a.size * 1.1));
        } else {
          let c = color(a.color || "#111111");
          c.setAlpha(255 * alphaValue);
          stroke(c);
          strokeWeight(max(0.8, a.size * 0.6));
        }

        strokeCap(ROUND);
        strokeJoin(ROUND);
        line(p1.x, p1.y, p2.x, p2.y);

        used++;
      }
    } else if (a.type === "fill") {
      if (used < limit) {
        let p = mapPointToLayer(a, d);
        let c = color(a.color);
        c.setAlpha(60);
        noStroke();
        fill(c);
        ellipse(p.x, p.y, 70, 70);
        used += 8;
      }
    }
  }
}

function drawLayerDot(action, p, alphaValue) {
  if (action.tool === "eraser") {
    noStroke();
    fill(red(color(paperCol)), green(color(paperCol)), blue(color(paperCol)), 160);
    circle(p.x, p.y, max(2, action.size * 1.2));
  } else {
    let c = color(action.color || "#111111");
    c.setAlpha(255 * alphaValue);
    noStroke();
    fill(c);
    circle(p.x, p.y, max(1, action.size * 0.8));
  }
}

function getDrawingBounds(d) {
  let originalW = d.canvasWidth || width;
  let originalH = d.canvasHeight || height;
  let originalHeaderH = d.headerHeight || headerH;

  let minX = originalW;
  let maxX = 0;
  let minY = originalH;
  let maxY = originalHeaderH;

  let hasPoint = false;
  let acts = d.actions || [];

  for (let a of acts) {
    if (a.type === "stroke") {
      let pts = a.points || [];

      for (let p of pts) {
        minX = min(minX, p.x);
        maxX = max(maxX, p.x);
        minY = min(minY, p.y);
        maxY = max(maxY, p.y);
        hasPoint = true;
      }
    } else if (a.type === "fill") {
      minX = min(minX, a.x);
      maxX = max(maxX, a.x);
      minY = min(minY, a.y);
      maxY = max(maxY, a.y);
      hasPoint = true;
    }
  }

  // 如果没有点，就退回整个绘画区域
  if (!hasPoint) {
    return {
      minX: 0,
      maxX: originalW,
      minY: originalHeaderH,
      maxY: originalH
    };
  }

  // 给图像周围留一点呼吸空间，不要贴边
  let padding = 45;

  minX = max(0, minX - padding);
  maxX = min(originalW, maxX + padding);
  minY = max(originalHeaderH, minY - padding);
  maxY = min(originalH, maxY + padding);

  // 防止只画了一个小点时尺寸太小
  if (maxX - minX < 80) {
    let cx = (minX + maxX) / 2;
    minX = max(0, cx - 40);
    maxX = min(originalW, cx + 40);
  }

  if (maxY - minY < 80) {
    let cy = (minY + maxY) / 2;
    minY = max(originalHeaderH, cy - 40);
    maxY = min(originalH, cy + 40);
  }

  return {
    minX: minX,
    maxX: maxX,
    minY: minY,
    maxY: maxY
  };
}

function mapPointToMini(p, d, miniW, miniH) {
  let bounds = getDrawingBounds(d);

  let contentW = bounds.maxX - bounds.minX;
  let contentH = bounds.maxY - bounds.minY;

  // 等比例缩放图像本身，不拉伸
  let scaleFactor = min(miniW / contentW, miniH / contentH);

  // 居中
  let offsetX = (miniW - contentW * scaleFactor) / 2;
  let offsetY = (miniH - contentH * scaleFactor) / 2;

  return {
    x: (p.x - bounds.minX) * scaleFactor + offsetX,
    y: (p.y - bounds.minY) * scaleFactor + offsetY
  };
}

function mapPointToLayer(p, d) {
  let originalW = d.canvasWidth || width;
  let originalH = d.canvasHeight || height;
  let originalHeaderH = d.headerHeight || headerH;

  return {
    x: map(p.x, 0, originalW, 0, width),
    y: map(p.y, originalHeaderH, originalH, 0, height - headerH)
  };
}

// -------------------------
// ARCHIVE UI
// -------------------------

function drawArchiveHeader(title, subtitle) {
  noStroke();
  fill(bgCol);
  rect(0, 0, width, archiveHeaderHeight());

  fill(inkCol);
  textAlign(LEFT);
  textStyle(NORMAL);
  textSize(isMobileScreen() ? 20 : 27);
  drawingContext.letterSpacing = isMobileScreen() ? "1px" : "2px";
  text(title.toUpperCase(), isMobileScreen() ? 22 : 50, isMobileScreen() ? 42 : 54);
  drawingContext.letterSpacing = "0px";

  textSize(isMobileScreen() ? 12 : 14);
  fill(mutedCol);
  text(subtitle, isMobileScreen() ? 22 : 50, isMobileScreen() ? 68 : 80);

  textAlign(RIGHT);
  textSize(11);
  fill(128);
  text(`${archive.length} drawings`, width - (isMobileScreen() ? 22 : 50), isMobileScreen() ? 68 : 80);
}

function drawArchiveFooter(msg) {
  noStroke();
  fill(bgCol);
  rect(0, height - 58, width, 58);

  fill(112);
  textSize(isMobileScreen() ? 11 : 12);
  textAlign(CENTER);
  text(msg, width / 2, height - 27);
}

function drawEmptyArchiveMessage() {
  fill(120);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("No drawings saved yet.", width / 2, archiveHeaderHeight() + 90);
}

function clipBelowHeader() {
  let top = archiveHeaderHeight();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, top, width, height - top - 58);
  drawingContext.clip();
}

function unclip() {
  drawingContext.restore();
}

function clipRect(x, y, w, h) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x, y, w, h);
  drawingContext.clip();
}

function archiveHeaderHeight() {
  return isMobileScreen() ? 130 : 124;
}

function getArchiveTaskTitle(key) {
  let index = Number(key);
  if (!Number.isFinite(index) || index < 0 || index >= archiveTaskTitles.length) {
    return "UNASSIGNED MEMORY — Remembered apple";
  }
  return archiveTaskTitles[index];
}

function formatArchiveTime(d) {
  let date = d.createdAt ? new Date(d.createdAt) : null;
  let dateText = date && !isNaN(date.getTime())
    ? `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : "undated";
  let duration = d.durationSeconds !== undefined ? ` / ${d.durationSeconds}s` : "";
  return `${dateText}${duration}`;
}

function drawWallHoverLabel(d, index, layout) {
  let localX = (mouseX - archivePan.x - layout.x) / layout.scale;
  let localY = (mouseY - archivePan.y - layout.y) / layout.scale;
  if (localX < 0 || localX > layout.miniW || localY < 0 || localY > layout.miniH) return;

  noStroke();
  fill(251, 250, 246, 238);
  rect(0, layout.miniH + 8, 118, 34, 2);
  fill(82);
  textAlign(LEFT);
  textSize(9);
  text(`#${index + 1}`, 8, layout.miniH + 21);
  text(getArchiveTaskTitle(d.promptIndex).split(" — ")[0], 8, layout.miniH + 33);
}

function shortenText(str, maxLen) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + "...";
}

// -------------------------
// EXPORT DATA
// -------------------------

function exportArchiveJSON() {
  if (archive.length === 0) {
    alert("No data to export.");
    return;
  }

  let data = JSON.stringify(archive, null, 2);
  let blob = new Blob([data], { type: "application/json" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "before-i-imagine-prompt-test-data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// -------------------------
// RESIZE
// -------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateHeaderHeight();

  let oldLayer = drawingLayer;
  drawingLayer = createGraphics(width, height);
  drawingLayer.pixelDensity(pd);
  drawingLayer.clear();
  drawingLayer.smooth();
  drawingLayer.image(oldLayer, 0, 0);

  layoutInterface();
  clearGridMiniCache();
  resetArchivePan();
  generateArchiveWallLayout();
  calculateMaxLayerUnits();
  generateLayerLayout();
  markStackDirty();
}
