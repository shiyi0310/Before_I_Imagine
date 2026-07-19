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
let reflectionModalOpen = false;
let reflectionSavedDrawing = null;
let reflectionTextArea;
let reflectionSkipBtn;
let reflectionContinueBtn;
let reflectionError = "";
let reflectionUpdating = false;
let lastUndoTime = 0;
let repairingMissingDrawingImages = false;

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
let interfaceFont = '"JetBrains Mono", "IBM Plex Mono", Menlo, monospace';

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

function isCompactDesktop() {
  return !isMobileScreen() && width < 1280;
}

function shouldWrapDesktopToolbar() {
  return !isMobileScreen() && drawLayout && drawLayout.toolbarW < 700;
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
let archiveReplayState = null;
let archiveReplayKey = "";
let archiveReplayLoading = {};
let archiveReplayMiniBuffer = null;
let archiveReplayMiniBufferSize = { w: 0, h: 0 };
const ARCHIVE_IDLE_DELAY = 25000;
const ENABLE_ARCHIVE_IDLE_AUTOPLAY = true;
let archiveMode = "explore";
let archiveIsPaused = false;
let archiveLastInteractionTime = 0;
let archiveRowAutoPanTarget = [null, null, null, null];
let archiveRowManualPauseUntil = [0, 0, 0, 0];
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
let averagePromptIndex = 0;
let averageViewMode = "common";
let averageAppleCache = [null, null, null, null];
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
let lastPerformanceFrameRateKey = "";
let lastToolButtonStyleKey = "";
let lastButtonVisibilityKey = "";
const DEBUG_RENDER_LOOP = false;
let renderLoopActive = true;
let pendingRedrawReason = "";
let renderDebugLastLog = 0;
let archiveIdleTimeoutId = null;
let activeTimerCount = 0;

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
  archiveLastInteractionTime = millis();
  resetArchiveIdleTimer();
  if (typeof window !== "undefined") {
    window.beforeIImagineDebugRender = () => logRenderDebug(true);
  }
  
}

function draw() {
  updatePerformanceFrameRate();
  background(bgCol);
  applyCanvasTypography();
  updateMobileArchiveScrollMode();
  updateArchiveRowInertia();
  updateArchiveRowAutoFollow();
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
  updateRenderLoopState();
  pendingRedrawReason = "";
}

function requestRender(reason = "") {
  if (reason) pendingRedrawReason = reason;
  if (!renderLoopActive) redraw();
}

function archivePlaybackActive() {
  return (
    page === "draw" &&
    !modalOpen &&
    backgroundViewMode === "archive" &&
    archiveMode === "autoplay" &&
    !archiveIsPaused &&
    !selectedApple
  );
}

function selectedApplePlaybackActive() {
  return Boolean(page === "draw" && selectedApple);
}

function renderNeedsContinuousLoop() {
  if (currentAction) return true;
  if (reflectionModalOpen && reflectionUpdating) return true;
  if (selectedApplePlaybackActive()) return true;
  if (archivePlaybackActive()) return true;
  if (abs(archiveTransition - archiveTargetTransition) > 0.01) return true;
  if (page === "draw" && !modalOpen && backgroundViewMode === "wall") return true;
  if (page === "archiveWall" || page === "layer") return true;
  if (archiveRowDragging || isWallPanning || isArchivePanning) return true;
  for (let v of archiveRowVelocity) {
    if (abs(v || 0) > 0.02) return true;
  }
  return false;
}

function updateRenderLoopState() {
  let shouldLoop = renderNeedsContinuousLoop();
  if (shouldLoop && !renderLoopActive) {
    renderLoopActive = true;
    loop();
  } else if (!shouldLoop && renderLoopActive) {
    renderLoopActive = false;
    noLoop();
  }
  logRenderDebug(false);
}

function logRenderDebug(force) {
  if (!DEBUG_RENDER_LOOP && !force) return;
  let now = millis ? millis() : 0;
  if (!force && now - renderDebugLastLog < 2000) return;
  renderDebugLastLog = now;
  console.log("[Before I Imagine render]", {
    page,
    backgroundViewMode,
    modalOpen,
    renderLoopActive,
    fps: frameRate ? Number(frameRate().toFixed(1)) : null,
    playbackActive: archivePlaybackActive() || selectedApplePlaybackActive(),
    timers: activeTimerCount,
    reason: pendingRedrawReason || "frame"
  });
}

function updatePerformanceFrameRate() {
  let targetRate = 30;
  if (isMobileScreen()) {
    targetRate = modalOpen ? 36 : 24;
  } else if (page === "draw" && modalOpen) {
    targetRate = currentAction ? 60 : 45;
  } else if (page === "draw" && !modalOpen && backgroundViewMode === "archive") {
    targetRate = 30;
  } else if (page === "draw" && !modalOpen) {
    targetRate = 24;
  }
  if (reflectionModalOpen) targetRate = min(targetRate, 30);

  let key = `${targetRate}:${page}:${modalOpen}:${backgroundViewMode}:${Boolean(currentAction)}:${reflectionModalOpen}`;
  if (key === lastPerformanceFrameRateKey) return;
  lastPerformanceFrameRateKey = key;
  frameRate(targetRate);
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

  createReflectionInterface();

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
    let wrapToolbar = shouldWrapDesktopToolbar();
    let innerX = drawLayout.toolbarX + 18;
    let innerY = drawLayout.toolbarY + (wrapToolbar ? 24 : 26);
    let innerW = drawLayout.toolbarW - 36;
    let compact = isCompactDesktop();
    let gap = compact ? 6 : 8;
    let pickerW = compact ? 50 : 58;
    let sliderW = constrain(innerW * (compact ? 0.16 : 0.18), 92, compact ? 116 : 136);
    let toolBtnW = compact ? 70 : 78;
    let clearBtnW = compact ? 62 : 70;
    let nextBtnW = wrapToolbar
      ? (compact ? 110 : 122)
      : constrain(innerW - (pickerW + 28 + sliderW + gap * 7 + toolBtnW * 3 + clearBtnW), compact ? 96 : 112, compact ? 132 : 156);

    colorPicker.position(innerX, innerY + 18);
    colorPicker.size(pickerW, 30);
    sizeSlider.position(innerX + pickerW + 34, innerY + 26);
    sizeSlider.size(sliderW);

    let toolX = innerX + pickerW + 34 + sliderW + gap * 3;
    brushBtn.position(toolX, innerY);
    bucketBtn.position(toolX + (toolBtnW + gap), innerY);
    eraserBtn.position(toolX + (toolBtnW + gap) * 2, innerY);

    let actionX = wrapToolbar
      ? drawLayout.toolbarX + drawLayout.toolbarW - 18 - clearBtnW - gap - nextBtnW
      : toolX + (toolBtnW + gap) * 3 + gap;
    let actionY = wrapToolbar ? drawLayout.toolbarY + 84 : innerY;
    clearBtn.position(actionX, actionY);
    submitBtn.position(-9999, -9999);
    nextPromptBtn.position(actionX + clearBtnW + gap, actionY);
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
    let compact = isCompactDesktop();
    setDesktopButtonAutoSize(brushBtn, compact ? 70 : 78, compact ? "7px 10px" : "8px 14px");
    setDesktopButtonAutoSize(bucketBtn, compact ? 70 : 78, compact ? "7px 10px" : "8px 14px");
    setDesktopButtonAutoSize(eraserBtn, compact ? 70 : 82, compact ? "7px 10px" : "8px 14px");
    setDesktopButtonAutoSize(clearBtn, compact ? 62 : 70, compact ? "7px 10px" : "8px 14px");
    submitBtn.size(1, 1);
    setDesktopButtonAutoSize(nextPromptBtn, compact ? 96 : 122, compact ? "8px 10px" : "10px 16px");
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

  layoutReflectionInterface();

}

function createReflectionInterface() {
  reflectionTextArea = createElement("textarea", "");
  reflectionTextArea.attribute("placeholder", "I was thinking about...");
  reflectionTextArea.style("position", "absolute");
  reflectionTextArea.style("resize", "none");
  reflectionTextArea.style("box-sizing", "border-box");
  reflectionTextArea.style("font-family", interfaceFont);
  reflectionTextArea.style("font-size", "13px");
  reflectionTextArea.style("line-height", "1.35");
  reflectionTextArea.style("padding", "10px 12px");
  reflectionTextArea.style("border", "1px solid rgba(43, 41, 38, 0.45)");
  reflectionTextArea.style("border-radius", "8px");
  reflectionTextArea.style("background", "rgba(251, 250, 246, 0.94)");
  reflectionTextArea.style("color", inkCol);
  reflectionTextArea.style("outline", "none");
  reflectionTextArea.style("z-index", "260");
  reflectionTextArea.style("pointer-events", "auto");
  reflectionTextArea.style("touch-action", "manipulation");
  reflectionTextArea.hide();

  reflectionSkipBtn = createButton("Skip<br>跳过");
  reflectionSkipBtn.mousePressed(() => handleReflectionChoice(false));
  reflectionContinueBtn = createButton("Continue<br>继续");
  reflectionContinueBtn.mousePressed(() => handleReflectionChoice(true));
  reflectionSkipBtn.elt.addEventListener("touchend", event => handleReflectionTouchChoice(event, false), { passive: false });
  reflectionContinueBtn.elt.addEventListener("touchend", event => handleReflectionTouchChoice(event, true), { passive: false });

  for (let btn of [reflectionSkipBtn, reflectionContinueBtn]) {
    styleButton(btn);
    btn.style("position", "absolute");
    btn.style("height", "auto");
    btn.style("min-height", "42px");
    btn.style("border-radius", "999px");
    btn.style("font-size", "12px");
    btn.style("padding", "8px 16px");
    btn.style("z-index", "260");
    btn.style("pointer-events", "auto");
    btn.style("touch-action", "manipulation");
  }
  reflectionSkipBtn.hide();
  reflectionContinueBtn.hide();
  reflectionSkipBtn.style("background", "rgba(251, 250, 246, 0.88)");
  reflectionSkipBtn.style("color", inkCol);
  reflectionContinueBtn.style("background", "#222");
  reflectionContinueBtn.style("color", "#fff");
}

function getReflectionModalRect() {
  let modalW = isMobileScreen() ? max(280, width - 40) : min(480, max(420, width - getDrawSidebarWidth() - 120));
  let pad = isMobileScreen() ? 20 : 24;
  let textAreaH = isMobileScreen() ? 86 : 92;
  let buttonH = 42;
  let errorH = reflectionError ? 20 : 0;
  let stackButtons = isMobileScreen() && modalW < 360;
  let buttonAreaH = stackButtons ? buttonH * 2 + 8 : buttonH;
  let contentH = pad + 16 + 18 + 44 + 28 + 18 + textAreaH + 16 + errorH + buttonAreaH + pad;
  let modalH = min(contentH, height - 48);
  return {
    x: (width - modalW) / 2,
    y: (height - modalH) / 2,
    w: modalW,
    h: modalH
  };
}

function getReflectionLayout() {
  let r = getReflectionModalRect();
  let pad = isMobileScreen() ? 20 : 24;
  let y = r.y + pad;
  let labelY = y;
  y += 34;
  let questionY = y;
  y += 48;
  let supportY = y;
  y += 46;
  let textareaY = y;
  let textareaH = isMobileScreen() ? 86 : 92;
  y += textareaH + 14;
  let errorY = y;
  if (reflectionError) y += 22;
  let buttonH = 42;
  let buttonY = min(r.y + r.h - pad - buttonH, y);
  let gap = 12;
  let stackButtons = isMobileScreen() && r.w < 360;
  let btnW = stackButtons ? r.w - pad * 2 : min(124, (r.w - pad * 2 - gap) / 2);

  return {
    rect: r,
    pad: pad,
    labelY: labelY,
    questionY: questionY,
    supportY: supportY,
    textareaX: r.x + pad,
    textareaY: textareaY,
    textareaW: r.w - pad * 2,
    textareaH: textareaH,
    errorY: errorY,
    buttonY: buttonY,
    buttonH: buttonH,
    skipX: stackButtons ? r.x + pad : r.x + r.w - pad - btnW * 2 - gap,
    continueX: stackButtons ? r.x + pad : r.x + r.w - pad - btnW,
    continueY: stackButtons ? buttonY + buttonH + 8 : buttonY,
    buttonW: btnW,
    stackButtons: stackButtons
  };
}

function layoutReflectionInterface() {
  if (!reflectionTextArea || !reflectionSkipBtn || !reflectionContinueBtn) return;
  let layout = getReflectionLayout();
  reflectionTextArea.position(layout.textareaX, layout.textareaY);
  reflectionTextArea.size(layout.textareaW, layout.textareaH);
  reflectionSkipBtn.position(layout.skipX, layout.buttonY);
  reflectionContinueBtn.position(layout.continueX, layout.continueY);
  reflectionSkipBtn.size(layout.buttonW, layout.buttonH);
  reflectionContinueBtn.size(layout.buttonW, layout.buttonH);
}

