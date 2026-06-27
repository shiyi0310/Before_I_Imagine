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
let promptFlowSaving = false;
let lastUndoTime = 0;

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
const maxThumbCacheBuildsPerFrame = 4;
let modalOpen = true;
let mobileArchiveReady = false;
let backgroundViewMode = "wall";
let backgroundLayoutMode = "float";
let selectedApple = null;
let selectedAppleIndex = -1;
let selectedAppleReplayStartedAt = 0;
let archiveTransition = 0;
let archiveTargetTransition = 0;
let archiveRowPan = [0, 0, 0, 0];
let archiveRowDragging = false;
let archiveRowDragIndex = -1;
let archiveRowLastX = 0;
let archiveRowLastMoveTime = 0;
let archiveRowPressPoint = { x: 0, y: 0 };
let archiveRowDragDistance = 0;
let archiveRowVelocity = [0, 0, 0, 0];
let archiveScrollModeActive = false;
let layerReplayIndex = 0;
let maxLayerUnits = 0;
let stackBuffer = null;
let stackPromptIndex = 0;
let stackCountMode = 30;
let stackDirty = true;
let stackRenderedCount = 0;
let gridMiniCache = {};
let previewImageCache = {};
let imageURLCache = {};
let archivePan = { x: 0, y: 0 };
let archiveSlicePanX = 0;
let archiveSliceDragging = false;
let archiveSliceLastX = 0;
let slicePromptIndex = 0;
let mobileArchivePressPoint = { x: 0, y: 0 };
let mobileArchiveDragDistance = 0;
let wallCamera = { x: 0, y: 0, zoom: 1 };
let wallMinZoom = 0.55;
let wallMaxZoom = 2.6;
let isWallPanning = false;
let lastWallPanPoint = { x: 0, y: 0 };
let wallPressPoint = { x: 0, y: 0 };
let wallDragDistance = 0;
let isArchivePanning = false;
let lastPanPoint = { x: 0, y: 0 };

let pd = 1;
let mainCanvas;

