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
let drawBackgroundApplesLayout = [];
let modalOpen = true;
let backgroundViewMode = "wall";
let backgroundLayoutMode = "float";
let selectedApple = null;
let selectedAppleIndex = -1;
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
    selectFirstAvailableStackPrompt();
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
    let y = drawLayout.toolbarY + 28;
    let x = drawLayout.toolbarX + 18;
    let gap = 8;
    let btnW = 68;

    colorPicker.position(x, y + 18);
    colorPicker.size(58, 30);
    sizeSlider.position(x + 96, y + 26);
    sizeSlider.size(128);

    let toolX = x + 252;
    brushBtn.position(toolX, y);
    bucketBtn.position(toolX + (btnW + gap), y);
    eraserBtn.position(toolX + (btnW + gap) * 2, y);

    let actionX = toolX + (btnW + gap) * 3 + 10;
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
  } else {
    let btnW = 68;
    brushBtn.size(btnW, 52);
    bucketBtn.size(btnW, 52);
    eraserBtn.size(btnW, 52);
    clearBtn.size(btnW, 52);
    submitBtn.size(btnW, 52);
    nextPromptBtn.size(btnW, 52);
    archiveBtn.size(btnW, 52);
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
  btn.size(mobile ? 72 : 68, mobile ? 34 : 52);
  btn.style("font-size", mobile ? "11px" : "12px");
  btn.style("height", mobile ? "34px" : "52px");
  btn.style("min-width", mobile ? "0" : "68px");
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
    if (modalOpen) {
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
    }

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
  let sidebarW = mobile ? 0 : getDrawSidebarWidth();

  if (mobile) {
    let margin = 18;
    let pageW = width - margin * 2;
    let titleY = 34;
    let cardY = 88;
    let cardH = 220;
    let drawY = cardY + cardH + 22;
    let toolbarH = 142;
    let footerH = 34;
    let toolbarY = height - toolbarH - footerH - 8;
    let drawH = max(180, toolbarY - drawY - 18);

    return {
      margin: margin,
      pageW: pageW,
      sidebarW: sidebarW,
      titleY: titleY,
      modalX: margin,
      modalY: cardY - 18,
      modalW: pageW,
      modalH: toolbarY + toolbarH - cardY + 36,
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

  let availableX = sidebarW;
  let availableW = width - sidebarW;
  let modalW = min(850, max(700, availableW - 160));
  modalW = min(modalW, availableW - 72);
  let modalPad = 18;
  let cardH = 154;
  let toolbarH = 96;
  let gap = 18;
  let desiredDrawH = constrain(height * 0.34, 250, 330);
  let modalH = modalPad * 2 + cardH + gap + desiredDrawH + gap + toolbarH;
  modalH = min(modalH, height - 120);
  let drawH = max(220, modalH - modalPad * 2 - cardH - toolbarH - gap * 2);
  let modalX = availableX + (availableW - modalW) / 2;
  let modalY = max(78, (height - modalH) / 2);
  let cardX = modalX + modalPad;
  let cardY = modalY + modalPad;
  let contentW = modalW - modalPad * 2;
  let drawY = cardY + cardH + gap;
  let toolbarY = drawY + drawH + gap;
  let footerH = 42;

  return {
    margin: modalPad,
    pageW: contentW,
    sidebarW: sidebarW,
    titleY: 0,
    modalX: modalX,
    modalY: modalY,
    modalW: modalW,
    modalH: modalH,
    cardX: cardX,
    cardY: cardY,
    cardW: contentW,
    cardH: cardH,
    drawX: cardX,
    drawY: drawY,
    drawW: contentW,
    drawH: drawH,
    toolbarX: cardX,
    toolbarY: toolbarY,
    toolbarW: contentW,
    toolbarH: toolbarH,
    footerY: height - footerH,
    footerH: footerH
  };
}

function drawDrawingPage() {
  drawImmersiveDrawingPage();
}

function drawImmersiveDrawingPage() {
  drawLayout = getDrawingLayout();
  let p = prompts[promptIndex];

  drawPaperBackground();
  drawFloatingArchiveApples();
  drawDrawPageSidebar();
  drawBackgroundViewSwitcher();

  if (modalOpen) {
    drawDrawingModalShadow();
    if (isMobileScreen()) drawDrawingTitle();
    drawPromptCard(p);
    drawDrawingSurface();

    clipRect(drawLayout.drawX, drawLayout.drawY, drawLayout.drawW, drawLayout.drawH);
    image(drawingLayer, 0, 0);
    unclip();

    drawToolbarPanel();
    drawDrawingModalClose();
    drawDrawingFooter();
  } else {
    drawReopenDrawingButton();
  }

  drawSelectedApplePopup();
}

function drawPaperBackground() {
  noStroke();
  fill(bgCol);
  rect(0, 0, width, height);
}

function getDrawSidebarWidth() {
  return constrain(width * 0.135, 190, 220);
}

function drawDrawingModalShadow() {
  if (isMobileScreen()) return;

  let x = drawLayout.modalX;
  let y = drawLayout.modalY;
  let w = drawLayout.modalW;
  let h = drawLayout.modalH;

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.16)";
  drawingContext.shadowBlur = 34;
  drawingContext.shadowOffsetY = 18;
  noStroke();
  fill(250, 247, 239, 226);
  rect(x, y, w, h, 10);
  drawingContext.restore();

  noFill();
  stroke(255, 255, 255, 125);
  strokeWeight(1);
  rect(x + 0.5, y + 0.5, w - 1, h - 1, 10);
}

function getBackgroundViewSwitcherRect() {
  let w = isMobileScreen() ? 210 : 300;
  let h = isMobileScreen() ? 40 : 52;
  let x = isMobileScreen() ? (width - w) / 2 : getDrawSidebarWidth() + (width - getDrawSidebarWidth() - w) / 2;
  let y = isMobileScreen() ? 20 : 28;

  return { x: x, y: y, w: w, h: h };
}

function drawBackgroundViewSwitcher() {
  if (isMobileScreen()) return;

  let r = getBackgroundViewSwitcherRect();

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.11)";
  drawingContext.shadowBlur = 18;
  drawingContext.shadowOffsetY = 8;
  noStroke();
  fill(251, 250, 246, 230);
  rect(r.x, r.y, r.w, r.h, r.h / 2);
  drawingContext.restore();

  noStroke();
  fill(mutedCol);
  textAlign(LEFT, CENTER);
  textSize(11);
  text("VIEW", r.x + 24, r.y + r.h / 2);

  drawSwitcherOption("wall", "●  WALL", r.x + 118, r.y + r.h / 2);

  stroke(156, 148, 137, 150);
  strokeWeight(1);
  line(r.x + 186, r.y + 15, r.x + 186, r.y + r.h - 15);

  drawSwitcherOption("slice", "◌  SLICE", r.x + 218, r.y + r.h / 2);
}

