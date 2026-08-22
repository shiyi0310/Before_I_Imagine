// Apple Report similarity analysis.
// Drawings are compared after crop/scale/centering, with a small transform tolerance.

const REPORT_MASK_SIZE = 144;
const REPORT_MASK_PADDING = 16;
const REPORT_MATCH_RADIUS = 3;
const REPORT_STRICT_RADIUS = 1;
const REPORT_MIN_MATCH_SCORE = 35;
const REPORT_SESSION_STORAGE_KEY = "beforeIImagineReportDrawingIds";

let reportSimilarityScores = [null, null, null, null];
let reportPersonalDrawings = [null, null, null, null];
let reportRepresentativeDrawings = [null, null, null, null];
let reportSimilarityStatus = "idle";
let reportSimilarityBuildKey = "";
let reportSimilarityBuildPromise = null;
let reportSessionRestored = false;

function getReportSimilarityScore(promptIndex) {
  let score = reportSimilarityScores[promptIndex];
  return Number.isFinite(score) ? score : null;
}

function hasCloseReportMatch(promptIndex) {
  let score = getReportSimilarityScore(promptIndex);
  return Number.isFinite(score) && score >= REPORT_MIN_MATCH_SCORE;
}

function setReportSimilarityScore(promptIndex, score) {
  if (promptIndex < 0 || promptIndex >= reportSimilarityScores.length) return;
  reportSimilarityScores[promptIndex] = Number.isFinite(score)
    ? constrain(score, 0, 100)
    : null;
}

function getReportSimilarityStatus() {
  return reportSimilarityStatus;
}

function getReportPersonalDrawing(promptIndex) {
  restoreAppleReportSession();
  return reportPersonalDrawings[promptIndex] || null;
}

function getReportRepresentativeDrawing(promptIndex) {
  return reportRepresentativeDrawings[promptIndex] || null;
}

function registerReportPersonalDrawing(drawing) {
  if (!drawing) return;
  let promptIndex = getDrawingPromptIndex(drawing);
  if (!Number.isInteger(promptIndex) || promptIndex < 0 || promptIndex >= 4) return;
  if (promptIndex === 0) {
    reportPersonalDrawings = [null, null, null, null];
  }
  reportPersonalDrawings[promptIndex] = drawing;
  reportSessionRestored = true;
  persistAppleReportSession();
  invalidateAppleReportSimilarity();
}

function persistAppleReportSession() {
  if (typeof sessionStorage === "undefined") return;
  let drawingIds = reportPersonalDrawings.map((drawing) => {
    return drawing && drawing.dbId ? String(drawing.dbId) : null;
  });
  try {
    sessionStorage.setItem(REPORT_SESSION_STORAGE_KEY, JSON.stringify(drawingIds));
  } catch (error) {
    console.warn("Could not save Apple Report session:", error);
  }
}

function restoreAppleReportSession() {
  if (reportSessionRestored || typeof sessionStorage === "undefined") return;
  if (!Array.isArray(archive) || archive.length === 0) return;

  reportSessionRestored = true;
  try {
    let savedIds = JSON.parse(
      sessionStorage.getItem(REPORT_SESSION_STORAGE_KEY) || "[]"
    );
    if (!Array.isArray(savedIds)) return;
    reportPersonalDrawings = [0, 1, 2, 3].map((promptIndex) => {
      let dbId = savedIds[promptIndex];
      if (!dbId) return null;
      return archive.find((drawing) => {
        return drawing && String(drawing.dbId || "") === String(dbId);
      }) || null;
    });
  } catch (error) {
    console.warn("Could not restore Apple Report session:", error);
  }
}

async function useLatestDrawingsForAppleReport() {
  let latestByPrompt = [null, null, null, null];
  for (let i = archive.length - 1; i >= 0; i--) {
    let drawing = archive[i];
    let promptIndex = getDrawingPromptIndex(drawing);
    if (
      Number.isInteger(promptIndex) &&
      promptIndex >= 0 &&
      promptIndex < 4 &&
      !latestByPrompt[promptIndex]
    ) {
      latestByPrompt[promptIndex] = drawing;
    }
    if (latestByPrompt.every(Boolean)) break;
  }

  reportPersonalDrawings = latestByPrompt;
  reportSessionRestored = true;
  persistAppleReportSession();
  invalidateAppleReportSimilarity();
  await ensureAppleReportSimilarity();
  if (typeof requestRender === "function") {
    requestRender("report-use-latest-drawings");
  }

  let result = latestByPrompt.map((drawing, promptIndex) => ({
    promptIndex,
    dbId: drawing ? drawing.dbId || null : null,
    id: drawing ? drawing.id || null : null,
    createdAt: drawing ? drawing.createdAt || null : null
  }));
  console.table(result);
  return result;
}