function setup() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
  document.body.style.touchAction = "none";
  document.body.style.fontFamily = interfaceFont;
  document.body.style.fontWeight = "400";
  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";

  pd = min(displayDensity(), 2);
  pixelDensity(pd);

  mainCanvas = createCanvas(windowWidth, windowHeight);
  if (mainCanvas && mainCanvas.elt) {
    mainCanvas.elt.style.userSelect = "none";
    mainCanvas.elt.style.position = "relative";
    mainCanvas.elt.style.zIndex = "1";
    mainCanvas.elt.addEventListener("dragstart", event => event.preventDefault());
  }
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
  updateMobileArchiveScrollMode();
  updateArchiveRowInertia();
  archiveTargetTransition = (!modalOpen && backgroundViewMode === "archive") ? 1 : 0;
  archiveTransition = lerp(archiveTransition, archiveTargetTransition, 0.06);

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
  colorPicker.style("z-index", "120");
  sizeSlider.style("z-index", "120");
  colorPicker.style("position", "absolute");
  sizeSlider.style("position", "absolute");
  colorPicker.style("touch-action", "manipulation");
  sizeSlider.style("touch-action", "manipulation");

  brushBtn = createButton("Brush<br>画笔");
  brushBtn.mousePressed(() => currentTool = "brush");

  bucketBtn = createButton("Fill<br>填色");
  bucketBtn.mousePressed(() => currentTool = "bucket");

  eraserBtn = createButton("Eraser<br>橡皮擦");
  eraserBtn.mousePressed(() => currentTool = "eraser");

  undoBtn = createButton("Undo<br>撤回");
  undoBtn.addClass("undo-button");
  undoBtn.mousePressed(handleUndoClick);
  undoBtn.elt.addEventListener("touchend", handleUndoClick, { passive: false });
  undoBtn.elt.addEventListener("pointerup", handleUndoClick);

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
    let actionBtnW = (innerW - gap * 2) / 3;

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
    archiveBtn.position(-9999, -9999);

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
    let toolBtnW = 86;
    let clearBtnW = 78;
    let nextBtnW = 132;

    colorPicker.position(x, y + 18);
    colorPicker.size(58, 30);
    sizeSlider.position(x + 96, y + 26);
    sizeSlider.size(128);

    let toolX = x + 252;
    brushBtn.position(toolX, y);
    bucketBtn.position(toolX + (toolBtnW + gap), y);
    eraserBtn.position(toolX + (toolBtnW + gap) * 2, y);

    let actionX = toolX + (toolBtnW + gap) * 3 + 10;
    clearBtn.position(actionX, y);
    submitBtn.position(-9999, -9999);
    nextPromptBtn.position(actionX + clearBtnW + gap, y);
    archiveBtn.position(-9999, -9999);
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
    let actionBtnW = (innerW - gap * 2) / 3;

    brushBtn.size(toolBtnW, 34);
    bucketBtn.size(toolBtnW, 34);
    eraserBtn.size(toolBtnW, 34);
    undoBtn.size(56, 32);
    clearBtn.size(actionBtnW, 34);
    submitBtn.size(actionBtnW, 34);
    nextPromptBtn.size(actionBtnW, 34);
    archiveBtn.size(1, 1);
  } else {
    setDesktopButtonAutoSize(brushBtn, 78);
    setDesktopButtonAutoSize(bucketBtn, 78);
    setDesktopButtonAutoSize(eraserBtn, 82);
    setDesktopButtonAutoSize(clearBtn, 70);
    submitBtn.size(1, 1);
    setDesktopButtonAutoSize(nextPromptBtn, 122, "10px 16px");
    archiveBtn.size(1, 1);
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
  btn.style("position", "absolute");
  btn.style("z-index", "120");
  btn.style("pointer-events", "auto");
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

function setDesktopButtonAutoSize(btn, minW, padding = "8px 14px") {
  btn.style("display", "inline-flex");
  btn.style("align-items", "center");
  btn.style("justify-content", "center");
  btn.style("width", "auto");
  btn.style("height", "auto");
  btn.style("min-width", `${minW}px`);
  btn.style("min-height", "52px");
  btn.style("padding", padding);
  btn.style("box-sizing", "border-box");
  btn.style("white-space", "nowrap");
  btn.style("line-height", "1.15");
  btn.style("flex", "0 0 auto");
}

function sizeArchiveButton(btn) {
  if (isMobileScreen()) {
    btn.size(54, 28);
    btn.style("height", "28px");
    btn.style("min-width", "0");
    btn.style("padding", "3px 8px");
  } else {
    btn.style("width", "auto");
    btn.style("height", "auto");
    btn.style("min-width", "58px");
    btn.style("min-height", "30px");
    btn.style("padding", "5px 10px");
  }
  btn.style("font-size", "11px");
  btn.style("line-height", "1");
  btn.style("border", "1px solid rgba(30, 28, 25, 0.32)");
  btn.style("background", "rgba(251, 250, 246, 0.5)");
  btn.style("color", "#4d4943");
}

function sizeUndoButton(btn) {
  let mobile = isMobileScreen();
  if (mobile) {
    btn.size(56, 32);
    btn.style("height", "32px");
    btn.style("min-width", "0");
    btn.style("padding", "2px 4px");
  } else {
    btn.style("width", "auto");
    btn.style("height", "auto");
    btn.style("min-width", "64px");
    btn.style("min-height", "36px");
    btn.style("padding", "4px 9px");
  }
  btn.style("font-size", mobile ? "10px" : "12px");
  btn.style("line-height", "1.05");
  btn.style("border", "1px solid rgba(43, 41, 38, 0.45)");
  btn.style("background", "rgba(251, 250, 246, 0.72)");
  btn.style("color", "#2b2926");
  btn.style("z-index", "220");
  btn.style("pointer-events", "auto");
  btn.style("touch-action", "manipulation");
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

function updatePromptFlowButtonLabel() {
  if (!nextPromptBtn) return;
  nextPromptBtn.html(promptIndex >= prompts.length - 1 ? "Finish<br>完成" : "Next Prompt<br>下一题");
}

function updateButtonVisibility() {
  updatePromptFlowButtonLabel();

  if (page === "draw") {
    if (modalOpen) {
      colorPicker.show();
      sizeSlider.show();

      brushBtn.show();
      bucketBtn.show();
      eraserBtn.show();
      undoBtn.show();

      clearBtn.show();
      submitBtn.hide();
      nextPromptBtn.show();
      archiveBtn.hide();
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

    backBtn.hide();
    gridBtn.hide();
    wallBtn.hide();
    layerBtn.hide();
    stackBtn.hide();
    exportBtn.hide();
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
    let cardH = 250;
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
  if (!isMobileScreen()) {
    if (backgroundViewMode === "archive") {
      drawMemoryArchiveView();
      drawFloatingArchiveApples();
    } else {
      drawFloatingArchiveApples();
    }
    drawDrawPageSidebar();
    drawBackgroundViewSwitcher();
  } else if (mobileArchiveReady && !modalOpen) {
    if (backgroundViewMode === "archive") {
      drawMobileArchiveView();
    } else {
      drawFloatingArchiveApples();
    }
    drawBackgroundViewSwitcher();
  }

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
  } else if (backgroundViewMode !== "slice") {
    drawReopenDrawingButton();
  }

  if (!modalOpen && backgroundViewMode === "archive") {
    drawSelectedApplePopup();
  }

}

function drawPaperBackground() {
  noStroke();
  fill(bgCol);
  rect(0, 0, width, height);
}

function getDrawSidebarWidth() {
  return constrain(width * 0.135, 190, 220);
}

function getBackgroundThumbSize() {
  return isMobileScreen() ? 72 : 96;
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
  let w = isMobileScreen() ? min(width - 32, 300) : 420;
  let h = isMobileScreen() ? 40 : 52;
  let x = isMobileScreen() ? (width - w) / 2 : getDrawSidebarWidth() + (width - getDrawSidebarWidth() - w) / 2;
  let y = isMobileScreen() ? 20 : 28;

  return { x: x, y: y, w: w, h: h };
}

function drawBackgroundViewSwitcher() {
  let r = getBackgroundViewSwitcherRect();

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.11)";
  drawingContext.shadowBlur = 18;
  drawingContext.shadowOffsetY = 8;
  noStroke();
  fill(251, 250, 246, 230);
  rect(r.x, r.y, r.w, r.h, r.h / 2);
  drawingContext.restore();

  let options = getTopToolbarOptions(r);
  for (let i = 0; i < options.length; i++) {
    drawSwitcherOption(options[i].mode, options[i].label, options[i].x, r.y + r.h / 2);
    if (i < options.length - 1) {
      stroke(156, 148, 137, 110);
      strokeWeight(1);
      let sepX = options[i].x + options[i].w + 10;
      line(sepX, r.y + 15, sepX, r.y + r.h - 15);
    }
  }
}

function drawSwitcherOption(mode, label, x, y) {
  let active = getTopToolbarActiveMode() === mode;
  noStroke();
  fill(active ? inkCol : mutedCol);
  textAlign(LEFT, CENTER);
  textSize(11);
  text(`${active ? "●" : "○"}  ${label}`, x, y);
}

function getTopToolbarActiveMode() {
  return modalOpen ? "draw" : backgroundViewMode;
}

function getTopToolbarOptions(r) {
  let labels = isMobileScreen() ? [
    { mode: "draw", label: "DRAW", w: 64 },
    { mode: "wall", label: "WALL", w: 64 },
    { mode: "archive", label: "ARCHIVE", w: 88 }
  ] : [
    { mode: "draw", label: "DRAW", w: 72 },
    { mode: "archive", label: "ARCHIVE", w: 100 },
    { mode: "wall", label: "WALL", w: 76 },
    { mode: "slice", label: "SLICE", w: 76 }
  ];
  let x = r.x + (isMobileScreen() ? 18 : 28);

  for (let item of labels) {
    item.x = x;
    x += item.w + 22;
  }

  return labels;
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
  if (backgroundViewMode === "slice") return;

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
  text("•  ARCHIVE", 30, 132);
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
  text("Draw from memory.\nNot from images.\nNot from search.\nJust what comes first.", 30, aboutY + 44);

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
  let count = mobile ? min(archive.length, 12) : archive.length;
  let recent = archive.slice(-count);
  let archiveStartIndex = archive.length - recent.length;
  let left = sidebarW + (mobile ? 18 : 34);
  let right = width - (mobile ? 18 : 34);
  let top = mobile ? 86 : 28;
  let bottom = height - (mobile ? 190 : 40);
  let cardW = mobile ? 62 : 86;
  let cardH = mobile ? 62 : 86;
  let archiveCardW = mobile ? 88 : 122;
  let archiveCardH = mobile ? 124 : 166;
  let archiveStartX = sidebarW + (mobile ? 56 : 190);
  let archiveTop = getArchiveRowsTop();
  let archiveRowGap = getArchiveRowGap();
  let archiveStepX = mobile ? 58 : 74;
  let rowSeen = [0, 0, 0, 0];

  if (backgroundViewMode === "slice") {
    cardW = mobile ? 88 : 128;
    cardH = mobile ? 94 : 142;
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

    let scatterY = random(top, bottom);
    let scatterRotation = random(-0.18, 0.18);
    let d = recent[i];
    let rowIndex = getDrawingPromptIndex(d);
    if (rowIndex === null || rowIndex < 0 || rowIndex > 3) rowIndex = 0;
    let rowCol = rowSeen[rowIndex]++;
    let archiveRotation = radians(((rowCol % 5) - 2) * 1.8);

    drawBackgroundApplesLayout.push({
      archiveIndex: archiveStartIndex + i,
      x: x,
      y: scatterY,
      scatterX: x,
      scatterY: scatterY,
      scatterRotation: scatterRotation,
      archiveX: archiveStartX + rowCol * archiveStepX,
      archiveY: archiveTop + rowIndex * archiveRowGap,
      archiveRotation: archiveRotation,
      archiveW: archiveCardW,
      archiveH: archiveCardH,
      rowIndex: rowIndex,
      rowLabel: getArchiveRowLabel(rowIndex),
      lift: 0,
      cardW: cardW,
      cardH: cardH,
      size: random(mobile ? 34 : 42, mobile ? 58 : 76),
      rotation: scatterRotation,
      phase: random(TWO_PI),
      speed: random(0.00035, 0.00085),
      drift: random(4, 12),
      alpha: random(0.5, 0.82)
    });
  }
}

function drawFloatingArchiveApples() {
  if (isMobileScreen() && (!mobileArchiveReady || modalOpen)) return;
  if (archive.length === 0) return;
  if (drawBackgroundApplesLayout.length === 0) generateDrawBackgroundApplesLayout();

  let mobile = isMobileScreen();

  if (backgroundViewMode === "slice") {
    drawSlicePromptComposite();
    return;
  }

  for (let item of drawBackgroundApplesLayout) {
    let d = archive[item.archiveIndex];
    if (!d) continue;
    if (!item.cachedThumb) {
      let preview = getPreviewImage(d);
      if (preview) {
        item.cachedThumb = preview;
      }
    }

    let isArchiveMode = backgroundViewMode === "archive";
    let t = millis() * item.speed + item.phase;
    let floatX = mobile ? sin(t * 0.6) * item.drift * 0.35 : sin(t * 0.8) * item.drift;
    let floatY = mobile ? cos(t * 0.6) * item.drift * 0.35 : cos(t) * item.drift;
    let scatterX = item.scatterX + (isArchiveMode ? 0 : floatX);
    let scatterY = item.scatterY + (isArchiveMode ? 0 : floatY);
    let rowPan = archiveRowPan[item.rowIndex] || 0;
    let archiveX = item.archiveX + rowPan;
    let archiveY = item.archiveY;
    let drawX = lerp(scatterX, archiveX, archiveTransition);
    let drawY = lerp(scatterY, archiveY, archiveTransition);
    let drawRotation = lerp(item.scatterRotation, item.archiveRotation, archiveTransition);
    let drawSize = lerp(item.size, item.archiveW, archiveTransition);
    let cardH = lerp(item.size, item.archiveH, archiveTransition);
    let hovered = isArchiveMode && archiveCardHitTest(mouseX, mouseY, item, drawX, drawY, drawSize, cardH);
    item.lift = lerp(item.lift || 0, hovered ? -22 : 0, 0.16);

    push();
    translate(drawX, drawY + item.lift);
    rotate(drawRotation + (mobile || isArchiveMode ? 0 : sin(t * 1.4) * 0.025));

    if (isArchiveMode) {
      drawArchiveTarotCard(d, item, drawSize, cardH, hovered);
    } else if (backgroundViewMode === "slice") {
      drawFloatingSliceCard(d, item);
    } else {
      drawFloatingWallCard(d, item);
    }

    if (!isMobileScreen() && !isArchiveMode && item.archiveIndex % 5 === 0) {
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

function getSlicePromptTabs() {
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let labels = ["DEFAULT", "TOUCH", "TASTE", "IMPERFECT"];
  let gap = 7;
  let tabW = isMobileScreen() ? 68 : 88;
  let tabH = 28;
  let totalW = labels.length * tabW + (labels.length - 1) * gap;
  let centerX = sidebarW + (width - sidebarW) / 2;
  let startX = centerX - totalW / 2;
  let y = isMobileScreen() ? 78 : 104;

  return labels.map((label, index) => ({
    index: index,
    label: label,
    x: startX + index * (tabW + gap),
    y: y,
    w: tabW,
    h: tabH
  }));
}

function getSlicePromptTabAt(x, y) {
  if (modalOpen || backgroundViewMode !== "slice") return -1;
  for (let tab of getSlicePromptTabs()) {
    if (pointInsideRect(x, y, tab)) return tab.index;
  }
  return -1;
}

function drawSlicePromptComposite() {
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let contentX = sidebarW;
  let contentW = width - sidebarW;
  let tabs = getSlicePromptTabs();
  let selectedItems = drawBackgroundApplesLayout.filter((item) => {
    let d = archive[item.archiveIndex];
    return d && getDrawingPromptIndex(d) === slicePromptIndex;
  });

  for (let tab of tabs) {
    let active = tab.index === slicePromptIndex;
    noStroke();
    fill(active ? 43 : 251, active ? 40 : 249, active ? 36 : 244, active ? 225 : 205);
    rect(tab.x, tab.y, tab.w, tab.h, 14);
    if (!active) {
      noFill();
      stroke(166, 157, 145, 125);
      strokeWeight(1);
      rect(tab.x + 0.5, tab.y + 0.5, tab.w - 1, tab.h - 1, 14);
    }
    noStroke();
    fill(active ? 250 : 92, active ? 248 : 85, active ? 244 : 77);
    textAlign(CENTER, CENTER);
    textSize(isMobileScreen() ? 8.5 : 9.5);
    text(tab.label, tab.x + tab.w / 2, tab.y + tab.h / 2 + 0.5);
  }

  let promptLabels = ["TASK 01 / DEFAULT", "TASK 02 / TOUCH MEMORY", "TASK 03 / TASTE MEMORY", "TASK 04 / IMPERFECT MEMORY"];
  let labelY = tabs[0].y + tabs[0].h + 24;
  noStroke();
  fill(62, 57, 52, 205);
  textAlign(CENTER, CENTER);
  textSize(isMobileScreen() ? 11 : 12);
  text(`${promptLabels[slicePromptIndex]}  ·  ${selectedItems.length} drawings`, contentX + contentW / 2, labelY);

  let availableH = max(220, height - labelY - 62);
  let cardW = min(isMobileScreen() ? width - 48 : 390, contentW * (isMobileScreen() ? 0.82 : 0.38));
  let cardH = min(isMobileScreen() ? 420 : 500, availableH * 0.84);
  let centerX = contentX + contentW / 2;
  let centerY = labelY + 24 + availableH / 2;

  drawingContext.save();
  drawingContext.shadowColor = "rgba(54, 44, 32, 0.13)";
  drawingContext.shadowBlur = 28;
  drawingContext.shadowOffsetY = 15;
  noStroke();
  fill(252, 249, 241, 118);
  rect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH, 10);
  drawingContext.restore();

  for (let layer = 2; layer >= 0; layer--) {
    let offset = (layer + 1) * 5;
    noFill();
    stroke(255, 255, 255, 55 + layer * 12);
    strokeWeight(1);
    rect(centerX - cardW / 2 + offset, centerY - cardH / 2 - offset, cardW, cardH, 10);
  }

  let imageSize = min(cardW * 0.78, cardH * 0.7);
  let imageAlpha = constrain(34 - selectedItems.length * 0.08, 20, 34);
  for (let i = 0; i < selectedItems.length; i++) {
    let item = selectedItems[i];
    let d = archive[item.archiveIndex];
    if (!item.cachedThumb) item.cachedThumb = getPreviewImage(d);
    if (!item.cachedThumb) continue;

    let offsetX = sin((item.archiveIndex + 1) * 2.17) * min(12, cardW * 0.035);
    let offsetY = cos((item.archiveIndex + 1) * 1.63) * min(10, cardH * 0.025);
    let rotation = sin((item.archiveIndex + 1) * 0.91) * 0.025;
    push();
    translate(centerX + offsetX, centerY + offsetY);
    rotate(rotation);
    tint(255, imageAlpha);
    drawImageContained(item.cachedThumb, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
    noTint();
    pop();
  }
}

function drawFloatingWallCard(d, item) {
  push();
  translate(-item.size / 2, -item.size / 2);
  if (item.cachedThumb) {
    tint(255, 255 * min(0.92, item.alpha + 0.12));
    drawImageContained(item.cachedThumb, 0, 0, item.size, item.size);
    noTint();
  } else {
    drawMissingImagePlaceholder(item.size, item.size);
  }
  pop();
}


function drawFloatingSliceCard(d, item) {
  let w = item.cardW;
  let h = item.cardH;

  noStroke();
  fill(255, 253, 248, 86);
  rect(-w / 2, -h / 2, w, h, 8);

  stroke(255, 255, 255, 78);
  strokeWeight(1);
  noFill();
  rect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 8);

  push();
  translate(-item.size / 2, -item.size / 2);
  if (item.cachedThumb) {
    tint(255, 255 * item.alpha);
    drawImageContained(item.cachedThumb, 0, 0, item.size, item.size);
    noTint();
  } else {
    drawMissingImagePlaceholder(item.size, item.size);
  }
  pop();
}

function drawArchiveTarotCard(d, item, cardW, cardH, hovered) {
  drawingContext.save();
  drawingContext.shadowColor = hovered ? "rgba(46, 36, 24, 0.2)" : "rgba(46, 36, 24, 0.11)";
  drawingContext.shadowBlur = hovered ? 24 : 14;
  drawingContext.shadowOffsetY = hovered ? 16 : 10;
  noStroke();
  fill(252, 248, 238, hovered ? 220 : 186);
  rect(-cardW / 2, -cardH / 2, cardW, cardH, 7);
  drawingContext.restore();

  stroke(226, 216, 202, hovered ? 220 : 150);
  strokeWeight(1);
  noFill();
  rect(-cardW / 2 + 0.5, -cardH / 2 + 0.5, cardW - 1, cardH - 1, 7);

  let imageSize = cardW * 0.76;
  push();
  translate(-imageSize / 2, -imageSize / 2 - cardH * 0.04);
  if (item.cachedThumb) {
    tint(255, hovered ? 245 : 210);
    drawImageContained(item.cachedThumb, 0, 0, imageSize, imageSize);
    noTint();
  } else {
    drawMissingImagePlaceholder(imageSize, imageSize);
  }
  pop();

  noStroke();
  fill(80, 73, 66, hovered ? 170 : 122);
  textAlign(CENTER);
  textSize(8.5);
  text(`#${item.archiveIndex + 1}`, 0, cardH / 2 - 20);
}

function archiveCardHitTest(px, py, item, cx, cy, cardW, cardH) {
  let dx = px - cx;
  let dy = py - (cy + (item.lift || 0));
  return abs(dx) <= cardW / 2 && abs(dy) <= cardH / 2;
}

function getArchiveModeCardAt(px, py) {
  if (backgroundViewMode !== "archive") return -1;

  for (let i = drawBackgroundApplesLayout.length - 1; i >= 0; i--) {
    let item = drawBackgroundApplesLayout[i];
    let rowPan = archiveRowPan[item.rowIndex] || 0;
    let x = lerp(item.scatterX, item.archiveX + rowPan, archiveTransition);
    let y = lerp(item.scatterY, item.archiveY, archiveTransition);
    let w = lerp(item.size, item.archiveW, archiveTransition);
    let h = lerp(item.size, item.archiveH, archiveTransition);
    if (archiveCardHitTest(px, py, item, x, y, w, h)) {
      return item.archiveIndex;
    }
  }

  return -1;
}

function getArchiveRowLabel(rowIndex) {
  let labels = [
    "TASK 01 / DEFAULT",
    "TASK 02 / TOUCH MEMORY",
    "TASK 03 / TASTE MEMORY",
    "TASK 04 / IMPERFECT MEMORY"
  ];
  return labels[rowIndex] || labels[0];
}

function getArchiveRowsTop() {
  return isMobileScreen() ? 126 : 216;
}

function getArchiveRowGap() {
  return isMobileScreen() ? 118 : 132;
}

function drawMemoryArchiveView() {
  let sidebarW = getDrawSidebarWidth();
  let x0 = sidebarW + 58;
  let y0 = 128;

  noStroke();
  fill(48);
  textAlign(LEFT);
  textSize(22);
  drawingContext.letterSpacing = "4px";
  text("ARCHIVE", x0, y0);
  drawingContext.letterSpacing = "0px";

  fill(98);
  textSize(14);
  text(`${archive.length} apples  ·  sorted by prompt`, x0, y0 + 36);

  if (archive.length === 0) {
    fill(120);
    textSize(14);
    text("No apples collected yet.", x0, y0 + 92);
    return;
  }

  let rowY = getArchiveRowsTop();
  for (let i = 0; i < 4; i++) {
    noStroke();
    fill(86, 78, 70, 150);
    textAlign(LEFT);
    textSize(11);
    text(getArchiveRowLabel(i), x0, rowY + i * getArchiveRowGap() + 4);

    stroke(214, 205, 193, 115);
    strokeWeight(1);
    line(x0, rowY + i * getArchiveRowGap() + 18, width - 50, rowY + i * getArchiveRowGap() + 18);
  }

  noStroke();
  fill(108);
  textAlign(CENTER);
  textSize(12);
  text("Drag each row to browse the tarot spread", sidebarW + (width - sidebarW) / 2, height - 56);
}

function drawMobileArchiveView() {
  let pad = 22;
  let y = 86 - getMobileArchiveScrollY();
  let cardW = min(width * 0.62, 240);
  let cardH = 150;
  let stepX = cardW * 0.72;

  noStroke();
  fill(48);
  textAlign(LEFT);
  textSize(20);
  drawingContext.letterSpacing = "3px";
  text("ARCHIVE", pad, y);
  drawingContext.letterSpacing = "0px";

  fill(98);
  textSize(12);
  text(`${archive.length} apples · sorted by prompt`, pad, y + 26);
  y += 62;

  if (archive.length === 0) {
    fill(120);
    textSize(13);
    text("No apples collected yet.", pad, y + 30);
    return;
  }

  for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
    let group = archive
      .map((drawing, index) => ({ drawing, index }))
      .filter(item => getArchivePromptGroupIndex(item.drawing) === groupIndex);

    fill(78, 70, 62, 170);
    textSize(11);
    textAlign(LEFT);
    text(getArchiveRowLabel(groupIndex), pad, y);
    y += 24;

    if (group.length === 0) {
      fill(130, 122, 112, 130);
      textSize(11);
      text("Waiting for drawings.", pad, y + 12);
      y += 48;
      continue;
    }

    let rowPan = archiveRowPan[groupIndex] || 0;
    for (let i = 0; i < group.length; i++) {
      let item = group[i];
      let cardX = pad + 8 + rowPan + i * stepX;
      let cardY = y;
      let rotation = radians(((i % 5) - 2) * 1.2);

      drawMobileArchiveCard(item.drawing, item.index, cardX, cardY, cardW, cardH, rotation);
    }

    y += cardH + 58;
  }
}

function drawMobileArchiveCard(d, archiveIndex, x, y, w, h, rotation) {
  push();
  translate(x + w / 2, y + h / 2);
  rotate(rotation);

  drawingContext.save();
  drawingContext.shadowColor = "rgba(46, 36, 24, 0.12)";
  drawingContext.shadowBlur = 15;
  drawingContext.shadowOffsetY = 8;
  noStroke();
  fill(252, 248, 238, 188);
  rect(-w / 2, -h / 2, w, h, 8);
  drawingContext.restore();

  stroke(226, 216, 202, 150);
  strokeWeight(1);
  noFill();
  rect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 8);

  push();
  translate(-w * 0.32, -h * 0.34);
  drawStaticMini(d, w * 0.64, h * 0.68);
  pop();

  noStroke();
  fill(80, 73, 66, 145);
  textAlign(RIGHT);
  textSize(10);
  text(`#${archiveIndex + 1}`, w / 2 - 16, h / 2 - 18);

  pop();
}

function getMobileArchiveCardAt(px, py) {
  let pad = 22;
  let y = 86 - getMobileArchiveScrollY() + 62;
  let cardW = min(width * 0.62, 240);
  let cardH = 150;
  let stepX = cardW * 0.72;

  for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
    let group = archive
      .map((drawing, index) => ({ drawing, index }))
      .filter(item => getArchivePromptGroupIndex(item.drawing) === groupIndex);

    y += 24;

    if (group.length === 0) {
      y += 48;
      continue;
    }

    let rowPan = archiveRowPan[groupIndex] || 0;
    for (let i = 0; i < group.length; i++) {
      let cardX = pad + 8 + rowPan + i * stepX;
      let cardY = y;

      if (px >= cardX && px <= cardX + cardW && py >= cardY && py <= cardY + cardH) {
        return group[i].index;
      }
    }

    y += cardH + 58;
  }

  return -1;
}

function getMobileArchiveContentHeight() {
  let y = 86 + 62;
  for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
    let count = archive.filter(d => getArchivePromptGroupIndex(d) === groupIndex).length;
    y += 24;
    y += count > 0 ? 208 : 48;
  }
  return y + 48;
}