function drawSwitcherOption(mode, label, x, y) {
  noStroke();
  fill(backgroundViewMode === mode ? inkCol : mutedCol);
  textAlign(LEFT, CENTER);
  textSize(11);
  text(label, x, y);
}

function drawDrawingModalClose() {
  let r = getModalCloseRect();

  stroke(inkCol);
  strokeWeight(1.4);
  line(r.x + 4, r.y + 4, r.x + r.w - 4, r.y + r.h - 4);
  line(r.x + r.w - 4, r.y + 4, r.x + 4, r.y + r.h - 4);
}

function getModalCloseRect() {
  return {
    x: drawLayout.modalX + drawLayout.modalW - 42,
    y: drawLayout.modalY + 28,
    w: 18,
    h: 18
  };
}

function drawReopenDrawingButton() {
  let r = getReopenDrawingButtonRect();

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.12)";
  drawingContext.shadowBlur = 18;
  drawingContext.shadowOffsetY = 8;
  noStroke();
  fill(251, 250, 246, 235);
  rect(r.x, r.y, r.w, r.h, 4);
  drawingContext.restore();

  noStroke();
  fill(inkCol);
  textAlign(CENTER, CENTER);
  textSize(isMobileScreen() ? 12 : 13);
  text("Draw an apple", r.x + r.w / 2, r.y + r.h / 2);
}