function resetReportSimilarityScores() {
  reportSimilarityScores = [null, null, null, null];
}

function invalidateAppleReportSimilarity() {
  resetReportSimilarityScores();
  reportRepresentativeDrawings = [null, null, null, null];
  reportSimilarityStatus = "idle";
  reportSimilarityBuildKey = "";
  reportSimilarityBuildPromise = null;
}

function getAppleReportBuildKey() {
  let archivePart = archive.map((drawing) => {
    if (!drawing) return "";
    return `${drawing.dbId || drawing.id || drawing.createdAt || ""}:${drawing.tag || ""}`;
  }).join("|");
  let personalPart = reportPersonalDrawings.map((drawing) => {
    return drawing && (drawing.dbId || drawing.id || drawing.createdAt || "");
  }).join("|");
  return `${archive.length}:${archivePart}:${personalPart}`;
}

function ensureAppleReportSimilarity() {
  restoreAppleReportSession();
  let buildKey = getAppleReportBuildKey();
  if (reportSimilarityStatus === "ready" && reportSimilarityBuildKey === buildKey) {
    return Promise.resolve();
  }
  if (reportSimilarityStatus === "loading" && reportSimilarityBuildKey === buildKey) {
    return reportSimilarityBuildPromise;
  }

  reportSimilarityBuildKey = buildKey;
  reportSimilarityStatus = "loading";
  resetReportSimilarityScores();
  reportRepresentativeDrawings = [null, null, null, null];

  reportSimilarityBuildPromise = buildAppleReportSimilarity(buildKey)
    .catch((error) => {
      if (reportSimilarityBuildKey !== buildKey) return;
      reportSimilarityStatus = "error";
      console.warn("Could not build Apple Report similarity:", error);
    })
    .finally(() => {
      if (typeof requestRender === "function") requestRender("report-similarity");
    });

  return reportSimilarityBuildPromise;
}

async function buildAppleReportSimilarity(buildKey) {
  let personalKeys = new Set(
    reportPersonalDrawings.filter(Boolean).map(getReportDrawingKey)
  );
  let promptEntries = [[], [], [], []];

  for (let i = 0; i < archive.length; i++) {
    let drawing = archive[i];
    let promptIndex = getDrawingPromptIndex(drawing);
    if (promptIndex >= 0 && promptIndex < 4) {
      promptEntries[promptIndex].push({ index: i, drawing });
    }
  }

  for (let promptIndex = 0; promptIndex < 4; promptIndex++) {
    let entries = promptEntries[promptIndex];
    let loadedDrawings = [];

    for (let start = 0; start < entries.length; start += 5) {
      let batch = entries.slice(start, start + 5);
      let results = await Promise.all(batch.map(async (entry) => {
        if (Array.isArray(entry.drawing.actions)) return entry.drawing;
        return loadAverageDrawingActions(entry.index);
      }));
      loadedDrawings.push(...results.filter(Boolean));
      await yieldSimilarityWork();
    }

    if (reportSimilarityBuildKey !== buildKey) return;

    let candidates = [];
    for (let drawing of loadedDrawings) {
      if (drawing.tag === "outlier" || personalKeys.has(getReportDrawingKey(drawing))) continue;
      let maskData = createReportDrawingMask(drawing);
      if (maskData) candidates.push({ drawing, ...maskData });
    }

    let personalDrawing = reportPersonalDrawings[promptIndex];
    if (personalDrawing && !Array.isArray(personalDrawing.actions)) {
      let personalKey = getReportDrawingKey(personalDrawing);
      let loadedPersonal = loadedDrawings.find((drawing) => {
        return getReportDrawingKey(drawing) === personalKey;
      });
      if (loadedPersonal) {
        personalDrawing = loadedPersonal;
        reportPersonalDrawings[promptIndex] = loadedPersonal;
      }
    }

    // The Default Apple keeps the existing collective-archive comparison.
    // The three prompted variations use this participant's own Default Apple
    // as their baseline, so the score describes change within one session.
    if (promptIndex > 0) {
      let defaultDrawing = reportPersonalDrawings[0];
      let personalMask = personalDrawing ? createReportDrawingMask(personalDrawing) : null;
      let defaultMask = defaultDrawing ? createReportDrawingMask(defaultDrawing) : null;

      reportRepresentativeDrawings[promptIndex] = defaultDrawing || null;
      if (personalMask && defaultMask) {
        setReportSimilarityScore(
          promptIndex,
          findBestReportShapeScore(personalMask.mask, defaultMask.mask)
        );
      }
      await yieldSimilarityWork();
      continue;
    }

    let collective = buildReportCollectiveMask(candidates);
    let personalMask = personalDrawing ? createReportDrawingMask(personalDrawing) : null;
    if (personalMask && candidates.length > 0) {
      let closestMatch = findClosestReportDrawing(personalMask.mask, candidates);
      reportRepresentativeDrawings[promptIndex] = closestMatch.drawing;
      setReportSimilarityScore(promptIndex, closestMatch.score);
    } else if (collective) {
      reportRepresentativeDrawings[promptIndex] = findReportRepresentative(
        candidates,
        collective.mask
      );
    }
    await yieldSimilarityWork();
  }

  if (reportSimilarityBuildKey !== buildKey) return;
  reportSimilarityStatus = "ready";
}