function getArchivePromptGroupIndex(d) {
  let index = getDrawingPromptIndex(d);
  return Number.isFinite(index) && index >= 0 && index <= 3 ? index : 0;
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

  let duration = selectedApple.durationSeconds !== undefined ? `${selectedApple.durationSeconds}s` : "undated";
  text(`${duration} · ${countDrawingUnits(selectedApple)} trace units`, r.x + 22, r.y + 66);

  stroke(inkCol);
  strokeWeight(1.2);
  line(close.x + 2, close.y + 2, close.x + close.w - 2, close.y + close.h - 2);
  line(close.x + close.w - 2, close.y + 2, close.x + 2, close.y + close.h - 2);

  let thumbX = r.x + 22;
  let thumbY = r.y + 88;
  let thumbW = r.w - 44;
  let thumbH = min(260, r.h * 0.46);

  fill(paperCol);
  stroke(226, 220, 210);
  rect(thumbX, thumbY, thumbW, thumbH, 4);

  push();
  translate(thumbX + 16, thumbY + 14);
  drawSelectedAppleReplay(selectedApple, thumbW - 32, thumbH - 28);
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
  let w = isMobileScreen() ? min(width - 36, 340) : min(520, width - getDrawSidebarWidth() - 120);
  let h = isMobileScreen() ? min(height - 120, 520) : min(560, height - 120);
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let x = isMobileScreen() ? (width - w) / 2 : sidebarW + (width - sidebarW - w) / 2;
  let y = isMobileScreen() ? 88 : max(92, (height - h) / 2);

  return { x: x, y: y, w: w, h: h };
}