function getReopenDrawingButtonRect() {
  let w = isMobileScreen() ? 140 : 150;
  let h = isMobileScreen() ? 40 : 44;
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  return {
    x: sidebarW + (width - sidebarW - w) / 2,
    y: isMobileScreen() ? 104 : 104,
    w: w,
    h: h
  };
}

function drawDrawPageSidebar() {
  if (isMobileScreen()) return;

  let w = getDrawSidebarWidth();

  noStroke();
  fill(251, 250, 246, 232);
  rect(0, 0, w, height);

  fill("#2470ff");
  textAlign(LEFT);
  textSize(14);
  drawingContext.letterSpacing = "2px";
  text("BEFORE I IMAGINE", 30, 42);
  drawingContext.letterSpacing = "0px";

  fill(mutedCol);
  textSize(10);
  text("A sensory drawing experiment", 30, 66);

  fill(inkCol);
  textSize(11);
  text("•  ARCHIVE WALL", 30, 132);
  textSize(28);
  text(String(archive.length), 30, 176);
  fill(mutedCol);
  textSize(11);
  text("Apples collected", 30, 198);

  drawSidebarSparkline(30, 236, w - 60, 24);

  fill(mutedCol);
  textSize(11);
  text("RECENT APPLES", 30, 302);
  drawSidebarRecentApples(30, 330, w - 60);

  stroke(226, 220, 210);
  strokeWeight(1);
  let aboutY = max(460, min(height - 226, 520));
  line(30, aboutY - 28, w - 30, aboutY - 28);

  noStroke();
  fill(inkCol);
  textSize(11);
  text("ABOUT", 30, aboutY);
  fill(70);
  textSize(11);
  textLeading(19);
  text("Draw from memory.\nNot from images.\nNot from search.\nJust what comes first.", 30, aboutY + 32);

  if (height > 690) {
    noFill();
    stroke(210, 204, 194);
    rect(30, height - 88, w - 60, 44, 2);
    noStroke();
    fill(74);
    textSize(10);
    text("ABOUT THE PROJECT  ›", 44, height - 61);
  }
}

function drawSidebarSparkline(x, y, w, h) {
  noFill();
  stroke(198, 196, 190);
  strokeWeight(1);
  beginShape();
  for (let i = 0; i < 28; i++) {
    let px = x + map(i, 0, 27, 0, w);
    let py = y + h * 0.62 + sin(i * 0.42) * 4 - map(i, 0, 27, 0, h * 0.55);
    vertex(px, py);
  }
  endShape();

  stroke("#2470ff");
  beginShape();
  for (let i = 17; i < 28; i++) {
    let px = x + map(i, 0, 27, 0, w);
    let py = y + h * 0.62 + sin(i * 0.42) * 4 - map(i, 0, 27, 0, h * 0.55);
    vertex(px, py);
  }
  endShape();

  noStroke();
  fill("#2470ff");
  circle(x + w, y + h * 0.08, 6);
}

function drawSidebarRecentApples(x, y, w) {
  let recent = archive.slice(-5).reverse();
  let rowH = 28;
  let maxItems = height < 760 ? 3 : 5;

  for (let i = 0; i < maxItems; i++) {
    let rowY = y + i * rowH;
    if (recent[i]) {
      push();
      translate(x, rowY - 10);
      drawStaticMini(recent[i], 20, 20);
      pop();
    } else {
      noFill();
      stroke(205, 199, 190);
      circle(x + 10, rowY, 16);
    }

    noStroke();
    fill(146);
    textAlign(LEFT);
    textSize(10);
    text(recent[i] ? formatRelativeArchiveTime(recent[i], i) : "waiting", x + 32, rowY + 4);
  }
}