function getReportDrawingKey(drawing) {
  if (!drawing) return "";
  return String(drawing.dbId || drawing.id || drawing.createdAt || "");
}

function createReportDrawingMask(drawing) {
  let normalized = normalizeReportDrawingStrokes(
    drawing,
    REPORT_MASK_SIZE,
    REPORT_MASK_PADDING
  );
  if (!normalized) return null;

  let graphics = createGraphics(REPORT_MASK_SIZE, REPORT_MASK_SIZE);
  graphics.pixelDensity(1);
  graphics.clear();
  graphics.noFill();
  graphics.stroke(0, 255);
  graphics.strokeCap(ROUND);
  graphics.strokeJoin(ROUND);

  for (let stroke of normalized.strokes) {
    graphics.strokeWeight(stroke.size);
    if (stroke.points.length === 1) {
      graphics.circle(stroke.points[0].x, stroke.points[0].y, max(1.5, stroke.size));
      continue;
    }
    for (let i = 1; i < stroke.points.length; i++) {
      let previous = stroke.points[i - 1];
      let point = stroke.points[i];
      graphics.line(previous.x, previous.y, point.x, point.y);
    }
  }

  graphics.loadPixels();
  let mask = new Uint8Array(REPORT_MASK_SIZE * REPORT_MASK_SIZE);
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (graphics.pixels[i * 4 + 3] > 24) {
      mask[i] = 1;
      count++;
    }
  }
  removeReportGraphics(graphics);
  return count > 0 ? { mask, count } : null;
}