function styleButton(btn) {
  btn.style("font-size", "13px");
  btn.style("line-height", "1.18");
  btn.style("padding", "6px 12px");
  btn.style("height", "auto");
  btn.style("min-height", "44px");
  btn.style("min-width", "56px");
  btn.style("max-width", "100%");
  btn.style("box-sizing", "border-box");
  btn.style("border", "1px solid #2b2926");
  btn.style("background", "#f9f6ef");
  btn.style("border-radius", "0px");
  btn.style("font-family", interfaceFont);
  btn.style("font-weight", "400");
  btn.style("letter-spacing", "0.02em");
  btn.style("white-space", "normal");
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
  btn.style("height", mobile ? "34px" : "auto");
  btn.style("min-height", mobile ? "34px" : "48px");
  btn.style("min-width", mobile ? "0" : "68px");
  btn.style("max-width", "100%");
  btn.style("box-sizing", "border-box");
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
  btn.style("min-height", isCompactDesktop() ? "46px" : "52px");
  btn.style("padding", padding);
  btn.style("box-sizing", "border-box");
  btn.style("white-space", isCompactDesktop() ? "normal" : "nowrap");
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
  let styleKey = currentTool;
  if (styleKey === lastToolButtonStyleKey) return;
  lastToolButtonStyleKey = styleKey;

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
  let visibilityKey = `${page}:${modalOpen}:${reflectionModalOpen}:${promptIndex}:${backgroundViewMode}`;
  if (visibilityKey === lastButtonVisibilityKey) return;
  lastButtonVisibilityKey = visibilityKey;

  updatePromptFlowButtonLabel();
  updateReflectionVisibility();

  if (page === "draw") {
    if (modalOpen && !reflectionModalOpen) {
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

function updateReflectionVisibility() {
  if (!reflectionTextArea || !reflectionSkipBtn || !reflectionContinueBtn) return;
  if (reflectionModalOpen) {
    layoutReflectionInterface();
    reflectionTextArea.show();
    reflectionSkipBtn.show();
    reflectionContinueBtn.show();
  } else {
    reflectionTextArea.hide();
    reflectionSkipBtn.hide();
    reflectionContinueBtn.hide();
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

  let compact = isCompactDesktop();
  let sideGap = compact ? 28 : 48;
  let availableX = sidebarW + sideGap;
  let availableW = max(320, width - sidebarW - sideGap * 2);
  let modalW = constrain(availableW, compact ? 560 : 700, 850);
  let modalPad = compact ? 16 : 18;
  let cardH = compact ? 150 : 154;
  let toolbarH = compact && modalW < 700 ? 138 : (compact ? 92 : 96);
  let gap = compact ? 14 : 18;
  let desiredDrawH = constrain(height * (compact ? 0.32 : 0.34), compact ? 220 : 250, compact ? 300 : 330);
  let modalH = modalPad * 2 + cardH + gap + desiredDrawH + gap + toolbarH;
  modalH = min(modalH, height - (compact ? 96 : 120));
  let drawH = max(compact ? 190 : 220, modalH - modalPad * 2 - cardH - toolbarH - gap * 2);
  let modalX = availableX + (availableW - modalW) / 2;
  let modalY = max(compact ? 70 : 78, (height - modalH) / 2);
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
    if (backgroundViewMode === "report") {
      drawAppleReportView();
    } else if (backgroundViewMode === "average") {
      drawAverageAppleView();
    } else if (backgroundViewMode === "archive") {
      drawMemoryArchiveView();
      drawFloatingArchiveApples();
    } else {
      drawFloatingArchiveApples();
    }
    drawDrawPageSidebar();
    drawBackgroundViewSwitcher();
  } else if (mobileArchiveReady && !modalOpen) {
    if (backgroundViewMode === "report") {
      drawAppleReportView();
    } else if (backgroundViewMode === "average") {
      drawAverageAppleView();
    } else if (backgroundViewMode === "archive") {
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
  } else if (backgroundViewMode !== "average" && backgroundViewMode !== "report") {
    drawReopenDrawingButton();
  }

  if (!modalOpen && backgroundViewMode === "archive") {
    drawSelectedApplePopup();
  }

  if (reflectionModalOpen) {
    drawReflectionModal();
  }

}

function drawReflectionModal() {
  layoutReflectionInterface();
  let layout = getReflectionLayout();
  let r = layout.rect;

  drawingContext.save();
  drawingContext.filter = "blur(0px)";
  noStroke();
  fill(244, 241, 235, 118);
  rect(0, 0, width, height);
  drawingContext.restore();

  drawingContext.save();
  drawingContext.shadowColor = "rgba(42, 35, 25, 0.16)";
  drawingContext.shadowBlur = 24;
  drawingContext.shadowOffsetY = 12;
  noStroke();
  fill(251, 250, 246, 238);
  rect(r.x, r.y, r.w, r.h, 12);
  drawingContext.restore();

  noFill();
  stroke(43, 41, 38, 70);
  strokeWeight(1);
  rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 12);

  let pad = layout.pad;
  fill(inkCol);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(11);
  text("REFLECTION / 想法", r.x + pad, layout.labelY, r.w - pad * 2);

  textSize(isMobileScreen() ? 15 : 16);
  textStyle(BOLD);
  text("What were you thinking about while drawing this apple?", r.x + pad, layout.questionY, r.w - pad * 2);
  textStyle(NORMAL);
  textSize(isMobileScreen() ? 13 : 14);
  text("画这个苹果时，你想到了什么？", r.x + pad, layout.questionY + 24, r.w - pad * 2);

  fill(mutedCol);
  textSize(12);
  text("Images, memories, feelings, or concerns.", r.x + pad, layout.supportY, r.w - pad * 2);
  text("可以写下你想到的图像、记忆、感受或担忧。", r.x + pad, layout.supportY + 18, r.w - pad * 2);

  if (reflectionError) {
    fill(146, 48, 36);
    textSize(11);
    text(reflectionError, r.x + pad, layout.errorY, r.w - pad * 2);
  }
}

function drawPaperBackground() {
  noStroke();
  fill(bgCol);
  rect(0, 0, width, height);
}

function getDrawSidebarWidth() {
  if (isMobileScreen()) return 0;
  return constrain(width * (isCompactDesktop() ? 0.18 : 0.135), isCompactDesktop() ? 176 : 198, isCompactDesktop() ? 210 : 232);
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
  let w = isMobileScreen() ? min(width - 24, 360) : min(590, width - getDrawSidebarWidth() - 36);
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
      let sepX = options[i].x + options[i].w + options[i].gap / 2;
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
    { mode: "draw", label: "DRAW", w: 48 },
    { mode: "wall", label: "WALL", w: 48 },
    { mode: "archive", label: "ARCHIVE", w: 68 },
    { mode: "report", label: "REPORT", w: 62 }
  ] : [
    { mode: "draw", label: "DRAW", w: 62 },
    { mode: "archive", label: "ARCHIVE", w: 82 },
    { mode: "wall", label: "WALL", w: 62 },
    { mode: "average", label: "AVERAGE APPLE", w: 112 },
    { mode: "report", label: "REPORT", w: 72 }
  ];
  let sidePadding = isMobileScreen() ? 14 : 24;
  let labelsW = labels.reduce((sum, item) => sum + item.w, 0);
  let gap = max(6, (r.w - sidePadding * 2 - labelsW) / max(1, labels.length - 1));
  let x = r.x + sidePadding;

  for (let item of labels) {
    item.x = x;
    item.gap = gap;
    x += item.w + gap;
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
  if (backgroundViewMode === "average" || backgroundViewMode === "report") return;

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
  let pad = isCompactDesktop() ? 22 : 30;
  let innerW = max(1, w - pad * 2);

  noStroke();
  fill(251, 250, 246, 232);
  rect(0, 0, w, height);

  fill("#2470ff");
  textAlign(LEFT);
  textSize(isCompactDesktop() ? 12 : 14);
  drawingContext.letterSpacing = "2px";
  let brandY = 42;
  let brandLineH = isCompactDesktop() ? 18 : 20;
  text("BEFORE I", pad, brandY);
  text("IMAGINE", pad, brandY + brandLineH);
  drawingContext.letterSpacing = "0px";

  fill(mutedCol);
  textSize(isCompactDesktop() ? 9.5 : 10);
  let subtitleY = brandY + brandLineH * 2 + 10;
  let subtitleLineH = 15;
  text("A sensory drawing", pad, subtitleY);
  text("experiment", pad, subtitleY + subtitleLineH);

  fill(inkCol);
  textSize(11);
  text("•  ARCHIVE", pad, 142, innerW);
  textSize(isCompactDesktop() ? 24 : 28);
  text(String(archive.length), pad, 182, innerW);
  fill(mutedCol);
  textSize(11);
  text("Apples collected", pad, 204, innerW);

  drawSidebarSparkline(pad, 242, innerW, 24);

  let archivePageOpen = page === "draw" && !modalOpen && backgroundViewMode === "archive";
  if (!archivePageOpen) {
    fill(mutedCol);
    textSize(11);
    text("RECENT APPLES", pad, 302, innerW);
    drawSidebarRecentApples(pad, 330, innerW);
  }

  stroke(226, 220, 210);
  strokeWeight(1);
  let aboutY = max(460, min(height - 226, 520));
  line(pad, aboutY - 28, w - pad, aboutY - 28);

  noStroke();
  fill(inkCol);
  textSize(11);
  text("ABOUT", pad, aboutY, innerW);
  fill(70);
  textSize(11);
  textLeading(19);
  text("Draw from memory.\nNot from images.\nNot from search.\nJust what comes first.", pad, aboutY + 44, innerW);

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
    text(recent[i] ? formatRelativeArchiveTime(recent[i], i) : "waiting", x + 32, rowY + 4, max(1, w - 32));
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

  drawLayout = getDrawingLayout();
  let mobile = isMobileScreen();
  let sidebarW = mobile ? 0 : getDrawSidebarWidth();
  let count = backgroundViewMode === "archive" ? archive.length : (mobile ? min(archive.length, 24) : archive.length);
  let recent = archive.slice(-count);
  let archiveStartIndex = archive.length - recent.length;
  let left = sidebarW + (mobile ? 18 : 34);
  let right = width - (mobile ? 18 : 34);
  let top = mobile ? 86 : 28;
  let bottom = height - (mobile ? 190 : 40);
  let cardW = mobile ? 62 : 86;
  let cardH = mobile ? 62 : 86;
  let filmMetrics = getArchiveFilmMetrics();
  let archiveCardW = filmMetrics.cardW;
  let archiveCardH = filmMetrics.cardH;
  let archiveStartX = filmMetrics.startX;
  let archiveTop = getArchiveRowsTop();
  let archiveRowGap = getArchiveRowGap();
  let archiveStepX = filmMetrics.stepX;
  let rowSeen = [0, 0, 0, 0];
  let protectedZones = getDrawBackgroundProtectedZones();

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
    for (let attempt = 0; attempt < 16 && pointInProtectedBackgroundZone(x, scatterY, protectedZones); attempt++) {
      x = random(left, right);
      scatterY = random(top, bottom);
    }
    let scatterRotation = random(-0.18, 0.18);
    let d = recent[i];
    let rowIndex = getDrawingPromptIndex(d);
    if (rowIndex === null || rowIndex < 0 || rowIndex > 3) rowIndex = 0;
    let rowCol = rowSeen[rowIndex]++;
    let archiveRotation = 0;

    drawBackgroundApplesLayout.push({
      archiveIndex: archiveStartIndex + i,
      x: x,
      y: scatterY,
      scatterX: x,
      scatterY: scatterY,
      scatterRotation: scatterRotation,
      archiveX: archiveStartX + rowCol * archiveStepX,
      archiveY: archiveTop + rowIndex * archiveRowGap + archiveCardH / 2 + 34,
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

function getDrawBackgroundProtectedZones() {
  if (isMobileScreen()) return [];
  let zones = [];
  zones.push({ x: 0, y: 0, w: getDrawSidebarWidth() + 26, h: height });
  let nav = getBackgroundViewSwitcherRect();
  zones.push({ x: nav.x - 28, y: nav.y - 24, w: nav.w + 56, h: nav.h + 48 });
  if (modalOpen && drawLayout && drawLayout.modalW) {
    zones.push({
      x: drawLayout.modalX - 36,
      y: drawLayout.modalY - 32,
      w: drawLayout.modalW + 72,
      h: drawLayout.modalH + 64
    });
  }
  return zones;
}

function pointInProtectedBackgroundZone(x, y, zones) {
  for (let zone of zones) {
    if (
      x >= zone.x &&
      x <= zone.x + zone.w &&
      y >= zone.y &&
      y <= zone.y + zone.h
    ) {
      return true;
    }
  }
  return false;
}

function drawFloatingArchiveApples() {
  if (isMobileScreen() && (!mobileArchiveReady || modalOpen)) return;
  if (archive.length === 0) return;
  if (drawBackgroundApplesLayout.length === 0) generateDrawBackgroundApplesLayout();

  let mobile = isMobileScreen();

  if (backgroundViewMode === "archive") {
    updateArchiveFilmReplay();
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
    let loopOffsets = isArchiveMode ? getArchiveFilmDrawOffsets(item) : [0];
    for (let loopOffset of loopOffsets) {
    let drawX = isArchiveMode ? archiveX : lerp(scatterX, archiveX, archiveTransition);
    if (isArchiveMode) drawX += loopOffset;
    let drawY = isArchiveMode ? archiveY : lerp(scatterY, archiveY, archiveTransition);
    let drawRotation = isArchiveMode ? 0 : lerp(item.scatterRotation, item.archiveRotation, archiveTransition);
    let drawSize = isArchiveMode ? item.archiveW : lerp(item.size, item.archiveW, archiveTransition);
    let cardH = isArchiveMode ? item.archiveH : lerp(item.size, item.archiveH, archiveTransition);
    let hovered = isArchiveMode && archiveCardHitTest(mouseX, mouseY, item, drawX, drawY, drawSize, cardH);
    item.lift = 0;

    push();
    translate(drawX, drawY);
    rotate(drawRotation + (mobile || isArchiveMode ? 0 : sin(t * 1.4) * 0.025));
    item.currentDrawLoop = isArchiveMode ? round(loopOffset / getArchiveFilmLoopWidth(item.rowIndex)) : 0;

    if (isArchiveMode) {
      drawArchiveTarotCard(d, item, drawSize, cardH, hovered);
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
    item.currentDrawLoop = 0;
    }
  }

}

function getArchiveFilmDrawOffsets(item) {
  if (isMobileScreen()) return [0];
  let cycleW = getArchiveFilmLoopWidth(item.rowIndex);
  if (cycleW <= 0) return [0];
  let rowPan = archiveRowPan[item.rowIndex] || 0;
  let offsets = [];
  let frame = getArchiveVisibleRowFrame();
  let left = frame.x - item.archiveX - rowPan - item.archiveW;
  let right = frame.x + frame.w - item.archiveX - rowPan + item.archiveW;
  let firstLoop = floor(left / cycleW) - 1;
  let lastLoop = ceil(right / cycleW) + 1;
  for (let k = firstLoop; k <= lastLoop; k++) {
    offsets.push(k * cycleW);
  }
  return offsets;
}

function getAverageAppleLayout() {
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let contentX = sidebarW;
  let contentW = width - sidebarW;
  let promptY = isMobileScreen() ? 82 : 112;
  let promptGap = isMobileScreen() ? 5 : 7;
  let promptW = min(isMobileScreen() ? 76 : 112, (contentW - 36 - promptGap * 3) / 4);
  let promptTotalW = promptW * 4 + promptGap * 3;
  let promptX = contentX + (contentW - promptTotalW) / 2;
  let promptTabs = ["DEFAULT", "TOUCH", "TASTE", "IMPERFECT"].map((label, index) => ({
    type: "prompt",
    value: index,
    label: label,
    x: promptX + index * (promptW + promptGap),
    y: promptY,
    w: promptW,
    h: isMobileScreen() ? 26 : 28
  }));

  let viewY = promptY + (isMobileScreen() ? 34 : 38);
  let viewGap = isMobileScreen() ? 5 : 7;
  let viewLabels = [
    { value: "all", label: isMobileScreen() ? "ALL" : "ALL DRAWINGS" },
    { value: "common", label: "COMMON TRACE" },
    { value: "average", label: "AVERAGE APPLE" }
  ];
  let saveGap = isMobileScreen() ? 6 : 12;
  let saveW = isMobileScreen() ? 82 : 104;
  let viewW;
  let viewX;
  if (isMobileScreen()) {
    let availableControlsW = contentW - 24;
    viewW = min(88, (availableControlsW - saveW - saveGap - viewGap * 2) / 3);
    let controlsTotalW = viewW * 3 + viewGap * 2 + saveGap + saveW;
    viewX = contentX + (contentW - controlsTotalW) / 2;
  } else {
    viewW = min(142, (contentW - 32 - viewGap * 2) / 3);
    let viewTotalW = viewW * 3 + viewGap * 2;
    viewX = contentX + (contentW - viewTotalW) / 2;
  }
  let viewTabs = viewLabels.map((item, index) => ({
    type: "view",
    value: item.value,
    label: item.label,
    x: viewX + index * (viewW + viewGap),
    y: viewY,
    w: viewW,
    h: isMobileScreen() ? 28 : 30
  }));
  let panelTop = viewY + (isMobileScreen() ? 48 : 56);
  let maxPanel = min(contentW - (isMobileScreen() ? 30 : 100), height - panelTop - 34);
  let panelSize = constrain(maxPanel, isMobileScreen() ? 230 : 300, isMobileScreen() ? 430 : 620);
  let panel = {
    x: contentX + (contentW - panelSize) / 2,
    y: panelTop,
    w: panelSize,
    h: panelSize
  };
  let saveButton = isMobileScreen() ? {
    x: viewX + viewW * 3 + viewGap * 2 + saveGap,
    y: viewY,
    w: saveW,
    h: 28
  } : {
    x: min(width - saveW - 24, panel.x + panel.w + 24),
    y: panel.y + panel.h * 0.42,
    w: saveW,
    h: 30
  };

  return {
    contentX: contentX,
    contentW: contentW,
    promptTabs: promptTabs,
    viewTabs: viewTabs,
    saveButton: saveButton,
    panel: panel
  };
}

function drawAverageAppleView() {
  ensureAveragePromptCache(averagePromptIndex);
  let layout = getAverageAppleLayout();
  let cache = averageAppleCache[averagePromptIndex];

  noStroke();
  fill(52, 48, 44, 220);
  textAlign(LEFT, CENTER);
  textSize(isMobileScreen() ? 13 : 16);
  text("AVERAGE APPLE", layout.contentX + (isMobileScreen() ? 18 : 46), isMobileScreen() ? 72 : 92);

  drawAverageControlTabs(layout.promptTabs, averagePromptIndex);
  drawAverageControlTabs(layout.viewTabs, averageViewMode);
  drawAverageSaveButton(layout.saveButton, cache && cache.status === "ready" && cache.count > 0);

  let panel = layout.panel;
  drawingContext.save();
  drawingContext.shadowColor = "rgba(48, 39, 29, 0.12)";
  drawingContext.shadowBlur = 28;
  drawingContext.shadowOffsetY = 14;
  noStroke();
  fill(252, 249, 242, 205);
  rect(panel.x, panel.y, panel.w, panel.h, 9);
  drawingContext.restore();
  noFill();
  stroke(218, 208, 195, 145);
  strokeWeight(1);
  rect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1, 9);

  let canDrawPreviewComposite = Boolean(
    cache &&
    averageViewMode === "all" &&
    cache.previewItems &&
    cache.previewItems.length > 0
  );
  if ((!cache || cache.status === "loading") && !canDrawPreviewComposite) {
    let loaded = cache ? cache.loaded : 0;
    let total = cache ? cache.total : 0;
    noStroke();
    fill(mutedCol);
    textAlign(CENTER, CENTER);
    textSize(isMobileScreen() ? 11 : 12);
    text(total > 0 ? `reading drawing traces  ${loaded} / ${total}` : "reading drawing traces", panel.x + panel.w / 2, panel.y + panel.h / 2);
    return;
  }

  let visibleDrawingCount = averageViewMode === "all"
    ? cache.previewItems.length
    : cache.count;
  if ((cache.status === "error" && averageViewMode !== "all") || visibleDrawingCount === 0) {
    noStroke();
    fill(mutedCol);
    textAlign(CENTER, CENTER);
    textSize(isMobileScreen() ? 11 : 12);
    let emptyMessage = averageViewMode === "all"
      ? "No drawing images in this prompt."
      : "No valid brush traces in this prompt.";
    text(cache.status === "error" ? "Could not build this trace." : emptyMessage, panel.x + panel.w / 2, panel.y + panel.h / 2);
    return;
  }

  if (averageViewMode === "all") {
    drawAverageAllDrawingsComposite(cache, panel);
  } else {
    let buffer = averageViewMode === "average" ? cache.average : cache.common;
    if (buffer) image(buffer, panel.x, panel.y, panel.w, panel.h);
  }

  noStroke();
  fill(82, 75, 68, 170);
  textAlign(CENTER, CENTER);
  textSize(isMobileScreen() ? 9 : 10);
  let promptName = ["DEFAULT", "TOUCH MEMORY", "TASTE MEMORY", "IMPERFECT MEMORY"][averagePromptIndex];
  text(`${promptName}  ·  ${visibleDrawingCount} valid drawings`, panel.x + panel.w / 2, panel.y + panel.h + 18);
}

function drawAverageAllDrawingsComposite(cache, panel) {
  let items = cache.previewItems || [];
  let imageSize = min(panel.w, panel.h) * 0.84;
  let imageAlpha = constrain(34 - items.length * 0.08, 20, 34);
  let centerX = panel.x + panel.w / 2;
  let centerY = panel.y + panel.h / 2;

  for (let layer = 2; layer >= 0; layer--) {
    let offset = (layer + 1) * 4;
    noFill();
    stroke(255, 255, 255, 45 + layer * 10);
    strokeWeight(1);
    rect(panel.x + offset, panel.y - offset, panel.w, panel.h, 9);
  }

  for (let item of items) {
    let drawing = archive[item.archiveIndex];
    if (!drawing) continue;
    if (!item.cachedThumb) item.cachedThumb = getPreviewImage(drawing);
    if (!item.cachedThumb) continue;

    let seed = item.archiveIndex + 1;
    let offsetX = sin(seed * 2.17) * min(12, panel.w * 0.025);
    let offsetY = cos(seed * 1.63) * min(10, panel.h * 0.02);
    let rotation = sin(seed * 0.91) * 0.02;
    push();
    translate(centerX + offsetX, centerY + offsetY);
    rotate(rotation);
    tint(255, imageAlpha);
    drawImageContained(item.cachedThumb, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
    noTint();
    pop();
  }
}

function drawAverageControlTabs(tabs, activeValue) {
  for (let tab of tabs) {
    let active = tab.value === activeValue;
    noStroke();
    fill(active ? 43 : 251, active ? 40 : 249, active ? 36 : 244, active ? 226 : 205);
    rect(tab.x, tab.y, tab.w, tab.h, tab.h / 2);
    if (!active) {
      noFill();
      stroke(166, 157, 145, 125);
      strokeWeight(1);
      rect(tab.x + 0.5, tab.y + 0.5, tab.w - 1, tab.h - 1, tab.h / 2);
    }
    noStroke();
    fill(active ? 250 : 92, active ? 248 : 85, active ? 244 : 77);
    textAlign(CENTER, CENTER);
    textSize(isMobileScreen() ? 7.5 : 9);
    text(tab.label, tab.x + tab.w / 2, tab.y + tab.h / 2 + 0.5);
  }
}

function drawAverageSaveButton(button, enabled) {
  noStroke();
  fill(enabled ? 251 : 236, enabled ? 249 : 232, enabled ? 244 : 226, enabled ? 215 : 150);
  rect(button.x, button.y, button.w, button.h, button.h / 2);
  noFill();
  stroke(155, 145, 133, enabled ? 145 : 70);
  strokeWeight(1);
  rect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1, button.h / 2);
  noStroke();
  fill(78, 71, 64, enabled ? 220 : 90);
  textAlign(CENTER, CENTER);
  textSize(isMobileScreen() ? 7.5 : 9);
  text("SAVE IMAGE", button.x + button.w / 2, button.y + button.h / 2 + 0.5);
}

function handleAverageAppleClick(x, y) {
  if (modalOpen || backgroundViewMode !== "average") return false;
  let layout = getAverageAppleLayout();
  for (let tab of layout.promptTabs) {
    if (pointInsideRect(x, y, tab)) {
      averagePromptIndex = tab.value;
      ensureAveragePromptCache(averagePromptIndex);
      return true;
    }
  }
  for (let tab of layout.viewTabs) {
    if (pointInsideRect(x, y, tab)) {
      averageViewMode = tab.value;
      return true;
    }
  }
  if (pointInsideRect(x, y, layout.saveButton)) {
    saveAverageAppleSVG();
    return true;
  }
  return false;
}

function ensureAveragePromptCache(promptIndex) {
  let existing = averageAppleCache[promptIndex];
  if (existing && (existing.status === "loading" || existing.status === "ready")) return;

  let indices = [];
  for (let i = 0; i < archive.length; i++) {
    if (getDrawingPromptIndex(archive[i]) === promptIndex) indices.push(i);
  }

  let entry = {
    status: "loading",
    total: indices.length,
    loaded: 0,
    count: 0,
    previewItems: indices
      .filter((index) => hasPreviewData(archive[index]))
      .map((index) => ({ archiveIndex: index, cachedThumb: null })),
    all: null,
    common: null,
    average: null,
    exportData: null
  };
  averageAppleCache[promptIndex] = entry;

  (async () => {
    try {
      let drawings = [];
      let batchSize = 5;
      for (let start = 0; start < indices.length; start += batchSize) {
        let batch = indices.slice(start, start + batchSize);
        let loadedBatch = await Promise.all(batch.map(loadAverageDrawingActions));
        drawings.push(...loadedBatch.filter(Boolean));
        entry.loaded = min(indices.length, start + batch.length);
      }

      if (averageAppleCache[promptIndex] !== entry) return;
      let normalized = [];
      for (let drawing of drawings) {
        try {
          let result = normalizeDrawingForAverage(drawing, 800, 80);
          if (result) normalized.push(result);
        } catch (error) {
          console.warn("Skipping drawing during Average Apple normalization:", drawing && drawing.dbId, error);
        }
      }

      let buffers = buildAverageAppleBuffers(normalized, 800);
      entry.status = "ready";
      entry.count = normalized.length;
      entry.all = buffers.all;
      entry.common = buffers.common;
      entry.average = buffers.average;
      entry.exportData = buffers.exportData;
    } catch (error) {
      console.warn("Could not build Average Apple:", error);
      entry.status = "error";
    }
  })();
}

async function loadAverageDrawingActions(index) {
  let drawing = archive[index];
  if (!drawing) return null;
  if (Array.isArray(drawing.actions)) return drawing;
  if (!drawing.dbId) return null;

  try {
    let response = await fetch(`/api/drawings/${drawing.dbId}`);
    if (!response.ok) throw new Error(await response.text());
    let fullDrawing = normalizeDrawingData(await response.json());
    if (!fullDrawing) return null;
    archive[index] = {
      ...drawing,
      ...fullDrawing,
      thumb_url: fullDrawing.thumb_url || drawing.thumb_url || null,
      image_url: fullDrawing.image_url || drawing.image_url || null
    };
    return archive[index];
  } catch (error) {
    console.warn("Could not load drawing actions for Average Apple:", drawing.dbId, error);
    return null;
  }
}

function normalizeDrawingForAverage(drawing, targetSize, padding) {
  let strokes = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let action of drawing.actions || []) {
    if (!action || action.type !== "stroke" || (action.tool && action.tool !== "brush")) continue;
    let points = (action.points || []).filter((point) => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));
    if (points.length === 0) continue;
    for (let point of points) {
      let x = Number(point.x);
      let y = Number(point.y);
      minX = min(minX, x);
      minY = min(minY, y);
      maxX = max(maxX, x);
      maxY = max(maxY, y);
    }
    strokes.push({
      color: action.color || "#111111",
      size: Number(action.size) || 4,
      points: points
    });
  }

  if (strokes.length === 0 || !Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  let contentW = max(1, maxX - minX);
  let contentH = max(1, maxY - minY);
  let scaleFactor = min((targetSize - padding * 2) / contentW, (targetSize - padding * 2) / contentH);
  let offsetX = (targetSize - contentW * scaleFactor) / 2;
  let offsetY = (targetSize - contentH * scaleFactor) / 2;

  return {
    tag: drawing.tag || null,
    weight: Number.isFinite(Number(drawing.weight)) ? Number(drawing.weight) : 1,
    strokes: strokes.map((stroke) => ({
      color: stroke.color,
      size: constrain(stroke.size * scaleFactor, 1.4, 10),
      points: stroke.points.map((point) => ({
        x: offsetX + (Number(point.x) - minX) * scaleFactor,
        y: offsetY + (Number(point.y) - minY) * scaleFactor,
        t: Number(point.t) || 0
      }))
    }))
  };
}

function buildAverageAppleBuffers(normalizedDrawings, size) {
  let allBuffer = createGraphics(size, size);
  let commonBuffer = createGraphics(size, size);
  let averageBuffer = createGraphics(size, size);
  let participantMask = createGraphics(size, size);
  for (let buffer of [allBuffer, commonBuffer, averageBuffer, participantMask]) {
    buffer.pixelDensity(1);
    buffer.clear();
    buffer.smooth();
  }

  let pixelFrequency = new Uint16Array(size * size);
  let validParticipantCount = 0;
  let allAlpha = constrain(58 / sqrt(max(1, normalizedDrawings.length)), 9, 24);
  for (let drawing of normalizedDrawings) {
    drawNormalizedAverageStrokes(allBuffer, drawing, allAlpha, false);
    let drawingWeight = Number.isFinite(Number(drawing.weight)) ? constrain(Number(drawing.weight), 0, 1) : 1;
    drawNormalizedAverageStrokes(commonBuffer, drawing, 15 * drawingWeight, true);

    if (drawing.tag !== "outlier") {
      participantMask.clear();
      drawNormalizedAverageStrokes(participantMask, drawing, 255, true);
      participantMask.loadPixels();
      for (let pixelIndex = 0; pixelIndex < pixelFrequency.length; pixelIndex++) {
        if (participantMask.pixels[pixelIndex * 4 + 3] > 0) {
          pixelFrequency[pixelIndex] += 1;
        }
      }
      validParticipantCount++;
    }
  }

  averageBuffer.loadPixels();
  let frequencyThreshold = max(2, ceil(validParticipantCount * 0.1));
  for (let pixelIndex = 0; pixelIndex < pixelFrequency.length; pixelIndex++) {
    let frequency = pixelFrequency[pixelIndex];
    if (frequency < frequencyThreshold) continue;
    let resultAlpha = validParticipantCount > frequencyThreshold
      ? map(frequency, frequencyThreshold, validParticipantCount, 125, 245)
      : 210;
    let outputIndex = pixelIndex * 4;
    averageBuffer.pixels[outputIndex] = 24;
    averageBuffer.pixels[outputIndex + 1] = 22;
    averageBuffer.pixels[outputIndex + 2] = 20;
    averageBuffer.pixels[outputIndex + 3] = constrain(resultAlpha, 125, 245);
  }
  averageBuffer.updatePixels();

  return {
    all: allBuffer,
    common: commonBuffer,
    average: averageBuffer,
    exportData: {
      size: size,
      normalizedDrawings: normalizedDrawings,
      allAlpha: allAlpha,
      pixelFrequency: pixelFrequency,
      frequencyThreshold: frequencyThreshold,
      validParticipantCount: validParticipantCount
    }
  };
}

function drawNormalizedAverageStrokes(buffer, drawing, alphaValue, forceBlack) {
  buffer.noFill();
  buffer.strokeCap(ROUND);
  buffer.strokeJoin(ROUND);
  for (let stroke of drawing.strokes) {
    let strokeColor = forceBlack ? color(20, 19, 18) : color(stroke.color || "#111111");
    strokeColor.setAlpha(alphaValue);
    buffer.stroke(strokeColor);
    buffer.strokeWeight(forceBlack ? constrain(stroke.size, 1.8, 6) : stroke.size);
    if (stroke.points.length === 1) {
      buffer.circle(stroke.points[0].x, stroke.points[0].y, max(2, stroke.size));
      continue;
    }
    for (let i = 1; i < stroke.points.length; i++) {
      let a = stroke.points[i - 1];
      let b = stroke.points[i];
      buffer.line(a.x, a.y, b.x, b.y);
    }
  }
}

function saveAverageAppleSVG() {
  let cache = averageAppleCache[averagePromptIndex];
  if (!cache || cache.status !== "ready" || !cache.exportData) {
    console.warn("Average Apple export is not ready yet.");
    return;
  }

  let data = cache.exportData;
  let svgBody = averageViewMode === "average"
    ? buildAverageFrequencySVG(data)
    : buildAverageStrokeSVG(data, averageViewMode);
  let promptSlug = ["default", "touch", "taste", "imperfect"][averagePromptIndex] || "default";
  let modeSlug = averageViewMode === "all"
    ? "all-drawings"
    : averageViewMode === "common"
      ? "common-trace"
      : "average-apple";
  let filename = `average-apple-${promptSlug}-${modeSlug}.svg`;
  let title = `Average Apple / ${promptSlug} / ${modeSlug}`;
  let svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${data.size}" height="${data.size}" viewBox="0 0 ${data.size} ${data.size}" fill="none">`,
    `<title>${title}</title>`,
    `<g id="apple-visual" shape-rendering="geometricPrecision">`,
    svgBody,
    `</g>`,
    `</svg>`
  ].join("\n");

  let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  let url = URL.createObjectURL(blob);
  let link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildAverageStrokeSVG(data, mode) {
  let output = [];
  for (let drawing of data.normalizedDrawings) {
    let isCommon = mode === "common";
    let weight = Number.isFinite(Number(drawing.weight)) ? constrain(Number(drawing.weight), 0, 1) : 1;
    let opacity = isCommon ? (15 * weight) / 255 : data.allAlpha / 255;
    if (opacity <= 0) continue;

    for (let stroke of drawing.strokes) {
      let strokeColor = isCommon ? "#141312" : getAverageSVGColor(stroke.color);
      let strokeWidth = isCommon ? constrain(stroke.size, 1.8, 6) : stroke.size;
      if (stroke.points.length === 1) {
        let point = stroke.points[0];
        output.push(`<circle cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${svgNumber(max(1, strokeWidth / 2))}" fill="${strokeColor}" fill-opacity="${svgNumber(opacity, 4)}"/>`);
        continue;
      }
      if (stroke.points.length < 2) continue;
      let path = stroke.points.map((point, index) => `${index === 0 ? "M" : "L"}${svgNumber(point.x)} ${svgNumber(point.y)}`).join(" ");
      output.push(`<path d="${path}" fill="none" stroke="${strokeColor}" stroke-opacity="${svgNumber(opacity, 4)}" stroke-width="${svgNumber(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  return output.join("\n");
}

function buildAverageFrequencySVG(data) {
  let pathsByAlpha = new Map();
  let size = data.size;
  let threshold = data.frequencyThreshold;
  let participantCount = data.validParticipantCount;

  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      let frequency = data.pixelFrequency[y * size + x];
      if (frequency < threshold) {
        x++;
        continue;
      }

      let alpha = participantCount > threshold
        ? round(map(frequency, threshold, participantCount, 125, 245))
        : 210;
      alpha = constrain(alpha, 125, 245);
      let startX = x;
      x++;
      while (x < size && data.pixelFrequency[y * size + x] === frequency) x++;
      let runLength = x - startX;
      if (!pathsByAlpha.has(alpha)) pathsByAlpha.set(alpha, []);
      pathsByAlpha.get(alpha).push(`M${startX} ${y}h${runLength}v1h-${runLength}z`);
    }
  }

  let output = [];
  for (let [alpha, commands] of pathsByAlpha.entries()) {
    output.push(`<path d="${commands.join("")}" fill="#181614" fill-opacity="${svgNumber(alpha / 255, 4)}"/>`);
  }
  return output.join("\n");
}

function getAverageSVGColor(value) {
  try {
    let parsed = color(value || "#111111");
    let levels = parsed.levels || [17, 17, 17];
    return `#${levels.slice(0, 3).map((channel) => constrain(round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  } catch (error) {
    return "#111111";
  }
}

function svgNumber(value, digits = 2) {
  let number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toFixed(digits).replace(/\.?0+$/, "");
}

function invalidateAverageAppleCache() {
  averageAppleCache = [null, null, null, null];
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


function drawArchiveTarotCard(d, item, cardW, cardH, hovered) {
  let isOutlier = d && d.tag === "outlier";
  let active = isArchiveFilmItemReplaying(item);
  if (active) {
    drawingContext.save();
    drawingContext.shadowColor = "rgba(42, 35, 25, 0.16)";
    drawingContext.shadowBlur = 16;
    drawingContext.shadowOffsetY = 6;
  }
  noStroke();
  fill(252, 248, 238, isOutlier ? 104 : (active ? 220 : (hovered ? 205 : 168)));
  rect(-cardW / 2, -cardH / 2, cardW, cardH, 4);
  if (active) drawingContext.restore();

  stroke(active ? 66 : 226, active ? 62 : 216, active ? 56 : 202, active ? 190 : (hovered ? 170 : 105));
  strokeWeight(active ? 1.3 : 0.8);
  noFill();
  rect(-cardW / 2 + 0.5, -cardH / 2 + 0.5, cardW - 1, cardH - 1, 4);

  let imageW = cardW - 18;
  let imageH = cardH - 42;
  push();
  translate(-imageW / 2, -cardH / 2 + 10);
  let replaying = active;
  if (replaying && drawingHasReplayData(d)) {
    let limit = getArchiveFilmReplayLimit(d, item);
    drawReplayMini(d, limit, imageW, imageH, isOutlier ? 0.38 : 0.9);
  } else if (item.cachedThumb) {
    tint(255, isOutlier ? 95 : (hovered ? 235 : 205));
    drawImageContained(item.cachedThumb, 0, 0, imageW, imageH);
    noTint();
  } else {
    drawMissingImagePlaceholder(imageW, imageH);
  }
  pop();

  noStroke();
  fill(80, 73, 66, hovered ? 156 : 112);
  textAlign(RIGHT);
  textSize(8);
  text(`#${item.archiveIndex + 1}`, cardW / 2 - 8, cardH / 2 - 24);
  if (d && d.durationSeconds !== undefined) {
    textSize(7.2);
    text(`${Number(d.durationSeconds).toFixed(1)}s`, cardW / 2 - 8, cardH / 2 - 13);
  }
  drawArchiveOutlierButton(d, cardW, cardH, false, hovered);
}

function getArchiveOutlierButtonRect(cardW, cardH, mobile) {
  let buttonW = mobile ? min(48, cardW * 0.5) : min(42, cardW - 16);
  let buttonH = mobile ? 18 : 15;
  return {
    x: -cardW / 2 + 8,
    y: cardH / 2 - buttonH - (mobile ? 9 : 8),
    w: buttonW,
    h: buttonH
  };
}

function drawArchiveOutlierButton(d, cardW, cardH, mobile, hovered = false) {
  let marked = d && d.tag === "outlier";
  if (!marked && !hovered) return;
  let r = getArchiveOutlierButtonRect(cardW, cardH, mobile);

  noStroke();
  fill(marked ? 68 : 250, marked ? 63 : 247, marked ? 58 : 240, marked ? 190 : 166);
  rect(r.x, r.y, r.w, r.h, r.h / 2);
  if (!marked) {
    noFill();
    stroke(155, 145, 133, 120);
    strokeWeight(0.8);
    rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, r.h / 2);
  }

  noStroke();
  fill(marked ? 250 : 91, marked ? 248 : 83, marked ? 244 : 76);
  textAlign(CENTER, CENTER);
  textSize(mobile ? 7 : 6);
  text(marked ? "Hidden" : "Hide", r.x + r.w / 2, r.y + r.h / 2 + 0.5);
}

function archiveCardHitTest(px, py, item, cx, cy, cardW, cardH) {
  let dx = px - cx;
  let dy = py - cy;
  return abs(dx) <= cardW / 2 && abs(dy) <= cardH / 2;
}

function getArchiveModeCardAt(px, py) {
  if (backgroundViewMode !== "archive") return -1;

  for (let i = drawBackgroundApplesLayout.length - 1; i >= 0; i--) {
    let item = drawBackgroundApplesLayout[i];
    let rowPan = archiveRowPan[item.rowIndex] || 0;
    let y = item.archiveY;
    let w = item.archiveW;
    let h = item.archiveH;
    for (let offset of getArchiveFilmDrawOffsets(item)) {
      let x = item.archiveX + rowPan + offset;
      if (archiveCardHitTest(px, py, item, x, y, w, h)) {
        return item.archiveIndex;
      }
    }
  }

  return -1;
}

function pointInsideRotatedCardRect(px, py, cx, cy, rotation, rect) {
  let dx = px - cx;
  let dy = py - cy;
  let cosR = cos(rotation);
  let sinR = sin(rotation);
  let localX = dx * cosR + dy * sinR;
  let localY = -dx * sinR + dy * cosR;
  return localX >= rect.x && localX <= rect.x + rect.w && localY >= rect.y && localY <= rect.y + rect.h;
}

function getArchiveOutlierButtonAt(px, py) {
  return isMobileScreen()
    ? getMobileArchiveOutlierButtonAt(px, py)
    : getDesktopArchiveOutlierButtonAt(px, py);
}

function getDesktopArchiveOutlierButtonAt(px, py) {
  if (backgroundViewMode !== "archive") return -1;

  for (let i = drawBackgroundApplesLayout.length - 1; i >= 0; i--) {
    let item = drawBackgroundApplesLayout[i];
    let d = archive[item.archiveIndex];
    let rowPan = archiveRowPan[item.rowIndex] || 0;
    let y = item.archiveY;
    let w = item.archiveW;
    let h = item.archiveH;
    let button = getArchiveOutlierButtonRect(w, h, false);
    for (let offset of getArchiveFilmDrawOffsets(item)) {
      let x = item.archiveX + rowPan + offset;
      let visible = (d && d.tag === "outlier") || archiveCardHitTest(px, py, item, x, y, w, h);
      if (!visible) continue;
      if (pointInsideRotatedCardRect(px, py, x, y, 0, button)) return item.archiveIndex;
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

function getArchiveRowInfo(rowIndex) {
  let infos = [
    { task: "PROMPT 01", title: "DEFAULT APPLE", desc: "The apple I already know." },
    { task: "PROMPT 02", title: "TOUCH MEMORY", desc: "The apple my hand remembers." },
    { task: "PROMPT 03", title: "TASTE MEMORY", desc: "The apple my mouth remembers." },
    { task: "PROMPT 04", title: "IMPERFECT MEMORY", desc: "The imperfect apple." }
  ];
  return infos[rowIndex] || infos[0];
}

function getArchiveFilmMetrics() {
  let mobile = isMobileScreen();
  let sidebarW = mobile ? 0 : getDrawSidebarWidth();
  let cardW = mobile ? 96 : 112;
  let cardH = mobile ? 128 : 96;
  let gap = mobile ? 10 : 12;
  let promptInfoW = 0;
  return {
    cardW: cardW,
    cardH: cardH,
    gap: gap,
    stepX: cardW + gap,
    startX: sidebarW + (mobile ? 78 : 58 + cardW / 2),
    promptInfoW: promptInfoW
  };
}

function getArchiveReplayKey() {
  return `${archive.length}:${archive.map(d => d && (d.dbId || d.id || d.createdAt || "")).join("|")}`;
}

function resetArchiveFilmReplay() {
  let now = millis();
  archiveReplayKey = getArchiveReplayKey();
  archiveReplayLoading = {};
  archiveRowAutoPanTarget = [null, null, null, null];
  archiveRowManualPauseUntil = [0, 0, 0, 0];
  archiveReplayState = {
    activeRow: 0,
    cursor: [0, 0, 0, 0],
    activeArchiveIndex: [-1, -1, -1, -1],
    activeLoop: [0, 0, 0, 0],
    phase: ["move", "move", "move", "move"],
    phaseStartedAt: [now, now, now, now],
    pauseUntil: [now, now + 120, now + 240, now + 360]
  };
}

function ensureArchiveFilmReplayState() {
  let key = getArchiveReplayKey();
  if (!archiveReplayState || archiveReplayKey !== key) {
    resetArchiveFilmReplay();
  }
}

function getArchiveFilmRowItems(rowIndex) {
  return drawBackgroundApplesLayout
    .filter(item => item.rowIndex === rowIndex)
    .sort((a, b) => a.archiveX - b.archiveX);
}

function getArchiveFilmLoopWidth(rowIndex = -1) {
  let metrics = getArchiveFilmMetrics();
  if (rowIndex >= 0) {
    let rowCount = max(1, getArchiveFilmRowItems(rowIndex).length);
    return rowCount * metrics.stepX;
  }
  let maxCount = 1;
  for (let row = 0; row < 4; row++) {
    maxCount = max(maxCount, getArchiveFilmRowItems(row).length);
  }
  return maxCount * metrics.stepX;
}

function archiveFilmItemVisible(item) {
  if (!item) return false;
  let rowPan = archiveRowPan[item.rowIndex] || 0;
  let x = item.archiveX + rowPan;
  let halfW = item.archiveW / 2;
  return x + halfW >= getDrawSidebarWidth() && x - halfW <= width;
}

function drawingHasReplayData(d) {
  return Boolean(d && Array.isArray(d.actions) && d.actions.length > 0);
}

function setArchiveMode(mode) {
  if (mode !== "autoplay") mode = "explore";
  if (archiveMode === mode) return;
  archiveMode = mode;
  archiveIsPaused = false;
  archiveRowAutoPanTarget = [null, null, null, null];
  archiveRowVelocity = [0, 0, 0, 0];
  if (mode === "autoplay") {
    ensureArchiveFilmReplayState();
  } else if (archiveReplayState) {
    archiveReplayState.activeArchiveIndex = [-1, -1, -1, -1];
  }
  if (mode === "autoplay") {
    clearArchiveIdleTimer();
  } else {
    resetArchiveIdleTimer();
  }
  requestRender("archive-mode");
}

function startArchiveAutoplay() {
  setArchiveMode("autoplay");
}

function pauseArchiveAutoplay() {
  if (archiveMode === "autoplay") archiveIsPaused = true;
  requestRender("archive-pause");
}

function resumeArchiveAutoplay() {
  if (archiveMode === "autoplay") archiveIsPaused = false;
  requestRender("archive-resume");
}

function stopArchiveAutoplay() {
  setArchiveMode("explore");
}

function registerArchiveInteraction() {
  archiveLastInteractionTime = millis();
  if (archiveMode === "autoplay") stopArchiveAutoplay();
  resetArchiveIdleTimer();
  requestRender("archive-interaction");
}

function updateArchiveIdleAutoplay() {
  resetArchiveIdleTimer();
}

function clearArchiveIdleTimer() {
  if (!archiveIdleTimeoutId) return;
  clearTimeout(archiveIdleTimeoutId);
  archiveIdleTimeoutId = null;
  activeTimerCount = max(0, activeTimerCount - 1);
}

function shouldScheduleArchiveIdleAutoplay() {
  return (
    ENABLE_ARCHIVE_IDLE_AUTOPLAY &&
    !isMobileScreen() &&
    page === "draw" &&
    !modalOpen &&
    backgroundViewMode === "archive" &&
    !selectedApple &&
    archiveMode === "explore"
  );
}

function resetArchiveIdleTimer() {
  clearArchiveIdleTimer();
  if (!shouldScheduleArchiveIdleAutoplay()) return;
  archiveIdleTimeoutId = setTimeout(() => {
    archiveIdleTimeoutId = null;
    activeTimerCount = max(0, activeTimerCount - 1);
    if (shouldScheduleArchiveIdleAutoplay()) {
      startArchiveAutoplay();
      requestRender("archive-idle-autoplay");
    }
  }, ARCHIVE_IDLE_DELAY);
  activeTimerCount++;
}

function getNextArchiveReplayRow(fromRow) {
  for (let offset = 1; offset <= 4; offset++) {
    let row = (fromRow + offset) % 4;
    if (getArchiveFilmRowItems(row).length > 0) return row;
  }
  return fromRow;
}

function updateArchiveFilmReplay() {
  if (isMobileScreen()) return;
  ensureArchiveFilmReplayState();
  if (
    archiveMode !== "autoplay" ||
    archiveIsPaused ||
    !archiveReplayState ||
    modalOpen ||
    backgroundViewMode !== "archive" ||
    selectedApple ||
    archiveRowDragging
  ) {
    return;
  }

  let row = archiveReplayState.activeRow || 0;
  let rowItems = getArchiveFilmRowItems(row);
  if (rowItems.length === 0) {
    archiveReplayState.activeRow = getNextArchiveReplayRow(row);
    return;
  }
  if (millis() < (archiveReplayState.pauseUntil[row] || 0)) return;
  if (millis() < (archiveRowManualPauseUntil[row] || 0)) return;

  let cursor = archiveReplayState.cursor[row] || 0;
  let sequenceIndex = cursor % rowItems.length;
  let loop = floor(cursor / rowItems.length);
  let item = rowItems[sequenceIndex];
  let phase = archiveReplayState.phase[row];

  if (phase === "move") {
    if (!archiveFilmItemReadyToReplay(item, loop)) {
      requestArchiveRowAutoFollow(row, item, loop);
      return;
    }
    archiveRowAutoPanTarget[row] = null;
    archiveReplayState.activeArchiveIndex = [-1, -1, -1, -1];
    archiveReplayState.activeArchiveIndex[row] = item.archiveIndex;
    archiveReplayState.activeLoop[row] = loop;
    archiveReplayState.phase[row] = "replay";
    archiveReplayState.phaseStartedAt[row] = millis();
    return;
  }

  if (phase === "replay") {
    let d = archive[item.archiveIndex];
    if (!drawingHasReplayData(d)) {
      ensureArchiveFilmReplayData(item.archiveIndex);
      if (millis() - archiveReplayState.phaseStartedAt[row] > 700) {
        archiveReplayState.activeArchiveIndex[row] = -1;
        archiveReplayState.phase[row] = "pause";
        archiveReplayState.pauseUntil[row] = millis() + 180;
      }
      return;
    }
    if (millis() - archiveReplayState.phaseStartedAt[row] >= getArchiveFilmReplayDuration(d)) {
      archiveReplayState.activeArchiveIndex[row] = -1;
      archiveReplayState.phase[row] = "pause";
      archiveReplayState.pauseUntil[row] = millis() + 220;
    }
    return;
  }

  if (phase === "pause") {
    archiveReplayState.cursor[row] = cursor + 1;
    archiveReplayState.phase[row] = "move";
    archiveReplayState.phaseStartedAt[row] = millis();
    archiveReplayState.activeRow = getNextArchiveReplayRow(row);
  }
}

function archiveFilmItemReadyToReplay(item, loop = 0) {
  if (!item) return false;
  if (millis() < (archiveRowManualPauseUntil[item.rowIndex] || 0)) return false;
  let target = getArchiveRowPanForItem(item, loop);
  let current = archiveRowPan[item.rowIndex] || 0;
  return abs(current - target) < 1.2;
}

function getArchiveRowPanForItem(item, loop = 0) {
  let frame = getArchiveVisibleRowFrame();
  let desiredX = frame.x + frame.w * 0.42;
  let virtualX = item.archiveX + loop * getArchiveFilmLoopWidth(item.rowIndex);
  return desiredX - virtualX;
}

function getArchiveVisibleRowFrame() {
  if (isMobileScreen()) {
    return { x: 20, y: 0, w: width - 40, h: height };
  }
  let sidebarW = getDrawSidebarWidth();
  let metrics = getArchiveFilmMetrics();
  let left = metrics.startX - metrics.cardW / 2;
  let right = width - 56;
  return { x: left, y: 0, w: max(1, right - left), h: height };
}

function requestArchiveRowAutoFollow(rowIndex, item, loop = 0) {
  if (!item) return;
  if (millis() < (archiveRowManualPauseUntil[rowIndex] || 0)) return;
  archiveRowAutoPanTarget[rowIndex] = getArchiveRowPanForItem(item, loop);
}

function markArchiveRowManualInteraction(rowIndex) {
  if (rowIndex < 0 || rowIndex >= archiveRowManualPauseUntil.length) return;
  archiveRowManualPauseUntil[rowIndex] = millis() + 2500;
  archiveRowAutoPanTarget[rowIndex] = null;
}

function updateArchiveRowAutoFollow() {
  if (archiveMode !== "autoplay" || archiveIsPaused || modalOpen || backgroundViewMode !== "archive" || selectedApple || archiveRowDragging) return;

  for (let row = 0; row < archiveRowAutoPanTarget.length; row++) {
    let target = archiveRowAutoPanTarget[row];
    if (target === null || target === undefined) continue;
    if (millis() < (archiveRowManualPauseUntil[row] || 0)) continue;
    if (abs(archiveRowVelocity[row] || 0) > 0.05) continue;

    let current = archiveRowPan[row] || 0;
    let next = lerp(current, target, 0.18);
    if (abs(next - target) < 0.8) {
      next = target;
      archiveRowAutoPanTarget[row] = null;
    }
    archiveRowPan[row] = next;
  }
}

function ensureArchiveFilmReplayData(archiveIndex) {
  let d = archive[archiveIndex];
  if (!d || drawingHasReplayData(d) || archiveReplayLoading[archiveIndex]) return;
  archiveReplayLoading[archiveIndex] = true;
  fetchDrawingDetails(archiveIndex).finally(() => {
    archiveReplayLoading[archiveIndex] = false;
  });
}

function isArchiveFilmItemReplaying(item) {
  if (isMobileScreen()) return false;
  return Boolean(
    archiveMode === "autoplay" &&
    !archiveIsPaused &&
    backgroundViewMode === "archive" &&
    !selectedApple &&
    archiveReplayState &&
    archiveReplayState.phase[item.rowIndex] === "replay" &&
    archiveReplayState.activeArchiveIndex[item.rowIndex] === item.archiveIndex &&
    archiveReplayState.activeLoop[item.rowIndex] === (item.currentDrawLoop || 0)
  );
}

function isArchiveIndexReplaying(archiveIndex) {
  if (!archiveReplayState) return false;
  let item = drawBackgroundApplesLayout.find(layoutItem => layoutItem.archiveIndex === archiveIndex);
  return item ? isArchiveFilmItemReplaying(item) : false;
}

function getArchiveFilmReplayLimitForIndex(d, archiveIndex) {
  let item = drawBackgroundApplesLayout.find(layoutItem => layoutItem.archiveIndex === archiveIndex);
  return item ? getArchiveFilmReplayLimit(d, item) : 999999;
}

function getArchiveFilmReplayDuration(d) {
  let units = countDrawingUnits(d);
  return constrain(map(units, 20, 900, 1800, 2800), 1800, 2800);
}

function getArchiveFilmReplayLimit(d, item) {
  if (!archiveReplayState) return 999999;
  let duration = getArchiveFilmReplayDuration(d);
  let row = item ? item.rowIndex : 0;
  let elapsed = millis() - (archiveReplayState.phaseStartedAt[row] || 0);
  let progress = constrain(elapsed / duration, 0, 1);
  return max(1, countDrawingUnits(d) * progress);
}

function getArchiveRowsTop() {
  return isMobileScreen() ? 126 : 206;
}

function getArchiveRowGap() {
  return isMobileScreen() ? 158 : 132;
}

function getArchiveModeControls() {
  if (isMobileScreen()) return [];
  let sidebarW = isMobileScreen() ? 0 : getDrawSidebarWidth();
  let y = 118;
  let x = sidebarW + 236;
  let h = 30;
  let gap = 8;
  let controls = [
    { action: "explore", label: "Explore", x: x, y: y, w: 82, h: h },
    { action: "autoplay", label: "Auto Play", x: x + 82 + gap, y: y, w: 104, h: h }
  ];
  if (archiveMode === "autoplay") {
    let last = controls[controls.length - 1];
    controls.push({
      action: archiveIsPaused ? "resume" : "pause",
      label: archiveIsPaused ? "Resume" : "Pause",
      x: last.x + last.w + gap,
      y: y,
      w: 84,
      h: h
    });
  }
  return controls;
}

function drawArchiveModeControls() {
  let controls = getArchiveModeControls();
  for (let c of controls) {
    let active = (
      (c.action === "explore" && archiveMode === "explore") ||
      (c.action === "autoplay" && archiveMode === "autoplay")
    );
    noStroke();
    fill(active ? 48 : 251, active ? 45 : 249, active ? 41 : 244, active ? 220 : 205);
    rect(c.x, c.y, c.w, c.h, c.h / 2);
    if (!active) {
      noFill();
      stroke(166, 157, 145, 130);
      strokeWeight(1);
      rect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, c.h / 2);
    }
    noStroke();
    fill(active ? 250 : 84, active ? 248 : 77, active ? 244 : 70);
    textAlign(CENTER, CENTER);
    textSize(isMobileScreen() ? 9 : 10);
    let prefix = c.action === "autoplay" && archiveMode === "autoplay" ? "▶ " : "";
    text(prefix + c.label, c.x + c.w / 2, c.y + c.h / 2 + 0.5);
  }
}

function getArchiveModeControlAt(x, y) {
  if (page !== "draw" || modalOpen || backgroundViewMode !== "archive") return null;
  for (let c of getArchiveModeControls()) {
    if (pointInsideRect(x, y, c)) return c.action;
  }
  return null;
}

function handleArchiveModeControl(action) {
  archiveLastInteractionTime = millis();
  if (action === "explore") stopArchiveAutoplay();
  if (action === "autoplay") startArchiveAutoplay();
  if (action === "pause") pauseArchiveAutoplay();
  if (action === "resume") resumeArchiveAutoplay();
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
  drawArchiveModeControls();

  if (archive.length === 0) {
    fill(120);
    textSize(14);
    text("No apples collected yet.", x0, y0 + 92);
    return;
  }

  let rowY = getArchiveRowsTop();
  let metrics = getArchiveFilmMetrics();
  for (let i = 0; i < 4; i++) {
    let y = rowY + i * getArchiveRowGap();
    stroke(214, 205, 193, 115);
    strokeWeight(1);
    line(metrics.startX - metrics.cardW / 2, y + 18, width - 50, y + 18);
  }

}

function drawMobileArchiveView() {
  if (drawBackgroundApplesLayout.length === 0) generateDrawBackgroundApplesLayout();
  updateArchiveFilmReplay();

  let pad = 22;
  let y = 86 - getMobileArchiveScrollY();
  let metrics = getArchiveFilmMetrics();
  let cardW = metrics.cardW;
  let cardH = metrics.cardH;
  let stepX = metrics.stepX;

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
  drawArchiveModeControls();
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

    let info = getArchiveRowInfo(groupIndex);
    fill(26, 26, 26, 150);
    textSize(9);
    textAlign(LEFT);
    text(info.task, pad, y);
    fill(26, 26, 26, 220);
    textSize(13);
    text(info.title, pad, y + 18);
    y += 36;

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
      let layoutItem = drawBackgroundApplesLayout.find(layout => layout.archiveIndex === item.index);
      let offsets = layoutItem ? getArchiveFilmDrawOffsets(layoutItem) : [0];
      let cardY = y;
      for (let offset of offsets) {
        let cardX = (layoutItem ? layoutItem.archiveX : metrics.startX + i * stepX) - cardW / 2 + rowPan + offset;
        if (layoutItem) layoutItem.currentDrawLoop = round(offset / getArchiveFilmLoopWidth(layoutItem.rowIndex));
        drawMobileArchiveCard(item.drawing, item.index, cardX, cardY, cardW, cardH, 0);
        if (layoutItem) layoutItem.currentDrawLoop = 0;
      }
    }

    y += cardH + 58;
  }
}

function drawMobileArchiveCard(d, archiveIndex, x, y, w, h, rotation) {
  let isOutlier = d && d.tag === "outlier";
  push();
  translate(x + w / 2, y + h / 2);

  noStroke();
  fill(252, 248, 238, isOutlier ? 112 : 174);
  rect(-w / 2, -h / 2, w, h, 4);

  stroke(226, 216, 202, 112);
  strokeWeight(0.8);
  noFill();
  rect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 4);

  push();
  translate(-w * 0.39, -h * 0.42);
  let imageW = w * 0.78;
  let imageH = h * 0.64;
  if (isArchiveIndexReplaying(archiveIndex) && drawingHasReplayData(d)) {
    drawReplayMini(d, getArchiveFilmReplayLimitForIndex(d, archiveIndex), imageW, imageH, isOutlier ? 0.38 : 0.9);
  } else {
    if (isOutlier) tint(255, 120);
    drawStaticMini(d, imageW, imageH);
    if (isOutlier) noTint();
  }
  pop();

  noStroke();
  fill(80, 73, 66, 145);
  textAlign(RIGHT);
  textSize(10);
  text(`#${archiveIndex + 1}`, w / 2 - 16, h / 2 - 18);

  drawArchiveOutlierButton(d, w, h, true, isOutlier);

  pop();
}

function getMobileArchiveCardAt(px, py) {
  let y = 86 - getMobileArchiveScrollY() + 62;
  let metrics = getArchiveFilmMetrics();
  let cardW = metrics.cardW;
  let cardH = metrics.cardH;
  let stepX = metrics.stepX;

  for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
    let group = archive
      .map((drawing, index) => ({ drawing, index }))
      .filter(item => getArchivePromptGroupIndex(item.drawing) === groupIndex);

    y += 36;

    if (group.length === 0) {
      y += 48;
      continue;
    }

    let rowPan = archiveRowPan[groupIndex] || 0;
    for (let i = 0; i < group.length; i++) {
      let layoutItem = drawBackgroundApplesLayout.find(layout => layout.archiveIndex === group[i].index);
      let offsets = layoutItem ? getArchiveFilmDrawOffsets(layoutItem) : [0];
      let cardY = y;
      for (let offset of offsets) {
        let cardX = (layoutItem ? layoutItem.archiveX : metrics.startX + i * stepX) - cardW / 2 + rowPan + offset;
        if (px >= cardX && px <= cardX + cardW && py >= cardY && py <= cardY + cardH) {
          return group[i].index;
        }
      }
    }

    y += cardH + 58;
  }

  return -1;
}

function getMobileArchiveOutlierButtonAt(px, py) {
  let y = 86 - getMobileArchiveScrollY() + 62;
  let metrics = getArchiveFilmMetrics();
  let cardW = metrics.cardW;
  let cardH = metrics.cardH;
  let stepX = metrics.stepX;

  for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
    let group = archive
      .map((drawing, index) => ({ drawing, index }))
      .filter(item => getArchivePromptGroupIndex(item.drawing) === groupIndex);
    y += 36;
    if (group.length === 0) {
      y += 48;
      continue;
    }

    let rowPan = archiveRowPan[groupIndex] || 0;
    for (let i = group.length - 1; i >= 0; i--) {
      let d = group[i].drawing;
      if (!(d && d.tag === "outlier")) continue;
      let layoutItem = drawBackgroundApplesLayout.find(layout => layout.archiveIndex === group[i].index);
      let offsets = layoutItem ? getArchiveFilmDrawOffsets(layoutItem) : [0];
      let cardY = y;
      let button = getArchiveOutlierButtonRect(cardW, cardH, true);
      for (let offset of offsets) {
        let cardX = (layoutItem ? layoutItem.archiveX : metrics.startX + i * stepX) - cardW / 2 + rowPan + offset;
        if (pointInsideRotatedCardRect(px, py, cardX + cardW / 2, cardY + cardH / 2, 0, button)) {
          return group[i].index;
        }
      }
    }
    y += cardH + 58;
  }

  return -1;
}

function getMobileArchiveContentHeight() {
  let y = 86 + 62;
  let metrics = getArchiveFilmMetrics();
  for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
    let count = archive.filter(d => getArchivePromptGroupIndex(d) === groupIndex).length;
    y += 36;
    y += count > 0 ? metrics.cardH + 58 : 48;
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
  fill("#1A1A1A");
  textAlign(LEFT);
  textSize(18);
  text("RECORD " + String(selectedAppleIndex + 1), r.x + 22, r.y + 30);

  fill(26, 26, 26, 166);
  textSize(11);
  text(formatArchiveRecordDate(selectedApple), r.x + 22, r.y + 56);
  let duration = selectedApple.durationSeconds !== undefined ? `${selectedApple.durationSeconds}s` : "undated";
  text(duration, r.x + 22, r.y + 74);
  text(`${countDrawingUnits(selectedApple)} trace units`, r.x + 22, r.y + 92);

  stroke(inkCol);
  strokeWeight(1.2);
  line(close.x + 2, close.y + 2, close.x + close.w - 2, close.y + close.h - 2);
  line(close.x + close.w - 2, close.y + 2, close.x + 2, close.y + close.h - 2);

  let thumbX = r.x + 22;
  let thumbY = r.y + 116;
  let thumbW = r.w - 44;
  let thumbH = min(250, r.h * 0.4);

  fill(paperCol);
  stroke(226, 220, 210);
  rect(thumbX, thumbY, thumbW, thumbH, 4);

  push();
  translate(thumbX + 16, thumbY + 14);
  drawSelectedAppleReplay(selectedApple, thumbW - 32, thumbH - 28);
  pop();

  let promptKey = getDrawingPromptIndex(selectedApple);
  let taskText = getArchivePromptRecordLabel(promptKey);
  let titleText = prompts[promptKey] ? prompts[promptKey].shortTitle : "";
  let textY = thumbY + thumbH + 38;

  noStroke();
  fill("#1A1A1A");
  textSize(13);
  text(taskText, r.x + 22, textY);
  fill(26, 26, 26, 166);
  textSize(12);
  text(titleText, r.x + 22, textY + 24, r.w - 44);

  let extraY = textY + 64;
  if (selectedApple.reflection_text) {
    fill("#1A1A1A");
    textSize(11);
    text("Reflection", r.x + 22, extraY);
    fill(26, 26, 26, 217);
    textSize(13);
    textLeading(19);
    text(selectedApple.reflection_text, r.x + 22, extraY + 24, r.w - 44, max(70, r.y + r.h - extraY - 42));
    extraY += 118;
  }

  if (selectedApple.match !== undefined) {
    fill("#1A1A1A");
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
    fill("#1A1A1A");
    textSize(10);
    text("NOTES", r.x + 22, extraY);
    fill(26, 26, 26, 166);
    textSize(10);
    text(selectedApple.notes, r.x + 22, extraY + 26, r.w - 44, 70);
  }
}

function getApplePopupRect() {
  let w = isMobileScreen() ? min(width - 36, 340) : min(520, width - getDrawSidebarWidth() - 120);
  let h = isMobileScreen() ? min(height - 90, 560) : min(640, height - 96);
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
    let iconColW = constrain(w * 0.24, 132, 210);
    let dividerX = x + iconColW;
    let textX = dividerX + 34;
    let progressW = 150;
    let textW = max(180, w - iconColW - progressW - 54);

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
  let compact = isCompactDesktop();
  let wrapToolbar = shouldWrapDesktopToolbar();
  let labelPad = isMobileScreen() ? 6 : 18;
  let pickerW = isMobileScreen() ? 48 : (compact ? 50 : 58);
  let sliderLabelX = isMobileScreen() ? 70 : pickerW + 52;

  noStroke();
  fill(238, 234, 226, 210);
  rect(x, y, w, h, 8);

  fill(inkCol);
  textAlign(LEFT);
  textSize(isCompactDesktop() ? 10.5 : 12);
  text("Colour", x + labelPad, y + (isMobileScreen() ? 14 : 24), max(1, pickerW + 8));
  text("Thickness", x + sliderLabelX, y + (isMobileScreen() ? 14 : 24), max(1, w * 0.2));

  if (!isMobileScreen()) {
    stroke(lineCol);
    strokeWeight(1);
    if (wrapToolbar) {
      line(x + 18, y + 72, x + w - 18, y + 72);
    } else {
      let dividerX = min(x + w - 190, x + w * (compact ? 0.72 : 0.68));
      line(dividerX, y + 20, dividerX, y + h - 20);
    }
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
  requestRender("mouse-pressed");
}

function mouseDragged() {
  handlePointerDragged(mouseX, mouseY);
  requestRender("mouse-dragged");
}

function mouseReleased() {
  handlePointerReleased();
  requestRender("mouse-released");
}

function mouseMoved() {
  if (page === "draw" && !modalOpen) requestRender("mouse-moved");
}

function mouseClicked() {
  if (isMobileArchiveMode() && !isClickOnViewSwitcher(mouseX, mouseY)) {
    if (getMobileArchiveOutlierButtonAt(mouseX, mouseY) >= 0) return false;
    let hitIndex = getMobileArchiveCardAt(mouseX, mouseY);
    if (hitIndex >= 0) {
      selectArchiveDrawing(hitIndex);
      return false;
    }
  }
}

function touchStarted() {
  requestRender("touch-started");
  if (reflectionModalOpen) {
    return true;
  }

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
  requestRender("touch-moved");
  if (reflectionModalOpen) {
    return true;
  }

  if (touches.length > 0) {
    let x = touches[0].x;
    let y = touches[0].y;

    if (page === "draw" && pointInsideUndoButton(x, y)) {
      return true;
    }

    if (archiveRowDragging || isWallPanning || isArchivePanning || (page === "draw" && pointInsideDrawingArea(x, y))) {
      handlePointerDragged(x, y);
      return false;
    }
  }

  return true;
}

function touchEnded() {
  requestRender("touch-ended");
  if (reflectionModalOpen) {
    return true;
  }

  handlePointerReleased();
  return true;
}

function handlePointerPressed(x, y) {
  if (reflectionModalOpen) {
    return true;
  }

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
    registerArchiveInteraction();
    markArchiveRowManualInteraction(archiveRow);
    archiveRowDragging = true;
    archiveRowDragIndex = archiveRow;
    archiveRowLastX = x;
    archiveRowLastMoveTime = millis();
    archiveRowVelocity[archiveRow] = 0;
    archiveRowPressPoint = { x: x, y: y };
    archiveRowDragDistance = 0;
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
  if (reflectionModalOpen) {
    return false;
  }

  if (page === "draw" && pointInsideUndoButton(x, y)) {
    return false;
  }

  if (archiveRowDragging) {
    markArchiveRowManualInteraction(archiveRowDragIndex);
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
  if (reflectionModalOpen) {
    currentAction = null;
    return;
  }

  if (archiveRowDragging) {
    markArchiveRowManualInteraction(archiveRowDragIndex);
    if (archiveRowDragDistance < 8) {
      let outlierIndex = getArchiveOutlierButtonAt(archiveRowPressPoint.x, archiveRowPressPoint.y);
      if (outlierIndex >= 0) {
        toggleDrawingOutlier(outlierIndex);
      } else {
        let hitIndex = isMobileScreen()
          ? getMobileArchiveCardAt(archiveRowPressPoint.x, archiveRowPressPoint.y)
          : getArchiveModeCardAt(archiveRowPressPoint.x, archiveRowPressPoint.y);
        if (hitIndex >= 0) selectArchiveDrawing(hitIndex);
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
      let outlierIndex = getMobileArchiveOutlierButtonAt(mobileArchivePressPoint.x, mobileArchivePressPoint.y);
      if (outlierIndex >= 0) {
        toggleDrawingOutlier(outlierIndex);
      } else {
        let hitIndex = getMobileArchiveCardAt(mobileArchivePressPoint.x, mobileArchivePressPoint.y);
        if (hitIndex >= 0) selectArchiveDrawing(hitIndex);
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
    archiveLastInteractionTime = millis();
    resetArchiveIdleTimer();
    requestRender("close-apple-popup");
    return true;
  }

  if (backgroundViewMode === "archive" && isClickOnApplePopup(x, y)) {
    return true;
  }

  let archiveControl = getArchiveModeControlAt(x, y);
  if (archiveControl) {
    handleArchiveModeControl(archiveControl);
    return true;
  }

  let switchMode = getViewSwitcherHit(x, y);
  if (switchMode) {
    archiveLastInteractionTime = millis();
    if (switchMode === "draw") {
      modalOpen = true;
      clearArchiveIdleTimer();
      layoutInterface();
    } else if (backgroundViewMode !== switchMode || modalOpen) {
      backgroundViewMode = switchMode;
      modalOpen = false;
      currentAction = null;
      if (switchMode === "archive") {
        setArchiveMode("explore");
        archiveLastInteractionTime = millis();
        archivePan.y = 0;
        generateDrawBackgroundApplesLayout();
        resetArchiveFilmReplay();
        resetArchiveIdleTimer();
      } else {
        clearArchiveIdleTimer();
      }
      if (switchMode === "wall") {
        generateDrawBackgroundApplesLayout();
      }
      if (switchMode === "average") {
        ensureAveragePromptCache(averagePromptIndex);
      }
      layoutInterface();
    }
    requestRender("view-switch");
    return true;
  }

  if (handleAverageAppleClick(x, y)) {
    requestRender("average-click");
    return true;
  }

  if (handleAppleReportClick(x, y)) {
    requestRender("report-click");
    return true;
  }

  if (modalOpen && isClickOnModalClose(x, y)) {
    modalOpen = false;
    currentAction = null;
    if (isMobileScreen()) mobileArchiveReady = true;
    layoutInterface();
    resetArchiveIdleTimer();
    requestRender("modal-close");
    return true;
  }

  if (
    !modalOpen &&
    backgroundViewMode !== "average" &&
    backgroundViewMode !== "report" &&
    isClickOnReopenDrawingButton(x, y)
  ) {
    modalOpen = true;
    layoutInterface();
    clearArchiveIdleTimer();
    requestRender("modal-open");
    return true;
  }

  if (isClickOnSidebar(x, y) || isClickOnModal(x, y) || isClickOnDrawingDomControl(x, y)) {
    return false;
  }

  return false;
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

function getArchiveRowAt(x, y) {
  if (page !== "draw" || modalOpen || backgroundViewMode !== "archive") return -1;
  if (isClickOnSidebar(x, y) || isClickOnViewSwitcher(x, y) || isClickOnReopenDrawingButton(x, y)) return -1;
  if (getArchiveModeControlAt(x, y)) return -1;

  if (isMobileScreen()) {
    let rowY = 86 - getMobileArchiveScrollY() + 62;
    let cardH = getArchiveFilmMetrics().cardH;
    for (let i = 0; i < 4; i++) {
      rowY += 36;
      let count = archive.filter(d => getArchivePromptGroupIndex(d) === i).length;
      if (count > 0 && y >= rowY - 18 && y <= rowY + cardH + 18) return i;
      rowY += count > 0 ? cardH + 58 : 48;
    }
    return -1;
  }

  let top = getArchiveRowsTop();
  let gap = getArchiveRowGap();
  let metrics = getArchiveFilmMetrics();
  for (let i = 0; i < 4; i++) {
    let rowY = top + i * gap;
    let cardTop = rowY + 34;
    if (y >= cardTop - 10 && y <= cardTop + metrics.cardH + 10) return i;
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
    let metrics = getArchiveFilmMetrics();
    let contentW = count > 0 ? (count - 1) * metrics.stepX + metrics.cardW + metrics.startX : width;
    let minX = min(0, width - contentW - 28);
    return { min: minX, max: 0 };
  }

  let frame = getArchiveCardsSafeFrame();
  let rowCount = drawBackgroundApplesLayout.filter(item => item.rowIndex === rowIndex).length;
  let metrics = getArchiveFilmMetrics();
  let rowW = rowCount > 0 ? (rowCount - 1) * metrics.stepX + metrics.cardW + 24 : frame.w;
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
    requestRender("wall-wheel");
    return false;
  }

  if (page === "draw" && !modalOpen && backgroundViewMode === "archive") {
    let row = getArchiveRowAt(mouseX, mouseY);
    if (row >= 0) {
      registerArchiveInteraction();
      let delta = abs(event.deltaX || 0) > abs(event.deltaY || 0) ? event.deltaX : event.delta;
      markArchiveRowManualInteraction(row);
      applyArchiveRowPanDelta(row, -delta, true);
      archiveRowVelocity[row] = -delta * 0.18;
      requestRender("archive-wheel");
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
  requestRender("archive-pan-wheel");
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
  if (!modalOpen || reflectionModalOpen) return false;
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
  invalidateAverageAppleCache();
  if (!isMobileScreen() || mobileArchiveReady) {
    generateDrawBackgroundApplesLayout();
  }
  markStackDirty();
  await saveDrawingToCloud(drawingData);
  if (!drawingData.dbId) {
    return false;
  }
  registerReportPersonalDrawing(drawingData);

  return drawingData;
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
  if (promptFlowSaving || reflectionModalOpen) return;
  promptFlowSaving = true;

  try {
    let savedDrawing = await saveCurrentDrawing();
    if (!savedDrawing) {
      alert(actions.length === 0 ? "Please draw something first." : "Could not save this drawing. Please try again.");
      return;
    }

    openReflectionModal(savedDrawing);
  } finally {
    promptFlowSaving = false;
    updatePromptFlowButtonLabel();
  }
}

function openReflectionModal(savedDrawing) {
  reflectionSavedDrawing = savedDrawing;
  reflectionModalOpen = true;
  reflectionError = "";
  reflectionUpdating = false;
  currentAction = null;
  if (reflectionTextArea) reflectionTextArea.value("");
  layoutReflectionInterface();
  updateReflectionVisibility();
}

async function handleReflectionChoice(shouldSaveText) {
  if (reflectionUpdating || !reflectionModalOpen || !reflectionSavedDrawing) return;
  reflectionUpdating = true;
  reflectionError = "";

  try {
    let textValue = shouldSaveText && reflectionTextArea
      ? reflectionTextArea.value().trim()
      : "";
    await updateDrawingReflection(reflectionSavedDrawing, textValue || null);
    reflectionSavedDrawing.reflection_text = textValue || null;
    saveArchive();
    closeReflectionModalAndAdvance();
  } catch (error) {
    console.warn("Could not save reflection:", error);
    reflectionError = "Could not save this reflection. Please try again or skip.";
  } finally {
    reflectionUpdating = false;
  }
}

function handleReflectionTouchChoice(event, shouldSaveText) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  handleReflectionChoice(shouldSaveText);
}

async function updateDrawingReflection(drawing, reflectionText) {
  if (!drawing || !drawing.dbId) {
    throw new Error("Missing saved drawing record id.");
  }

  let response = await fetch(`/api/drawings/${drawing.dbId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reflection_text: reflectionText
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function closeReflectionModalAndAdvance() {
  reflectionModalOpen = false;
  reflectionSavedDrawing = null;
  reflectionError = "";
  if (reflectionTextArea) reflectionTextArea.value("");
  updateReflectionVisibility();
  advancePrompt();
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
  resetArchiveFilmReplay();
}

function saveArchive() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(archive));
  } catch (error) {
    console.warn("Could not save archive to localStorage:", error);
  }
}

function toggleDrawingOutlier(index) {
  let drawing = archive[index];
  if (!drawing) return;

  let markAsOutlier = drawing.tag !== "outlier";
  if (markAsOutlier) {
    drawing.tag = "outlier";
    drawing.weight = 0.2;
  } else {
    delete drawing.tag;
    drawing.weight = 1;
  }

  if (selectedAppleIndex === index) selectedApple = drawing;
  saveArchive();
  invalidateAverageAppleCache();
  persistDrawingOutlierState(drawing, markAsOutlier);
}

async function persistDrawingOutlierState(drawing, marked) {
  if (!drawing || !drawing.dbId) return;

  try {
    let response = await fetch(`/api/drawings/${drawing.dbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tag: marked ? "outlier" : null,
        weight: marked ? 0.2 : 1
      })
    });
    if (!response.ok) throw new Error(await response.text());
  } catch (error) {
    console.warn("Could not persist outlier state. The local state is still saved:", drawing.dbId, error);
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
  clearArchiveIdleTimer();
  fetchDrawingDetails(index);
  requestRender("select-archive-drawing");
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
    requestRender("drawing-details-loaded");
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
    return saved || null;
  } catch (error) {
    console.warn("Could not save drawing to server. It is still saved locally:", error);
  }
  return null;
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

  let cropped = copyGraphicsRegionAtLogicalDensity(sourceLayer, x, y, w, h);
  let contentBounds = getOpaquePixelBounds(cropped, 8);
  if (!contentBounds) return cropped;

  let padding = max(12, floor(max(contentBounds.w, contentBounds.h) * 0.14));
  let contentX = max(0, contentBounds.x - padding);
  let contentY = max(0, contentBounds.y - padding);
  let contentW = min(cropped.width - contentX, contentBounds.w + padding * 2);
  let contentH = min(cropped.height - contentY, contentBounds.h + padding * 2);

  return cropped.get(contentX, contentY, contentW, contentH);
}

function copyGraphicsRegionAtLogicalDensity(sourceLayer, x, y, w, h) {
  let copy = createGraphics(w, h);
  copy.pixelDensity(1);
  copy.clear();
  copy.smooth();

  let sourceCanvas = sourceLayer.canvas || sourceLayer.elt;
  let scaleX = sourceCanvas && sourceLayer.width
    ? sourceCanvas.width / sourceLayer.width
    : 1;
  let scaleY = sourceCanvas && sourceLayer.height
    ? sourceCanvas.height / sourceLayer.height
    : 1;

  if (sourceCanvas) {
    copy.drawingContext.drawImage(
      sourceCanvas,
      x * scaleX,
      y * scaleY,
      w * scaleX,
      h * scaleY,
      0,
      0,
      w,
      h
    );
  }

  let result = copy.get();
  try {
    if (copy.canvas && copy.canvas.parentNode) {
      copy.canvas.parentNode.removeChild(copy.canvas);
    }
  } catch (error) {
    console.warn("Could not remove density-safe crop canvas:", error);
  }

  return result;
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

async function regenerateMissingDrawingImages(batchSize = 5) {
  if (repairingMissingDrawingImages) {
    console.warn("Image repair is already running.");
    return;
  }

  repairingMissingDrawingImages = true;
  let limit = constrain(floor(Number(batchSize) || 5), 1, 10);

  try {
    let response = await fetch(`/api/drawings/missing-images?limit=${limit}`);
    if (!response.ok) throw new Error(await response.text());

    let payload = await response.json();
    let drawings = Array.isArray(payload.drawings) ? payload.drawings : [];
    if (drawings.length === 0) {
      console.info("No drawings are missing image URLs.");
      return;
    }

    for (let i = 0; i < drawings.length; i++) {
      let drawing = normalizeDrawingData(drawings[i]);
      if (!drawing || !drawing.dbId || !Array.isArray(drawing.actions)) {
        console.warn("Skipping an invalid drawing record:", drawings[i] && drawings[i].dbId);
        continue;
      }

      let source = renderStoredDrawingAtOriginalSize(drawing);
      let crop = drawing.drawingArea || {
        x: 0,
        y: drawing.headerHeight || 0,
        w: drawing.canvasWidth || source.width,
        h: max(1, (drawing.canvasHeight || source.height) - (drawing.headerHeight || 0))
      };
      let imageDataUrl = createDrawingLayerImageDataURL(source, crop.w, crop.h, 0.82, crop);
      let thumbDataUrl = createDrawingLayerImageDataURL(source, 420, 420, 0.72, crop);

      let updateResponse = await fetch(`/api/drawings/${drawing.dbId}/images`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageDataUrl,
          thumbDataUrl
        })
      });

      removeTemporaryGraphics(source);
      if (!updateResponse.ok) throw new Error(await updateResponse.text());
      console.info(`Regenerated drawing image ${i + 1} / ${drawings.length}`, drawing.dbId);
    }

    await loadArchive();
    refreshArchiveViews();
    console.info(`Image repair batch complete: ${drawings.length} processed.`);
  } catch (error) {
    console.error("Could not regenerate missing drawing images:", error);
  } finally {
    repairingMissingDrawingImages = false;
  }
}

function renderStoredDrawingAtOriginalSize(drawing) {
  let w = max(1, floor(drawing.canvasWidth || width));
  let h = max(1, floor(drawing.canvasHeight || height));
  let g = createGraphics(w, h);
  g.pixelDensity(1);
  g.clear();
  g.smooth();

  let area = drawing.drawingArea || {
    x: 0,
    y: drawing.headerHeight || 0,
    w,
    h: max(1, h - (drawing.headerHeight || 0))
  };
  let minX = constrain(floor(area.x || 0), 0, w - 1);
  let minY = constrain(floor(area.y || 0), 0, h - 1);
  let maxX = constrain(floor(minX + (area.w || w) - 1), minX, w - 1);
  let maxY = constrain(floor(minY + (area.h || h) - 1), minY, h - 1);

  for (let action of drawing.actions || []) {
    if (action.type === "stroke") {
      drawStoredStrokeOnGraphics(g, action);
    } else if (action.type === "fill") {
      floodFillOnGraphics(
        g,
        floor(action.x),
        floor(action.y),
        action.color,
        minX,
        minY,
        maxX,
        maxY
      );
    }
  }

  return g;
}

function drawStoredStrokeOnGraphics(g, action) {
  let points = action.points || [];
  if (action.tool === "eraser") {
    g.erase();
    g.stroke(0);
    g.fill(0);
  } else {
    g.noErase();
    g.stroke(action.color || "#111111");
    g.fill(action.color || "#111111");
  }

  g.strokeWeight(action.tool === "eraser" ? action.size * 2.2 : action.size);
  g.strokeCap(ROUND);
  g.strokeJoin(ROUND);

  if (points.length === 1) {
    g.noStroke();
    g.circle(points[0].x, points[0].y, action.tool === "eraser" ? action.size * 2.2 : action.size);
  } else {
    for (let i = 1; i < points.length; i++) {
      g.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    }
  }
  g.noErase();
}

function removeTemporaryGraphics(g) {
  try {
    if (g && g.canvas && g.canvas.parentNode) {
      g.canvas.parentNode.removeChild(g.canvas);
    }
  } catch (error) {
    console.warn("Could not remove temporary repair graphics:", error);
  }
}

if (typeof window !== "undefined") {
  window.regenerateMissingDrawingImages = regenerateMissingDrawingImages;
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
      requestRender("image-loaded");
    },
    () => {
      entry.failed = true;
      requestRender("image-failed");
    }
  );

  return null;
}

function refreshArchiveViews() {
  clearGridMiniCache();
  invalidateAverageAppleCache();
  generateArchiveWallLayout();
  calculateMaxLayerUnits();
  generateLayerLayout();
  generateDrawBackgroundApplesLayout();
  if (page === "stack") selectFirstAvailableStackPrompt();
  markStackDirty();
  resetArchiveIdleTimer();
  requestRender("archive-refreshed");
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
  miniW = max(1, floor(miniW));
  miniH = max(1, floor(miniH));
  if (
    !archiveReplayMiniBuffer ||
    archiveReplayMiniBufferSize.w !== miniW ||
    archiveReplayMiniBufferSize.h !== miniH
  ) {
    if (archiveReplayMiniBuffer) {
      try {
        if (archiveReplayMiniBuffer.canvas && archiveReplayMiniBuffer.canvas.parentNode) {
          archiveReplayMiniBuffer.canvas.parentNode.removeChild(archiveReplayMiniBuffer.canvas);
        }
      } catch (error) {
        console.warn("Could not remove archive replay buffer:", error);
      }
    }
    archiveReplayMiniBuffer = createGraphics(miniW, miniH);
    archiveReplayMiniBuffer.pixelDensity(1);
    archiveReplayMiniBuffer.smooth();
    archiveReplayMiniBufferSize = { w: miniW, h: miniH };
  }

  let g = archiveReplayMiniBuffer;
  g.pixelDensity(1);
  g.clear();

  renderDrawingToGraphics(g, d, limit, true, alphaValue);

  image(g, 0, 0);
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

function formatArchiveRecordDate(d) {
  let date = d && d.createdAt ? new Date(d.createdAt) : null;
  if (!date || isNaN(date.getTime())) return "undated";
  return [
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getFullYear())
  ].join(".");
}

function getArchivePromptRecordLabel(promptKey) {
  let info = getArchiveRowInfo(Number(promptKey));
  return `${info.task} / ${info.title}`;
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
  resetArchiveIdleTimer();
  requestRender("window-resized");
}