function formatRelativeArchiveTime(d, index) {
  if (!d || !d.createdAt) return `${index + 1} apple`;

  let diffMinutes = floor((Date.now() - new Date(d.createdAt).getTime()) / 60000);
  if (!Number.isFinite(diffMinutes) || diffMinutes < 0) return "just now";
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  return `${floor(diffMinutes / 60)} hr ago`;
}

function generateDrawBackgroundApplesLayout() {
  drawBackgroundApplesLayout = [];
  if (archive.length === 0) return;

  let mobile = isMobileScreen();
  let sidebarW = mobile ? 0 : getDrawSidebarWidth();
  let count = archive.length;
  let recent = archive.slice(-count);
  let left = sidebarW + (mobile ? 18 : 34);
  let right = width - (mobile ? 18 : 34);
  let top = mobile ? 86 : 28;
  let bottom = height - (mobile ? 190 : 40);
  let cardW = mobile ? 62 : 86;
  let cardH = mobile ? 62 : 86;

  if (backgroundViewMode === "slice") {
    cardW = mobile ? 88 : 128;
    cardH = mobile ? 94 : 142;
  }

  if (backgroundLayoutMode === "grid") {
    let gapX = mobile ? 18 : 34;
    let gapY = mobile ? 18 : 32;
    let cols = max(1, floor((right - left) / (cardW + gapX)));
    let startX = left + ((right - left) - (cols * cardW + (cols - 1) * gapX)) / 2;

    for (let i = 0; i < recent.length; i++) {
      let col = i % cols;
      let row = floor(i / cols);
      drawBackgroundApplesLayout.push({
        archiveIndex: archive.indexOf(recent[i]),
        x: startX + col * (cardW + gapX) + cardW / 2,
        y: top + row * (cardH + gapY) + cardH / 2,
        cardW: cardW,
        cardH: cardH,
        size: backgroundViewMode === "slice" ? cardW * 0.7 : cardW,
        rotation: 0,
        phase: random(TWO_PI),
        speed: 0.00012,
        drift: 1.5,
        alpha: 0.62
      });
    }
    return;
  }

  for (let i = 0; i < recent.length; i++) {
    let colBias = i % 4;
    let x;

    if (!mobile && colBias === 0) {
      x = random(left, max(left + 40, drawLayout.modalX - 64));
    } else if (!mobile && colBias === 1) {
      x = random(min(right - 40, drawLayout.modalX + drawLayout.modalW + 64), right);
    } else {
      x = random(left, right);
    }

    drawBackgroundApplesLayout.push({
      archiveIndex: archive.indexOf(recent[i]),
      x: x,
      y: random(top, bottom),
      cardW: cardW,
      cardH: cardH,
      size: random(mobile ? 34 : 42, mobile ? 58 : 76),
      rotation: random(-0.18, 0.18),
      phase: random(TWO_PI),
      speed: random(0.00035, 0.00085),
      drift: random(4, 12),
      alpha: random(0.5, 0.82)
    });
  }
}

function drawFloatingArchiveApples() {
  if (archive.length === 0) return;
  if (drawBackgroundApplesLayout.length === 0) generateDrawBackgroundApplesLayout();

  for (let item of drawBackgroundApplesLayout) {
    let d = archive[item.archiveIndex];
    if (!d) continue;

    let t = millis() * item.speed + item.phase;
    let floatX = sin(t * 0.8) * item.drift;
    let floatY = cos(t) * item.drift;
    let s = item.size;

    push();
    translate(item.x + floatX, item.y + floatY);
    rotate(item.rotation + sin(t * 1.4) * 0.025);

    if (backgroundViewMode === "slice") {
      drawFloatingSliceCard(d, item);
    } else {
      drawFloatingWallCard(d, item);
    }

    if (!isMobileScreen() && item.archiveIndex % 5 === 0) {
      noStroke();
      fill(120, 112, 104, 105);
      textAlign(LEFT);
      textSize(9);
      if (backgroundViewMode === "wall") {
        text(`#${item.archiveIndex + 1}`, item.size * 0.44, item.size * 0.18);
      } else {
        text(`#${item.archiveIndex + 1}`, item.cardW * 0.25, item.cardH * 0.34);
      }
    }

    pop();
  }
}