function normalizeReportDrawingStrokes(drawing, targetSize, padding) {
  let strokes = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let action of drawing.actions || []) {
    if (!action || action.type !== "stroke" || (action.tool && action.tool !== "brush")) continue;
    let points = [];
    for (let point of action.points || []) {
      let x = Number(point.x);
      let y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (points.length > 0) {
      strokes.push({
        size: Number(action.size) || 4,
        points
      });
    }
  }

  if (strokes.length === 0 || !Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  let contentW = Math.max(1, maxX - minX);
  let contentH = Math.max(1, maxY - minY);
  let scaleFactor = Math.min(
    (targetSize - padding * 2) / contentW,
    (targetSize - padding * 2) / contentH
  );
  let offsetX = (targetSize - contentW * scaleFactor) / 2;
  let offsetY = (targetSize - contentH * scaleFactor) / 2;

  return {
    strokes: strokes.map((stroke) => ({
      size: Math.max(1.2, Math.min(4.5, stroke.size * scaleFactor)),
      points: stroke.points.map((point) => ({
        x: offsetX + (point.x - minX) * scaleFactor,
        y: offsetY + (point.y - minY) * scaleFactor
      }))
    }))
  };
}

function buildReportCollectiveMask(candidates) {
  if (candidates.length === 0) return null;
  let pixelFrequency = new Uint16Array(REPORT_MASK_SIZE * REPORT_MASK_SIZE);

  for (let candidate of candidates) {
    let participantArea = dilateReportMask(candidate.mask, 2);
    for (let i = 0; i < participantArea.length; i++) {
      if (participantArea[i]) pixelFrequency[i] += 1;
    }
  }

  let threshold = Math.max(2, Math.ceil(candidates.length * 0.1));
  let mask = frequencyToReportMask(pixelFrequency, threshold);
  if (countReportMaskPixels(mask) < 20) {
    threshold = Math.max(1, Math.ceil(candidates.length * 0.06));
    mask = frequencyToReportMask(pixelFrequency, threshold);
  }
  return { mask, threshold, participantCount: candidates.length };
}

function frequencyToReportMask(pixelFrequency, threshold) {
  let mask = new Uint8Array(pixelFrequency.length);
  for (let i = 0; i < pixelFrequency.length; i++) {
    if (pixelFrequency[i] >= threshold) mask[i] = 1;
  }
  return mask;
}

function findReportRepresentative(candidates, collectiveMask) {
  let bestDrawing = null;
  let bestScore = -1;
  let dilatedCollective = dilateReportMask(collectiveMask, REPORT_MATCH_RADIUS);
  for (let candidate of candidates) {
    let score = scoreReportMasks(
      candidate.mask,
      collectiveMask,
      REPORT_MATCH_RADIUS,
      null,
      dilatedCollective
    );
    if (score > bestScore) {
      bestScore = score;
      bestDrawing = candidate.drawing;
    }
  }
  return bestDrawing;
}

function findClosestReportDrawing(personalMask, candidates) {
  let ranked = candidates.map((candidate) => {
    return {
      candidate,
      score: scoreReportShapeSimilarity(personalMask, candidate.mask)
    };
  }).sort((a, b) => b.score - a.score);

  // Normalization already handles most alignment. Apply the more expensive
  // transform search only to the strongest coarse candidates.
  let finalists = ranked.slice(0, Math.min(5, ranked.length));
  let best = { drawing: null, score: 0 };
  for (let finalist of finalists) {
    let calibratedScore = findBestReportShapeScore(
      personalMask,
      finalist.candidate.mask
    );
    if (calibratedScore > best.score) {
      best = {
        drawing: finalist.candidate.drawing,
        score: calibratedScore
      };
    }
  }
  return best;
}

function findBestReportShapeScore(personalMask, candidateMask) {
  let bestScore = scoreReportShapeSimilarity(personalMask, candidateMask);
  let transforms = [
    { scale: 0.97, rotation: 0 },
    { scale: 1.03, rotation: 0 },
    { scale: 1, rotation: -3 },
    { scale: 1, rotation: 3 }
  ];

  for (let transform of transforms) {
    let transformed = transformReportMask(
      personalMask,
      transform.scale,
      transform.rotation,
      0,
      0
    );
    bestScore = Math.max(
      bestScore,
      scoreReportShapeSimilarity(transformed, candidateMask)
    );
  }

  return 100 * Math.pow(constrain(bestScore / 100, 0, 1), 1.12);
}

function scoreReportShapeSimilarity(firstMask, secondMask) {
  let contourScore = scoreReportContourDistance(firstMask, secondMask);
  let layoutScore = scoreReportSpatialLayout(firstMask, secondMask);
  let firstInterior = createReportInteriorMask(firstMask);
  let secondInterior = createReportInteriorMask(secondMask);
  let firstHasInterior = firstInterior.count >= REPORT_MASK_SIZE * REPORT_MASK_SIZE * 0.008;
  let secondHasInterior = secondInterior.count >= REPORT_MASK_SIZE * REPORT_MASK_SIZE * 0.008;

  if (firstHasInterior && secondHasInterior) {
    let silhouetteScore = scoreReportBinaryDice(
      firstInterior.mask,
      secondInterior.mask
    );
    return contourScore * 0.48 + silhouetteScore * 0.38 + layoutScore * 0.14;
  }

  let openShapeScore = contourScore * 0.72 + layoutScore * 0.28;
  if (firstHasInterior !== secondHasInterior) {
    openShapeScore *= 0.48;
  }
  return openShapeScore;
}

function scoreReportContourDistance(firstMask, secondMask) {
  let firstCount = countReportMaskPixels(firstMask);
  let secondCount = countReportMaskPixels(secondMask);
  if (firstCount === 0 || secondCount === 0) return 0;

  let distanceToFirst = createReportDistanceField(firstMask);
  let distanceToSecond = createReportDistanceField(secondMask);
  let firstScore = 0;
  let secondScore = 0;
  let sigma = 3.4;

  for (let i = 0; i < firstMask.length; i++) {
    if (firstMask[i]) {
      let distance = distanceToSecond[i];
      firstScore += Math.exp(-(distance * distance) / (2 * sigma * sigma));
    }
    if (secondMask[i]) {
      let distance = distanceToFirst[i];
      secondScore += Math.exp(-(distance * distance) / (2 * sigma * sigma));
    }
  }

  return 100 * ((firstScore / firstCount) + (secondScore / secondCount)) / 2;
}

function createReportDistanceField(mask) {
  let size = REPORT_MASK_SIZE;
  let distance = new Float32Array(mask.length);
  let infinity = size * 4;
  for (let i = 0; i < mask.length; i++) {
    distance[i] = mask[i] ? 0 : infinity;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let index = y * size + x;
      if (x > 0) distance[index] = Math.min(distance[index], distance[index - 1] + 1);
      if (y > 0) distance[index] = Math.min(distance[index], distance[index - size] + 1);
      if (x > 0 && y > 0) {
        distance[index] = Math.min(distance[index], distance[index - size - 1] + 1.414);
      }
      if (x + 1 < size && y > 0) {
        distance[index] = Math.min(distance[index], distance[index - size + 1] + 1.414);
      }
    }
  }

  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      let index = y * size + x;
      if (x + 1 < size) distance[index] = Math.min(distance[index], distance[index + 1] + 1);
      if (y + 1 < size) distance[index] = Math.min(distance[index], distance[index + size] + 1);
      if (x + 1 < size && y + 1 < size) {
        distance[index] = Math.min(distance[index], distance[index + size + 1] + 1.414);
      }
      if (x > 0 && y + 1 < size) {
        distance[index] = Math.min(distance[index], distance[index + size - 1] + 1.414);
      }
    }
  }
  return distance;
}