function drawSelectedAppleReplay(d, miniW, miniH) {
  if (!d || !Array.isArray(d.actions) || d.actions.length === 0) {
    drawStaticMini(d, miniW, miniH);

    if (d && d.dbId && !d.actions) {
      noStroke();
      fill(120, 112, 104, 120);
      textAlign(CENTER, CENTER);
      textSize(10);
      text("loading drawing trace", miniW / 2, miniH - 14);
    }
    return;
  }

  let totalUnits = max(1, countDrawingUnits(d));
  let replayDuration = constrain(totalUnits * 18, 4200, 14000);
  let elapsed = (millis() - selectedAppleReplayStartedAt) % replayDuration;
  let replayLimit = max(1, floor(map(elapsed, 0, replayDuration, 1, totalUnits)));

  drawReplayMini(d, replayLimit, miniW, miniH, 1);
}

function getApplePopupCloseRect() {
  let r = getApplePopupRect();
  return {
    x: r.x + r.w - 54,
    y: r.y + 18,
    w: 42,
    h: 42
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
    text(p.task, x + 18, y + 28);

    fill(inkCol);
    textSize(19);
    textLeading(23);
    text(p.en, x + 18, y + 72, w - 44);
    fill(60);
    textSize(15);
    textLeading(20);
    text(p.cn, x + 18, y + 122, w - 44);

    fill(105);
    textSize(11);
    textLeading(16);
    text(p.noteEn, x + 18, y + 170, w - 44);
    text(p.noteCn, x + 18, y + 205, w - 44);
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

function mouseClicked() {
  if (isMobileArchiveMode() && !isClickOnViewSwitcher(mouseX, mouseY)) {
    let hitIndex = getMobileArchiveCardAt(mouseX, mouseY);
    if (hitIndex >= 0) {
      selectArchiveDrawing(hitIndex);
      return false;
    }
  }
}

function touchStarted() {
  if (touches.length > 0) {
    let x = touches[0].x;
    let y = touches[0].y;

    if (page === "draw" && pointInsideUndoButton(x, y)) {
      return true;
    }

    if (isMobileArchiveMode()) {
      if (isClickOnViewSwitcher(x, y) || isClickOnApplePopupClose(x, y) || isClickOnApplePopup(x, y)) {
        let handled = handlePointerPressed(x, y);
        return !handled;
      }
      let handled = handlePointerPressed(x, y);
      return !handled;
    }

    if (page === "draw") {
      let handled = handlePointerPressed(x, y);
      return !handled;
    }

    if (page === "stack" && handleStackControlPress(x, y)) {
      return false;
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

    if (archiveSliceDragging || archiveRowDragging || isWallPanning || isArchivePanning || (page === "draw" && pointInsideDrawingArea(x, y))) {
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

  if (page === "archiveWall" && handleArchiveWallPress(x, y)) {
    return true;
  }

  if (page === "draw" && handleDrawPageClick(x, y)) {
    return true;
  }

  let archiveRow = getArchiveRowAt(x, y);
  if (archiveRow >= 0) {
    archiveRowDragging = true;
    archiveRowDragIndex = archiveRow;
    archiveRowLastX = x;
    archiveRowLastMoveTime = millis();
    archiveRowVelocity[archiveRow] = 0;
    archiveRowPressPoint = { x: x, y: y };
    archiveRowDragDistance = 0;
    return true;
  }

  if (canPanArchiveSliceAt(x, y)) {
    archiveSliceDragging = true;
    archiveSliceLastX = x;
    return true;
  }

  if (page === "draw" && pointInsideUndoButton(x, y)) {
    handleUndoClick();
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

  if (archiveSliceDragging) {
    archiveSlicePanX += x - archiveSliceLastX;
    archiveSliceLastX = x;
    constrainArchiveSlicePan();
    return false;
  }

  if (archiveRowDragging) {
    let dx = x - archiveRowLastX;
    let now = millis();
    let dt = max(16, now - archiveRowLastMoveTime);
    applyArchiveRowPanDelta(archiveRowDragIndex, dx, true);
    archiveRowVelocity[archiveRowDragIndex] = dx / dt * 16.67;
    archiveRowLastX = x;
    archiveRowLastMoveTime = now;
    archiveRowDragDistance += abs(dx);
    return false;
  }

  if (isWallPanning && page === "archiveWall") {
    let dx = x - lastWallPanPoint.x;
    let dy = y - lastWallPanPoint.y;
    wallCamera.x += dx / wallCamera.zoom;
    wallCamera.y += dy / wallCamera.zoom;
    wallDragDistance += abs(dx) + abs(dy);
    lastWallPanPoint = { x: x, y: y };
    constrainWallCamera();
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

  if (isArchivePanning && isMobileArchiveMode()) {
    let dy = y - lastPanPoint.y;
    archivePan.y += dy;
    archivePan.x = 0;
    mobileArchiveDragDistance += abs(dy);
    lastPanPoint = { x: x, y: y };
    constrainMobileArchivePan();
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
  if (archiveSliceDragging) {
    archiveSliceDragging = false;
  }

  if (archiveRowDragging) {
    if (archiveRowDragDistance < 8) {
      let hitIndex = getArchiveModeCardAt(archiveRowPressPoint.x, archiveRowPressPoint.y);
      if (hitIndex >= 0) {
        selectArchiveDrawing(hitIndex);
      }
    }
    if (abs(archiveRowVelocity[archiveRowDragIndex] || 0) < 0.02) {
      constrainArchiveRowPan(archiveRowDragIndex);
    }
    archiveRowDragging = false;
    archiveRowDragIndex = -1;
  }

  if (isWallPanning) {
    if (wallDragDistance < 8) {
      let hitIndex = getArchiveWallAppleAt(wallPressPoint.x, wallPressPoint.y);
      if (hitIndex >= 0) {
        selectArchiveDrawing(hitIndex);
      }
    }
    isWallPanning = false;
  }

  if (isArchivePanning) {
    if (isMobileArchiveMode() && mobileArchiveDragDistance < 8) {
      let hitIndex = getMobileArchiveCardAt(mobileArchivePressPoint.x, mobileArchivePressPoint.y);
      if (hitIndex >= 0) {
        selectArchiveDrawing(hitIndex);
      }
    }
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

function handleArchiveWallPress(x, y) {
  if (pointInsideArchiveWallPopupClose(x, y)) {
    selectedApple = null;
    selectedAppleIndex = -1;
    return true;
  }

  if (selectedApple && pointInsideArchiveWallPopup(x, y)) {
    return true;
  }

  if (!archiveCanPanAt(x, y)) return false;

  isWallPanning = true;
  wallPressPoint = { x: x, y: y };
  wallDragDistance = 0;
  lastWallPanPoint = { x: x, y: y };
  return true;
}

function getArchiveWallPopupRect() {
  return {
    x: isMobileScreen() ? 20 : width - 292,
    y: archiveHeaderHeight() + 18,
    w: isMobileScreen() ? width - 40 : 250,
    h: 298
  };
}

function pointInsideArchiveWallPopup(x, y) {
  if (page !== "archiveWall" || !selectedApple) return false;
  return pointInsideRect(x, y, getArchiveWallPopupRect());
}

function pointInsideArchiveWallPopupClose(x, y) {
  if (page !== "archiveWall" || !selectedApple) return false;
  let r = getArchiveWallPopupRect();
  return pointInsideRect(x, y, {
    x: r.x + r.w - 34,
    y: r.y + 16,
    w: 22,
    h: 22
  });
}

function handleDrawPageClick(x, y) {
  if (backgroundViewMode === "archive" && isClickOnApplePopupClose(x, y)) {
    selectedApple = null;
    selectedAppleIndex = -1;
    return true;
  }

  if (backgroundViewMode === "archive" && isClickOnApplePopup(x, y)) {
    return true;
  }

  let switchMode = getViewSwitcherHit(x, y);
  if (switchMode) {
    if (switchMode === "draw") {
      modalOpen = true;
      layoutInterface();
    } else if (backgroundViewMode !== switchMode || modalOpen) {
      backgroundViewMode = switchMode;
      modalOpen = false;
      currentAction = null;
      if (switchMode === "archive") {
        archivePan.y = 0;
      }
      if (switchMode === "wall" || switchMode === "slice") {
        generateDrawBackgroundApplesLayout();
      }
      layoutInterface();
    }
    return true;
  }

  let sliceTabIndex = getSlicePromptTabAt(x, y);
  if (sliceTabIndex >= 0) {
    slicePromptIndex = sliceTabIndex;
    return true;
  }

  if (modalOpen && isClickOnModalClose(x, y)) {
    modalOpen = false;
    currentAction = null;
    if (isMobileScreen()) mobileArchiveReady = true;
    layoutInterface();
    return true;
  }

  if (!modalOpen && backgroundViewMode !== "slice" && isClickOnReopenDrawingButton(x, y)) {
    modalOpen = true;
    layoutInterface();
    return true;
  }

  if (isClickOnSidebar(x, y) || isClickOnModal(x, y) || isClickOnDrawingDomControl(x, y)) {
    return false;
  }

  return false;
}

function isArchiveSliceMode() {
  return (
    page === "draw" &&
    !modalOpen &&
    backgroundViewMode === "slice"
  );
}

function isMobileArchiveMode() {
  return page === "draw" && isMobileScreen() && !modalOpen && backgroundViewMode === "archive";
}

function getMobileArchiveScrollY() {
  return archiveScrollModeActive ? (window.scrollY || 0) : -archivePan.y;
}

function updateMobileArchiveScrollMode() {
  let active = isMobileArchiveMode();
  if (active === archiveScrollModeActive) {
    if (active) {
      document.body.style.height = `${max(height + 1, getMobileArchiveContentHeight() + 80)}px`;
    }
    return;
  }

  archiveScrollModeActive = active;
  if (active) {
    document.body.style.position = "static";
    document.body.style.overflowY = "auto";
    document.body.style.height = `${max(height + 1, getMobileArchiveContentHeight() + 80)}px`;
    document.body.style.touchAction = "pan-y";
    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.webkitOverflowScrolling = "touch";
    if (mainCanvas && mainCanvas.elt) {
      mainCanvas.elt.style.position = "fixed";
      mainCanvas.elt.style.left = "0";
      mainCanvas.elt.style.top = "0";
      mainCanvas.elt.style.touchAction = "pan-y";
    }
  } else {
    window.scrollTo(0, 0);
    document.body.style.position = "fixed";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflowY = "hidden";
    document.documentElement.style.webkitOverflowScrolling = "auto";
    if (mainCanvas && mainCanvas.elt) {
      mainCanvas.elt.style.position = "relative";
      mainCanvas.elt.style.left = "";
      mainCanvas.elt.style.top = "";
      mainCanvas.elt.style.touchAction = "none";
    }
  }
}

function constrainMobileArchivePan() {
  let contentH = getMobileArchiveContentHeight();
  let minY = min(0, height - contentH - 40);
  archivePan.y = constrain(archivePan.y, minY, 0);
  archivePan.x = 0;
}

function canPanArchiveSliceAt(x, y) {
  return false;
}

function getArchiveRowAt(x, y) {
  if (page !== "draw" || modalOpen || backgroundViewMode !== "archive") return -1;
  if (isClickOnSidebar(x, y) || isClickOnViewSwitcher(x, y) || isClickOnReopenDrawingButton(x, y)) return -1;

  if (isMobileScreen()) {
    let rowY = 86 - getMobileArchiveScrollY() + 62;
    let cardH = 150;
    for (let i = 0; i < 4; i++) {
      rowY += 24;
      let count = archive.filter(d => getArchivePromptGroupIndex(d) === i).length;
      if (count > 0 && y >= rowY - 18 && y <= rowY + cardH + 18) return i;
      rowY += count > 0 ? cardH + 58 : 48;
    }
    return -1;
  }

  let top = getArchiveRowsTop();
  let gap = getArchiveRowGap();
  for (let i = 0; i < 4; i++) {
    let rowY = top + i * gap;
    if (y >= rowY - 64 && y <= rowY + 72) return i;
  }
  return -1;
}

function constrainArchiveRowPan(rowIndex) {
  let bounds = getArchiveRowPanBounds(rowIndex);
  archiveRowPan[rowIndex] = constrain(archiveRowPan[rowIndex] || 0, bounds.min, bounds.max);
}

function getArchiveRowPanBounds(rowIndex) {
  if (isMobileScreen()) {
    let count = archive.filter(d => getArchivePromptGroupIndex(d) === rowIndex).length;
    let cardW = min(width * 0.62, 240);
    let stepX = cardW * 0.72;
    let contentW = count > 0 ? (count - 1) * stepX + cardW + 60 : width;
    let minX = min(0, width - contentW - 30);
    return { min: minX, max: 0 };
  }

  let frame = getArchiveCardsSafeFrame();
  let rowCount = drawBackgroundApplesLayout.filter(item => item.rowIndex === rowIndex).length;
  let rowW = rowCount * 74 + 150;
  let minX = -max(0, rowW - frame.w);
  return { min: minX, max: 0 };
}

function getArchiveCardsSafeFrame() {
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let left = sidebarW + (isMobileScreen() ? 20 : 64);
  let top = isMobileScreen() ? 92 : getArchiveRowsTop() - 78;
  let right = width - (isMobileScreen() ? 20 : 56);
  let bottom = height - 62;

  return {
    x: left,
    y: top,
    w: max(1, right - left),
    h: max(1, bottom - top)
  };
}

function applyArchiveRowPanDelta(rowIndex, dx, withResistance) {
  let bounds = getArchiveRowPanBounds(rowIndex);
  let current = archiveRowPan[rowIndex] || 0;
  let next = current + dx;

  if (withResistance) {
    if (next > bounds.max) {
      next = bounds.max + (next - bounds.max) * 0.28;
    } else if (next < bounds.min) {
      next = bounds.min + (next - bounds.min) * 0.28;
    }
  } else {
    next = constrain(next, bounds.min, bounds.max);
  }

  archiveRowPan[rowIndex] = next;
}

function updateArchiveRowInertia() {
  if (modalOpen || backgroundViewMode !== "archive") return;
  if (archiveRowDragging) return;

  for (let i = 0; i < archiveRowVelocity.length; i++) {
    let v = archiveRowVelocity[i] || 0;
    if (abs(v) < 0.02) {
      archiveRowVelocity[i] = 0;
      continue;
    }

    applyArchiveRowPanDelta(i, v, false);
    archiveRowVelocity[i] *= 0.92;
  }
}

function constrainArchiveSlicePan() {
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let count = backgroundViewMode === "archive"
    ? min(archive.length, 10)
    : drawBackgroundApplesLayout.length;
  let contentW = max(width, count * (backgroundViewMode === "archive" ? 112 : 92));
  let minX = min(0, width - sidebarW - contentW - 80);
  let maxX = max(80, (width - sidebarW) * 0.2);

  archiveSlicePanX = constrain(archiveSlicePanX, minX, maxX);
}

let lastBackgroundToggleTime = 0;

function toggleBackgroundLayout() {
  if (millis() - lastBackgroundToggleTime < 250) return;
  lastBackgroundToggleTime = millis();
  backgroundLayoutMode = backgroundLayoutMode === "float" ? "grid" : "float";
  selectedApple = null;
  selectedAppleIndex = -1;
  generateDrawBackgroundApplesLayout();
}

function getViewSwitcherHit(x, y) {
  if (isMobileScreen() && modalOpen) return null;
  let r = getBackgroundViewSwitcherRect();
  if (!pointInsideRect(x, y, r)) return null;

  let options = getTopToolbarOptions(r);
  for (let item of options) {
    if (x >= item.x - 8 && x <= item.x + item.w + 8) return item.mode;
  }

  return null;
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
  if (isMobileScreen() && modalOpen) return false;
  return pointInsideRect(x, y, getBackgroundViewSwitcherRect());
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
  if (isMobileArchiveMode()) {
    return true;
  }

  if (page === "archiveWall") {
    let zoomFactor = exp(-event.delta * 0.0016);
    zoomWallCameraAt(mouseX, mouseY, zoomFactor);
    return false;
  }

  if (isArchiveSliceMode()) {
    return true;
  }

  if (page === "draw" && !modalOpen && backgroundViewMode === "archive") {
    let row = getArchiveRowAt(mouseX, mouseY);
    if (row >= 0) {
      let delta = abs(event.deltaX || 0) > abs(event.deltaY || 0) ? event.deltaX : event.delta;
      applyArchiveRowPanDelta(row, -delta, true);
      archiveRowVelocity[row] = -delta * 0.18;
      return false;
    }
  }

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

async function submitDrawing() {
  await completePromptFlowStep();
}

async function saveCurrentDrawing() {
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
    drawingArea: {
      x: drawLayout.drawX,
      y: drawLayout.drawY,
      w: drawLayout.drawW,
      h: drawLayout.drawH
    },
    durationSeconds: Number(duration.toFixed(2)),
    actions: JSON.parse(JSON.stringify(actions))
  };
  drawingData.preview = createDrawingPreviewDataURL(drawingData, 260, 210);

  archive.push(drawingData);
  saveArchive();
  if (!isMobileScreen() || mobileArchiveReady) {
    generateDrawBackgroundApplesLayout();
  }
  markStackDirty();
  await saveDrawingToCloud(drawingData);

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

function handleUndoClick(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  let now = Date.now();
  if (now - lastUndoTime < 300) return;
  lastUndoTime = now;

  undoLastAction();
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

async function nextPrompt() {
  await completePromptFlowStep();
}

async function completePromptFlowStep() {
  if (promptFlowSaving) return;
  promptFlowSaving = true;

  try {
    let saved = await saveCurrentDrawing();
    if (!saved) {
      alert("Please draw something first.");
      return;
    }

    advancePrompt();
  } finally {
    promptFlowSaving = false;
    updatePromptFlowButtonLabel();
  }
}

function advancePrompt() {
  if (promptIndex < prompts.length - 1) {
    promptIndex += 1;
    page = "draw";
    modalOpen = true;
    clearDrawing();
    updatePromptFlowButtonLabel();
    return;
  }

  clearDrawing();
  page = "draw";
  modalOpen = false;
  backgroundViewMode = "archive";
  if (isMobileScreen()) mobileArchiveReady = true;
  selectedApple = null;
  selectedAppleIndex = -1;
  generateDrawBackgroundApplesLayout();
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

function selectArchiveDrawing(index) {
  selectedAppleIndex = index;
  selectedApple = archive[index] || null;
  selectedAppleReplayStartedAt = millis();
  fetchDrawingDetails(index);
}

async function fetchDrawingDetails(index) {
  let drawing = archive[index];
  if (!drawing || drawing.actions || !drawing.dbId) return;

  try {
    const response = await fetch(`/api/drawings/${drawing.dbId}`);
    if (!response.ok) throw new Error(await response.text());

    const fullDrawing = normalizeDrawingData(await response.json());
    if (!fullDrawing) return;

    archive[index] = {
      ...drawing,
      ...fullDrawing,
      thumb_url: fullDrawing.thumb_url || null,
      image_url: fullDrawing.image_url || null
    };

    if (selectedAppleIndex === index) {
      selectedApple = archive[index];
      selectedAppleReplayStartedAt = millis();
    }
  } catch (error) {
    console.warn("Could not load full drawing details:", error);
  }
}

async function saveDrawingToCloud(drawingData) {
  try {
    let cloudDrawing = JSON.parse(JSON.stringify(drawingData));
    delete cloudDrawing.preview;
    let exportCrop = drawingData.drawingArea || getCurrentDrawingExportArea();
    let imageDataUrl = createDrawingLayerImageDataURL(drawingLayer, exportCrop.w, exportCrop.h, 0.82, exportCrop);
    let thumbDataUrl = createDrawingLayerImageDataURL(drawingLayer, 420, 420, 0.72, exportCrop);

    const response = await fetch("/api/drawings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        drawing: cloudDrawing,
        imageDataUrl,
        thumbDataUrl
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    let saved = await response.json();
    if (saved && saved.dbId) {
      drawingData.dbId = saved.dbId;
      drawingData.image_url = saved.image_url || null;
      drawingData.thumb_url = saved.thumb_url || null;
      saveArchive();
    }
  } catch (error) {
    console.warn("Could not save drawing to server. It is still saved locally:", error);
  }
}

function getCurrentDrawingExportArea() {
  let layout = getDrawingLayout();
  return {
    x: floor(layout.drawX),
    y: floor(layout.drawY),
    w: max(1, floor(layout.drawW)),
    h: max(1, floor(layout.drawH))
  };
}

function getCroppedSourceImage(sourceLayer, cropRect) {
  if (!cropRect) return sourceLayer;

  let x = constrain(floor(cropRect.x || 0), 0, sourceLayer.width - 1);
  let y = constrain(floor(cropRect.y || 0), 0, sourceLayer.height - 1);
  let w = constrain(floor(cropRect.w || sourceLayer.width), 1, sourceLayer.width - x);
  let h = constrain(floor(cropRect.h || sourceLayer.height), 1, sourceLayer.height - y);

  let cropped = sourceLayer.get(x, y, w, h);
  let contentBounds = getOpaquePixelBounds(cropped, 8);
  if (!contentBounds) return cropped;

  let padding = max(12, floor(max(contentBounds.w, contentBounds.h) * 0.14));
  let contentX = max(0, contentBounds.x - padding);
  let contentY = max(0, contentBounds.y - padding);
  let contentW = min(cropped.width - contentX, contentBounds.w + padding * 2);
  let contentH = min(cropped.height - contentY, contentBounds.h + padding * 2);

  return cropped.get(contentX, contentY, contentW, contentH);
}

function getOpaquePixelBounds(img, alphaThreshold = 8) {
  if (!img || !img.loadPixels) return null;
  img.loadPixels();

  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let index = (y * img.width + x) * 4 + 3;
      if (img.pixels[index] > alphaThreshold) {
        minX = min(minX, x);
        minY = min(minY, y);
        maxX = max(maxX, x);
        maxY = max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
}

function drawSourceImageContained(targetGraphics, sourceGraphics, targetW, targetH) {
  let sourceW = sourceGraphics.width || targetW;
  let sourceH = sourceGraphics.height || targetH;
  let scale = min(targetW / sourceW, targetH / sourceH);
  let drawW = sourceW * scale;
  let drawH = sourceH * scale;
  let drawX = (targetW - drawW) / 2;
  let drawY = (targetH - drawH) / 2;

  targetGraphics.image(sourceGraphics, drawX, drawY, drawW, drawH);
}

function createDrawingLayerImageDataURL(sourceLayer, imageW, imageH, quality, cropRect = null) {
  let g = createGraphics(imageW, imageH);
  g.pixelDensity(1);
  g.clear();
  g.smooth();
  let croppedSource = getCroppedSourceImage(sourceLayer, cropRect);
  drawSourceImageContained(g, croppedSource, imageW, imageH);

  let dataURL = "";
  try {
    dataURL = g.canvas.toDataURL("image/webp", quality);
  } catch (error) {
    dataURL = "";
  }

  if (!dataURL || !dataURL.startsWith("data:image/webp")) {
    dataURL = g.canvas.toDataURL("image/png");
  }

  try {
    if (croppedSource !== sourceLayer && croppedSource && croppedSource.canvas && croppedSource.canvas.parentNode) {
      croppedSource.canvas.parentNode.removeChild(croppedSource.canvas);
    }
    if (g && g.canvas && g.canvas.parentNode) {
      g.canvas.parentNode.removeChild(g.canvas);
    }
  } catch (error) {
    console.warn("Could not remove drawing layer image graphics canvas:", error);
  }

  return dataURL;
}

function createDrawingImageDataURL(drawingData, imageW, imageH, quality) {
  let g = createGraphics(imageW, imageH);
  g.pixelDensity(1);
  g.clear();
  g.smooth();
  let source = renderDrawingToOriginalGraphics(drawingData);
  let cropRect = drawingData.drawingArea || {
    x: 0,
    y: drawingData.headerHeight || headerH,
    w: source.width,
    h: max(1, source.height - (drawingData.headerHeight || headerH))
  };
  let croppedSource = getCroppedSourceImage(source, cropRect);
  drawSourceImageContained(g, croppedSource, imageW, imageH);

  let dataURL = "";
  try {
    dataURL = g.canvas.toDataURL("image/webp", quality);
  } catch (error) {
    dataURL = "";
  }

  if (!dataURL || !dataURL.startsWith("data:image/webp")) {
    dataURL = g.canvas.toDataURL("image/png");
  }

  try {
    if (source && source.canvas && source.canvas.parentNode) {
      source.canvas.parentNode.removeChild(source.canvas);
    }
    if (croppedSource !== source && croppedSource && croppedSource.canvas && croppedSource.canvas.parentNode) {
      croppedSource.canvas.parentNode.removeChild(croppedSource.canvas);
    }
    if (g && g.canvas && g.canvas.parentNode) {
      g.canvas.parentNode.removeChild(g.canvas);
    }
  } catch (error) {
    console.warn("Could not remove drawing image graphics canvas:", error);
  }

  return dataURL;
}

function renderDrawingToOriginalGraphics(drawingData) {
  let originalW = max(1, floor(drawingData.canvasWidth || width));
  let originalH = max(1, floor(drawingData.canvasHeight || height));
  let originalHeaderH = floor(drawingData.headerHeight || headerH);
  let source = createGraphics(originalW, originalH);
  source.pixelDensity(1);
  source.clear();
  source.smooth();

  for (let action of drawingData.actions || []) {
    if (action.type === "stroke") {
      let pts = action.points || [];

      if (action.tool === "eraser") {
        source.erase();
        source.stroke(0);
        source.strokeWeight((action.size || 1) * 2.2);
      } else {
        source.noErase();
        source.stroke(action.color || "#111111");
        source.strokeWeight(action.size || 1);
      }

      source.strokeCap(ROUND);
      source.strokeJoin(ROUND);

      if (pts.length === 1) {
        let p = pts[0];
        if (action.tool === "eraser") {
          source.noStroke();
          source.fill(0);
          source.circle(p.x, p.y, (action.size || 1) * 2.2);
        } else {
          source.noStroke();
          source.fill(action.color || "#111111");
          source.circle(p.x, p.y, action.size || 1);
        }
      }

      for (let i = 1; i < pts.length; i++) {
        source.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      }

      source.noErase();
    } else if (action.type === "fill") {
      floodFillOnGraphics(
        source,
        floor(action.x),
        floor(action.y),
        action.color,
        0,
        originalHeaderH,
        originalW - 1,
        originalH - 1
      );
    }
  }

  return source;
}

function createDrawingPreviewDataURL(drawingData, previewW, previewH) {
  let g = createGraphics(previewW, previewH);
  g.pixelDensity(1);
  g.clear();
  g.smooth();
  renderDrawingToGraphics(g, drawingData, 999999, true, 1);

  let dataURL = "";
  try {
    dataURL = g.canvas.toDataURL("image/webp", 0.72);
  } catch (error) {
    dataURL = "";
  }

  if (!dataURL || !dataURL.startsWith("data:image/webp")) {
    dataURL = g.canvas.toDataURL("image/png");
  }

  try {
    if (g && g.canvas && g.canvas.parentNode) {
      g.canvas.parentNode.removeChild(g.canvas);
    }
  } catch (error) {
    console.warn("Could not remove preview graphics canvas:", error);
  }

  return dataURL;
}

function hasPreviewData(d) {
  return Boolean(
    d &&
    (
      typeof d.thumb_url === "string" ||
      typeof d.image_url === "string"
    )
  );
}

function hasLegacyPreviewData(d) {
  return Boolean(d && typeof d.preview === "string" && d.preview.startsWith("data:image/"));
}

function getPreviewImage(d) {
  if (!hasPreviewData(d)) return null;

  let src = d.thumb_url || d.image_url;
  let key = `${d.dbId || d.id || d.createdAt || archive.indexOf(d)}_${src}`;
  let cache = imageURLCache;
  let cached = cache[key];

  if (cached) {
    return cached.loaded ? cached.img : null;
  }

  let entry = {
    img: null,
    loaded: false,
    failed: false
  };
  cache[key] = entry;

  entry.img = loadImage(
    src,
    (img) => {
      entry.img = img;
      entry.loaded = true;
    },
    () => {
      entry.failed = true;
    }
  );

  return null;
}

async function backfillMissingPreviews() {
  let updated = 0;
  let skipped = 0;

  for (let drawing of archive) {
    if (!drawing || hasLegacyPreviewData(drawing)) {
      skipped++;
      continue;
    }

    if (!drawing.dbId) {
      console.warn("Skipping drawing without dbId:", drawing.id || drawing.createdAt);
      skipped++;
      continue;
    }

    let preview = createDrawingPreviewDataURL(drawing, 260, 210);

    try {
      let response = await fetch(`/api/drawings/${drawing.dbId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ preview })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      drawing.preview = preview;
      updated++;
    } catch (error) {
      console.warn("Could not backfill preview:", drawing.dbId, error);
      skipped++;
    }
  }

  saveArchive();
  clearGridMiniCache();
  generateDrawBackgroundApplesLayout();
  console.log(`Preview backfill complete. Updated ${updated}, skipped ${skipped}.`);
  return { updated, skipped };
}

window.backfillMissingPreviews = backfillMissingPreviews;

async function backfillMissingImageUrls(batchSize = 5) {
  let processed = 0;
  let total = 0;

  while (true) {
    const response = await fetch(`/api/drawings/missing-images?limit=${batchSize}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = await response.json();
    const drawings = (Array.isArray(payload) ? payload : payload.drawings || [])
      .map(normalizeDrawingData)
      .filter(Boolean);
    total = Array.isArray(payload) ? max(total, processed + drawings.length) : payload.total || 0;
    if (drawings.length === 0) {
      console.log(`Image URL backfill complete. Processed ${processed} drawings.`);
      break;
    }

    for (let drawing of drawings) {
      if (!drawing.dbId) {
        console.warn("Skipping drawing without dbId:", drawing.id || drawing.createdAt);
        continue;
      }

      let imageDataUrl = drawing.image_url
        ? null
        : createDrawingImageDataURL(drawing, drawing.canvasWidth || width, drawing.canvasHeight || height, 0.82);
      let thumbDataUrl = drawing.thumb_url
        ? null
        : createDrawingImageDataURL(drawing,1000, 1000, 0.72);

      try {
        const updateResponse = await fetch(`/api/drawings/${drawing.dbId}/images`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ imageDataUrl, thumbDataUrl })
        });

        if (!updateResponse.ok) {
          throw new Error(await updateResponse.text());
        }

        processed++;
        console.log(`Image URL backfill: processed ${processed} / ${total}`);
      } catch (error) {
        console.warn("Could not backfill image URLs:", drawing.dbId, error);
      }
    }

    if (drawings.length < batchSize) {
      console.log(`Image URL backfill complete. Processed ${processed} drawings.`);
      break;
    }
  }

  return processed;
}

window.backfillMissingImageUrls = backfillMissingImageUrls;

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

    archiveWallLayout.push({
      x: centerX - miniW / 2,
      y: startY + row * spacingY + jitterY,
      scale: 0.88 + ((i % 5) * 0.025),
      alpha: 0.82 + ((i % 4) * 0.04),
      replayIndex: 0,
      replaySpeed: 0.62 + ((i % 4) * 0.1),
      miniW: miniW,
      miniH: miniH,
      miniLayer: null,
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
    "A zoomable memory field of remembered forms."
  );

  if (archive.length === 0) {
    drawEmptyArchiveMessage();
    return;
  }

  clipBelowHeader();
  push();
  applyWallCameraTransform();

  for (let i = 0; i < archive.length; i++) {
    let d = archive[i];
    let layout = archiveWallLayout[i];
    if (!layout) continue;

    push();
    translate(layout.x, layout.y);
    scale(layout.scale);
    tint(255, 245 * layout.alpha);
    drawStaticMini(d, layout.miniW, layout.miniH);
    noTint();
    drawWallSemanticLabel(d, i, layout);
    pop();
  }

  pop();
  unclip();

  drawArchiveWallDetailPopup();
  drawArchiveFooter("Scroll or pinch to zoom. Drag to move through the remembered apple field.");
}

function applyWallCameraTransform() {
  translate(width / 2, height / 2);
  scale(wallCamera.zoom);
  translate(-width / 2 + wallCamera.x, -height / 2 + wallCamera.y);
}

function screenToWall(x, y) {
  return {
    x: (x - width / 2) / wallCamera.zoom + width / 2 - wallCamera.x,
    y: (y - height / 2) / wallCamera.zoom + height / 2 - wallCamera.y
  };
}

function zoomWallCameraAt(screenX, screenY, zoomFactor) {
  let before = screenToWall(screenX, screenY);
  wallCamera.zoom = constrain(wallCamera.zoom * zoomFactor, wallMinZoom, wallMaxZoom);
  let after = screenToWall(screenX, screenY);
  wallCamera.x += after.x - before.x;
  wallCamera.y += after.y - before.y;
  constrainWallCamera();
}

function constrainWallCamera() {
  let z = wallCamera.zoom;
  let limitX = width * (0.55 + z * 0.45);
  let limitY = height * (0.45 + z * 0.35);
  wallCamera.x = constrain(wallCamera.x, -limitX, limitX);
  wallCamera.y = constrain(wallCamera.y, -limitY, limitY);
}

function drawWallSemanticLabel(d, index, layout) {
  if (wallCamera.zoom < 0.9) return;

  noStroke();
  fill(86, 78, 70, 145);
  textAlign(LEFT);
  textSize(10);
  text(`#${index + 1}`, 4, layout.miniH + 14);

  if (wallCamera.zoom >= 1.5) {
    let promptLabel = getWallPromptShortLabel(getDrawingPromptIndex(d));
    let duration = d.durationSeconds !== undefined ? `${d.durationSeconds}s` : "undated";
    fill(86, 78, 70, 118);
    textSize(8.5);
    text(promptLabel, 4, layout.miniH + 28);
    text(duration, 4, layout.miniH + 40);
  }

  if (wallCamera.zoom >= 2.0) {
    fill(86, 78, 70, 105);
    textSize(8.5);
    text(`${countDrawingUnits(d)} trace units`, 4, layout.miniH + 52);
  }
}

function getWallPromptShortLabel(promptKey) {
  let labels = ["DEFAULT", "TOUCH", "TASTE", "IMPERFECT"];
  let index = Number(promptKey);
  if (!Number.isFinite(index) || index < 0 || index >= labels.length) return "MEMORY";
  return labels[index];
}

function getArchiveWallAppleAt(screenX, screenY) {
  let p = screenToWall(screenX, screenY);

  for (let i = archiveWallLayout.length - 1; i >= 0; i--) {
    let layout = archiveWallLayout[i];
    if (!layout) continue;

    let lx = (p.x - layout.x) / layout.scale;
    let ly = (p.y - layout.y) / layout.scale;

    if (lx >= 0 && lx <= layout.miniW && ly >= 0 && ly <= layout.miniH) {
      return i;
    }
  }

  return -1;
}

function drawArchiveWallDetailPopup() {
  if (page !== "archiveWall" || !selectedApple) return;

  let r = getArchiveWallPopupRect();

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.13)";
  drawingContext.shadowBlur = 22;
  drawingContext.shadowOffsetY = 12;
  noStroke();
  fill(251, 250, 246, 236);
  rect(r.x, r.y, r.w, r.h, 6);
  drawingContext.restore();

  let close = { x: r.x + r.w - 32, y: r.y + 18, w: 16, h: 16 };
  stroke(inkCol);
  strokeWeight(1.1);
  line(close.x, close.y, close.x + close.w, close.y + close.h);
  line(close.x + close.w, close.y, close.x, close.y + close.h);

  noStroke();
  fill(inkCol);
  textAlign(LEFT);
  textSize(13);
  text(`#${selectedAppleIndex + 1}`, r.x + 18, r.y + 28);

  fill(80);
  textSize(10);
  text(formatArchiveTime(selectedApple), r.x + 18, r.y + 48);
  text(`${selectedApple.durationSeconds || 0}s · ${countDrawingUnits(selectedApple)} trace units`, r.x + 18, r.y + 65);

  let thumbY = r.y + 82;
  fill(paperCol);
  stroke(226, 220, 210);
  rect(r.x + 18, thumbY, r.w - 36, 120, 4);

  push();
  translate(r.x + 30, thumbY + 12);
  drawStaticMini(selectedApple, r.w - 60, 96);
  pop();

  let promptKey = getDrawingPromptIndex(selectedApple);
  let taskText = prompts[promptKey] ? prompts[promptKey].task : "TASK";
  let titleText = prompts[promptKey] ? prompts[promptKey].shortTitle : "";
  noStroke();
  fill(inkCol);
  textSize(10);
  text(taskText, r.x + 18, thumbY + 148);
  fill(82);
  text(titleText, r.x + 18, thumbY + 168, r.w - 36);
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
  g.pixelDensity(1);
  g.clear();
  g.smooth();

  renderDrawingToGraphics(g, d, limit, true, alphaValue);

  image(g, 0, 0);

  try {
    if (g && g.canvas && g.canvas.parentNode) {
      g.canvas.parentNode.removeChild(g.canvas);
    }
  } catch (error) {
    console.warn("Could not remove replay graphics canvas:", error);
  }
}

function drawStaticMini(d, miniW, miniH) {
  let preview = getPreviewImage(d);
  if (preview) {
    drawImageContained(preview, 0, 0, miniW, miniH);
    return;
  }

  drawMissingImagePlaceholder(miniW, miniH);
}

function drawImageContained(img, x, y, boxW, boxH) {
  if (!img) return;

  let imgW = img.width || boxW;
  let imgH = img.height || boxH;
  if (imgW <= 0 || imgH <= 0) return;

  let scale = min(boxW / imgW, boxH / imgH);
  let drawW = imgW * scale;
  let drawH = imgH * scale;
  let drawX = x + (boxW - drawW) / 2;
  let drawY = y + (boxH - drawH) / 2;

  image(img, drawX, drawY, drawW, drawH);
}

function drawMissingImagePlaceholder(w, h) {
  push();
  noStroke();
  fill(248, 244, 236, 150);
  rect(0, 0, w, h, 6);
  stroke(210, 202, 190, 150);
  strokeWeight(1);
  noFill();
  rect(0.5, 0.5, w - 1, h - 1, 6);
  noStroke();
  fill(120, 112, 104, 140);
  textAlign(CENTER, CENTER);
  textSize(constrain(w * 0.08, 8, 12));
  text("image pending", w / 2, h / 2);
  pop();
}

function getCachedStaticMini(d, miniW, miniH) {
  return null;
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