function drawFloatingWallCard(d, item) {
  drawingContext.save();
  drawingContext.shadowColor = "rgba(50, 42, 32, 0.09)";
  drawingContext.shadowBlur = 10;
  drawingContext.shadowOffsetY = 7;
  push();
  translate(-item.size / 2, -item.size / 2);
  tint(255, 255 * min(0.92, item.alpha + 0.12));
  drawStaticMini(d, item.size, item.size);
  noTint();
  pop();
  drawingContext.restore();

  drawWallMotionMarks(item.size);
}

function drawWallMotionMarks(s) {
  if (backgroundLayoutMode === "grid") return;

  noFill();
  stroke(78, 72, 66, 56);
  strokeWeight(1);
  let left = -s * 0.58;
  let right = s * 0.58;
  let y = -s * 0.1;
  arc(left, y, 10, 20, HALF_PI, HALF_PI + PI * 0.65);
  arc(right, y, 10, 20, -HALF_PI - PI * 0.65, -HALF_PI);
}

function drawFloatingSliceCard(d, item) {
  let w = item.cardW;
  let h = item.cardH;

  drawingContext.save();
  drawingContext.shadowColor = "rgba(50, 42, 32, 0.13)";
  drawingContext.shadowBlur = 18;
  drawingContext.shadowOffsetY = 12;
  noStroke();
  fill(255, 253, 248, 86);
  rect(-w / 2, -h / 2, w, h, 8);
  drawingContext.restore();

  stroke(255, 255, 255, 78);
  strokeWeight(1);
  noFill();
  rect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 8);

  push();
  translate(-item.size / 2, -item.size / 2);
  tint(255, 255 * item.alpha);
  drawStaticMini(d, item.size, item.size);
  noTint();
  pop();
}

function drawSelectedApplePopup() {
  if (page !== "draw" || !selectedApple) return;

  let r = getApplePopupRect();
  let close = getApplePopupCloseRect();

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.14)";
  drawingContext.shadowBlur = 24;
  drawingContext.shadowOffsetY = 14;
  noStroke();
  fill(251, 250, 246, 232);
  rect(r.x, r.y, r.w, r.h, 8);
  drawingContext.restore();

  noFill();
  stroke(255, 255, 255, 120);
  rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 8);

  noStroke();
  fill(inkCol);
  textAlign(LEFT);
  textSize(13);
  text(`#${selectedAppleIndex + 1}`, r.x + 22, r.y + 30);

  fill(72);
  textSize(10);
  text(formatArchiveTime(selectedApple), r.x + 22, r.y + 50);

  let duration = selectedApple.durationSeconds !== undefined ? `${selectedApple.durationSeconds}s` : "";
  text(duration, r.x + 22, r.y + 66);

  stroke(inkCol);
  strokeWeight(1.2);
  line(close.x + 2, close.y + 2, close.x + close.w - 2, close.y + close.h - 2);
  line(close.x + close.w - 2, close.y + 2, close.x + 2, close.y + close.h - 2);

  let thumbX = r.x + 22;
  let thumbY = r.y + 88;
  let thumbW = r.w - 44;
  let thumbH = min(190, r.h * 0.34);

  fill(paperCol);
  stroke(226, 220, 210);
  rect(thumbX, thumbY, thumbW, thumbH, 4);

  push();
  translate(thumbX + 16, thumbY + 14);
  drawStaticMini(selectedApple, thumbW - 32, thumbH - 28);
  pop();

  let promptKey = getDrawingPromptIndex(selectedApple);
  let taskText = prompts[promptKey] ? prompts[promptKey].task : "TASK";
  let titleText = prompts[promptKey] ? prompts[promptKey].shortTitle : "";
  let textY = thumbY + thumbH + 36;

  noStroke();
  fill(inkCol);
  textSize(11);
  text(taskText, r.x + 22, textY);
  fill(70);
  textSize(10);
  text(titleText, r.x + 22, textY + 24, r.w - 44);

  let extraY = textY + 62;
  if (selectedApple.match !== undefined) {
    fill(inkCol);
    textSize(10);
    text("MATCH", r.x + 22, extraY);
    stroke(205, 198, 188);
    line(r.x + 22, extraY + 20, r.x + r.w - 22, extraY + 20);
    stroke("#2470ff");
    let mx = map(Number(selectedApple.match), 0, 1, r.x + 22, r.x + r.w - 22);
    line(r.x + 22, extraY + 20, mx, extraY + 20);
    noStroke();
    fill("#2470ff");
    circle(mx, extraY + 20, 8);
    extraY += 56;
  }

  if (selectedApple.notes) {
    fill(inkCol);
    textSize(10);
    text("NOTES", r.x + 22, extraY);
    fill(70);
    textSize(10);
    text(selectedApple.notes, r.x + 22, extraY + 26, r.w - 44, 70);
  }
}