function scoreReportSpatialLayout(firstMask, secondMask) {
  let gridSize = 8;
  let firstGrid = createReportOccupancyGrid(firstMask, gridSize);
  let secondGrid = createReportOccupancyGrid(secondMask, gridSize);
  let dot = 0;
  let firstLength = 0;
  let secondLength = 0;

  for (let i = 0; i < firstGrid.length; i++) {
    dot += firstGrid[i] * secondGrid[i];
    firstLength += firstGrid[i] * firstGrid[i];
    secondLength += secondGrid[i] * secondGrid[i];
  }
  if (firstLength === 0 || secondLength === 0) return 0;
  return 100 * dot / Math.sqrt(firstLength * secondLength);
}

function createReportOccupancyGrid(mask, gridSize) {
  let result = new Float32Array(gridSize * gridSize);
  let cellSize = REPORT_MASK_SIZE / gridSize;
  for (let y = 0; y < REPORT_MASK_SIZE; y++) {
    for (let x = 0; x < REPORT_MASK_SIZE; x++) {
      if (!mask[y * REPORT_MASK_SIZE + x]) continue;
      let cellX = Math.min(gridSize - 1, Math.floor(x / cellSize));
      let cellY = Math.min(gridSize - 1, Math.floor(y / cellSize));
      result[cellY * gridSize + cellX] += 1;
    }
  }
  return result;
}

function createReportInteriorMask(mask) {
  let size = REPORT_MASK_SIZE;
  let closed = erodeReportMask(dilateReportMask(mask, 2), 2);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) closed[i] = 1;
  }

  let outside = new Uint8Array(mask.length);
  let queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;

  function addOutside(x, y) {
    let index = y * size + x;
    if (closed[index] || outside[index]) return;
    outside[index] = 1;
    queue[tail++] = index;
  }

  for (let x = 0; x < size; x++) {
    addOutside(x, 0);
    addOutside(x, size - 1);
  }
  for (let y = 0; y < size; y++) {
    addOutside(0, y);
    addOutside(size - 1, y);
  }

  while (head < tail) {
    let index = queue[head++];
    let x = index % size;
    let y = Math.floor(index / size);
    if (x > 0) addOutside(x - 1, y);
    if (x + 1 < size) addOutside(x + 1, y);
    if (y > 0) addOutside(x, y - 1);
    if (y + 1 < size) addOutside(x, y + 1);
  }

  let interior = new Uint8Array(mask.length);
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!closed[i] && !outside[i]) {
      interior[i] = 1;
      count++;
    }
  }
  return { mask: interior, count };
}

function erodeReportMask(mask, radius) {
  let size = REPORT_MASK_SIZE;
  let output = new Uint8Array(mask.length);
  let radiusSquared = radius * radius;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let keep = true;
      for (let oy = -radius; oy <= radius && keep; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radiusSquared) continue;
          let targetX = x + ox;
          let targetY = y + oy;
          if (
            targetX < 0 ||
            targetX >= size ||
            targetY < 0 ||
            targetY >= size ||
            !mask[targetY * size + targetX]
          ) {
            keep = false;
            break;
          }
        }
      }
      if (keep) output[y * size + x] = 1;
    }
  }
  return output;
}