function getApplePopupRect() {
  let w = isMobileScreen() ? min(width - 36, 310) : 300;
  let h = isMobileScreen() ? min(height - 120, 440) : 460;
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let x = isMobileScreen() ? (width - w) / 2 : width - w - 42;
  let y = isMobileScreen() ? 96 : max(126, (height - h) / 2);

  if (!isMobileScreen() && modalOpen && x < drawLayout.modalX + drawLayout.modalW + 24) {
    x = max(sidebarW + 24, drawLayout.modalX + drawLayout.modalW + 24);
    if (x + w > width - 24) x = width - w - 24;
  }

  return { x: x, y: y, w: w, h: h };
}

function getApplePopupCloseRect() {
  let r = getApplePopupRect();
  return {
    x: r.x + r.w - 34,
    y: r.y + 28,
    w: 18,
    h: 18
  };
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
    let iconColW = min(210, w * 0.26);
    let dividerX = x + iconColW;
    let textX = dividerX + 34;
    let textW = w - iconColW - 190;

    text(p.task, x + iconColW / 2, y + 36);

    stroke(lineCol);
    strokeWeight(1);
    line(dividerX, y + 24, dividerX, y + h - 24);

    noStroke();
    drawEyeIcon(x + iconColW / 2, y + 84);

    noStroke();
    textStyle(NORMAL);
    textAlign(LEFT);

    let baseY = y + 34;

    fill(inkCol);
    textSize(13);
    textLeading(18);
    text(p.en, textX, baseY, textW, 44);

    fill(45);
    textSize(11.5);
    textLeading(17);
    text(p.cn, textX, baseY + 44, textW, 30);

    fill(105);
    textSize(10.5);
    textLeading(15);
    text(p.noteEn, textX, baseY + 82, textW, 24);
    text(p.noteCn, textX, baseY + 106, textW, 24);
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
  text("Colour", x + (isMobileScreen() ? 6 : 18), y + (isMobileScreen() ? 14 : 24));
  text("Thickness", x + (isMobileScreen() ? 70 : 96), y + (isMobileScreen() ? 14 : 24));

  if (!isMobileScreen()) {
    stroke(lineCol);
    strokeWeight(1);
    line(x + 480, y + 20, x + 480, y + h - 20);
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
    let cx = drawLayout.modalX + drawLayout.modalW / 2;
    text("Draw anywhere in the area above the prompt. Submit when finished.", cx, drawLayout.footerY + 18);
    text(`请在提示区域上方的画布中作画。完成后提交。   |   ${archive.length} drawings saved   已保存 ${archive.length} 张`, cx, drawLayout.footerY + 38);
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

    if (page === "draw") {
      let handled = handlePointerPressed(x, y);
      return !handled;
    }

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
    return true;
  }

  if (page === "draw" && handleDrawPageClick(x, y)) {
    return true;
  }

  if (page === "draw" && pointInsideUndoButton(x, y)) {
    return true;
  }

  if (page === "draw" && modalOpen && pointInsideDrawingArea(x, y)) {
    if (currentTool === "bucket") {
      bucketFillAt(x, y);
      return true;
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
      return true;
    }
  } else if (archiveCanPanAt(x, y)) {
    isArchivePanning = true;
    lastPanPoint = { x: x, y: y };
    return true;
  }

  return false;
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

function handleDrawPageClick(x, y) {
  if (isClickOnApplePopupClose(x, y)) {
    selectedApple = null;
    selectedAppleIndex = -1;
    return true;
  }

  if (isClickOnApplePopup(x, y)) {
    return true;
  }

  let switchMode = getViewSwitcherHit(x, y);
  if (switchMode) {
    if (backgroundViewMode !== switchMode) {
      backgroundViewMode = switchMode;
      selectedApple = null;
      selectedAppleIndex = -1;
      generateDrawBackgroundApplesLayout();
    }
    return true;
  }

  if (modalOpen && isClickOnModalClose(x, y)) {
    modalOpen = false;
    currentAction = null;
    layoutInterface();
    return true;
  }

  if (!modalOpen && isClickOnReopenDrawingButton(x, y)) {
    modalOpen = true;
    layoutInterface();
    return true;
  }

  if (isClickOnSidebar(x, y) || isClickOnModal(x, y) || isClickOnDrawingDomControl(x, y)) {
    return false;
  }

  let cardIndex = getAppleCardAt(x, y);
  if (cardIndex >= 0) {
    selectedAppleIndex = cardIndex;
    selectedApple = archive[cardIndex] || null;
    return true;
  }

  return false;
}

function toggleBackgroundLayout() {
  backgroundLayoutMode = backgroundLayoutMode === "float" ? "grid" : "float";
  generateDrawBackgroundApplesLayout();
}

function getViewSwitcherHit(x, y) {
  if (isMobileScreen()) return null;
  let r = getBackgroundViewSwitcherRect();
  if (!pointInsideRect(x, y, r)) return null;

  if (x < r.x + r.w * 0.62) return "wall";
  return "slice";
}

function isClickOnModal(x, y) {
  if (!modalOpen) return false;
  return pointInsideRect(x, y, {
    x: drawLayout.modalX,
    y: drawLayout.modalY,
    w: drawLayout.modalW,
    h: drawLayout.modalH
  });
}

function isClickOnSidebar(x, y) {
  return !isMobileScreen() && x <= getDrawSidebarWidth();
}

function isClickOnViewSwitcher(x, y) {
  return !isMobileScreen() && pointInsideRect(x, y, getBackgroundViewSwitcherRect());
}

function isClickOnModalClose(x, y) {
  return modalOpen && pointInsideRect(x, y, getModalCloseRect());
}

function isClickOnReopenDrawingButton(x, y) {
  return !modalOpen && pointInsideRect(x, y, getReopenDrawingButtonRect());
}

function isClickOnApplePopup(x, y) {
  return selectedApple && pointInsideRect(x, y, getApplePopupRect());
}

function isClickOnApplePopupClose(x, y) {
  return selectedApple && pointInsideRect(x, y, getApplePopupCloseRect());
}

function getAppleCardAt(x, y) {
  if (archive.length === 0) return -1;

  for (let i = drawBackgroundApplesLayout.length - 1; i >= 0; i--) {
    let item = drawBackgroundApplesLayout[i];
    let t = millis() * item.speed + item.phase;
    let cx = item.x + sin(t * 0.8) * item.drift;
    let cy = item.y + cos(t) * item.drift;
    let hitW = item.cardW || item.size;
    let hitH = item.cardH || item.size;

    if (
      x >= cx - hitW / 2 &&
      x <= cx + hitW / 2 &&
      y >= cy - hitH / 2 &&
      y <= cy + hitH / 2
    ) {
      return item.archiveIndex;
    }
  }

  return -1;
}

function isClickOnDrawingDomControl(x, y) {
  if (!modalOpen) return false;
  let controls = [colorPicker, sizeSlider, brushBtn, bucketBtn, eraserBtn, undoBtn, clearBtn, submitBtn, nextPromptBtn, archiveBtn];

  for (let control of controls) {
    if (!control) continue;
    let bx = control.x || 0;
    let by = control.y || 0;
    let bw = control.width || 0;
    let bh = control.height || 0;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return true;
  }

  return false;
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
  if (!modalOpen) return false;
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
  generateDrawBackgroundApplesLayout();
  if (page === "stack") selectFirstAvailableStackPrompt();
  markStackDirty();
}

function normalizeDrawingData(d) {
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch (error) {
      return null;
    }
  }

  if (!d || typeof d !== "object") return null;

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
  if (d.promptIndex === null || d.promptIndex === "" || !Number.isFinite(Number(d.promptIndex))) {
    let inferredPromptIndex = inferDrawingPromptIndex(d);
    if (inferredPromptIndex !== null) d.promptIndex = inferredPromptIndex;
  }

  return d;
}

function inferDrawingPromptIndex(d) {
  let text = [
    d.promptEN,
    d.promptCN,
    d.prompt,
    d.task,
    d.category
  ].filter(Boolean).join(" ").toLowerCase();

  for (let i = 0; i < prompts.length; i++) {
    if (
      text.includes(prompts[i].en.toLowerCase()) ||
      text.includes(prompts[i].cn) ||
      text.includes(prompts[i].task.toLowerCase())
    ) {
      return i;
    }
  }

  if (text.includes("touch") || text.includes("hand")) return 1;
  if (text.includes("taste") || text.includes("mouth")) return 2;
  if (text.includes("imperfect") || text.includes("not perfect")) return 3;
  if (text.includes("default") || text.includes("first apple")) return 0;

  return null;
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

function getDrawingPromptIndex(drawing) {
  let rawIndex = drawing && drawing.promptIndex;
  if (rawIndex !== null && rawIndex !== "") {
    let directIndex = Number(rawIndex);
    if (Number.isFinite(directIndex) && directIndex >= 0 && directIndex < prompts.length) {
      return directIndex;
    }
  }

  return inferDrawingPromptIndex(drawing || {});
}

function getStackCategoryCounts() {
  let counts = new Array(prompts.length).fill(0);

  for (let drawing of archive) {
    let index = getDrawingPromptIndex(drawing);
    if (index !== null) counts[index]++;
  }

  return counts;
}

function selectFirstAvailableStackPrompt() {
  let counts = getStackCategoryCounts();
  if (counts[stackPromptIndex] > 0) return;

  let firstAvailable = counts.findIndex(count => count > 0);
  if (firstAvailable >= 0) stackPromptIndex = firstAvailable;
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
  let categoryCounts = getStackCategoryCounts();

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
    text(
      `${categoryLabels[item.value]} ${categoryCounts[item.value]}`,
      item.x + item.w / 2,
      item.y + item.h / 2 + 1
    );
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
    .filter(d => getDrawingPromptIndex(d) === stackPromptIndex)
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

    stackBuffer.drawingContext.save();
    stackBuffer.drawingContext.globalAlpha = opacity;
    stackBuffer.image(drawingBuffer, 0, 0);
    stackBuffer.drawingContext.restore();
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
  generateDrawBackgroundApplesLayout();
  markStackDirty();
}