function scoreReportBinaryDice(firstMask, secondMask) {
  let firstCount = 0;
  let secondCount = 0;
  let intersection = 0;
  for (let i = 0; i < firstMask.length; i++) {
    if (firstMask[i]) firstCount++;
    if (secondMask[i]) secondCount++;
    if (firstMask[i] && secondMask[i]) intersection++;
  }
  if (firstCount + secondCount === 0) return 0;
  return 100 * (2 * intersection) / (firstCount + secondCount);
}

function findBestReportMaskScore(personalMask, collectiveMask) {
  let bestScore = 0;
  let translations = [-4, 0, 4];
  let scales = [0.96, 1, 1.04];
  let rotations = [-3, 0, 3];
  let dilatedCollective = dilateReportMask(collectiveMask, REPORT_MATCH_RADIUS);

  for (let scaleValue of scales) {
    for (let rotation of rotations) {
      for (let dx of translations) {
        for (let dy of translations) {
          let transformed = transformReportMask(personalMask, scaleValue, rotation, dx, dy);
          bestScore = Math.max(
            bestScore,
            scoreReportMasks(
              transformed,
              collectiveMask,
              REPORT_MATCH_RADIUS,
              null,
              dilatedCollective
            )
          );
        }
      }
    }
  }
  return Math.min(100, bestScore);
}

function transformReportMask(source, scaleValue, rotationDegrees, offsetX, offsetY) {
  let size = REPORT_MASK_SIZE;
  let output = new Uint8Array(source.length);
  let radians = rotationDegrees * Math.PI / 180;
  let cosine = Math.cos(radians);
  let sine = Math.sin(radians);
  let center = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!source[y * size + x]) continue;
      let localX = (x - center) * scaleValue;
      let localY = (y - center) * scaleValue;
      let targetX = Math.round(center + localX * cosine - localY * sine + offsetX);
      let targetY = Math.round(center + localX * sine + localY * cosine + offsetY);
      if (targetX >= 0 && targetX < size && targetY >= 0 && targetY < size) {
        output[targetY * size + targetX] = 1;
      }
    }
  }
  return output;
}

function scoreReportMasks(firstMask, secondMask, radius, dilatedFirst = null, dilatedSecond = null) {
  let firstCount = countReportMaskPixels(firstMask);
  let secondCount = countReportMaskPixels(secondMask);
  if (firstCount === 0 || secondCount === 0) return 0;

  dilatedFirst = dilatedFirst || dilateReportMask(firstMask, radius);
  dilatedSecond = dilatedSecond || dilateReportMask(secondMask, radius);
  let firstMatches = 0;
  let secondMatches = 0;

  for (let i = 0; i < firstMask.length; i++) {
    if (firstMask[i] && dilatedSecond[i]) firstMatches++;
    if (secondMask[i] && dilatedFirst[i]) secondMatches++;
  }

  let firstCoverage = firstMatches / firstCount;
  let secondCoverage = secondMatches / secondCount;
  if (firstCoverage + secondCoverage === 0) return 0;
  return 100 * (2 * firstCoverage * secondCoverage) / (firstCoverage + secondCoverage);
}

function dilateReportMask(mask, radius) {
  let size = REPORT_MASK_SIZE;
  let output = new Uint8Array(mask.length);
  let radiusSquared = radius * radius;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!mask[y * size + x]) continue;
      for (let oy = -radius; oy <= radius; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radiusSquared) continue;
          let targetX = x + ox;
          let targetY = y + oy;
          if (targetX >= 0 && targetX < size && targetY >= 0 && targetY < size) {
            output[targetY * size + targetX] = 1;
          }
        }
      }
    }
  }
  return output;
}

function countReportMaskPixels(mask) {
  let count = 0;
  for (let value of mask) count += value;
  return count;
}

function removeReportGraphics(graphics) {
  try {
    if (graphics && graphics.canvas && graphics.canvas.parentNode) {
      graphics.canvas.parentNode.removeChild(graphics.canvas);
    }
  } catch (error) {
    console.warn("Could not remove Report mask graphics:", error);
  }
}

function yieldSimilarityWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

if (typeof window !== "undefined") {
  window.useLatestDrawingsForAppleReport = useLatestDrawingsForAppleReport;
}
