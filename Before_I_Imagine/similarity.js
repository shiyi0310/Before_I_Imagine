// Apple Report similarity analysis.
// Drawings are compared after crop/scale/centering, with a small transform tolerance.

const REPORT_MASK_SIZE = 144;
const REPORT_MASK_PADDING = 16;
const REPORT_MATCH_RADIUS = 4;

let reportSimilarityScores = [null, null, null, null];
let reportPersonalDrawings = [null, null, null, null];
let reportRepresentativeDrawings = [null, null, null, null];
let reportSimilarityStatus = "idle";
let reportSimilarityBuildKey = "";
let reportSimilarityBuildPromise = null;

function getReportSimilarityScore(promptIndex) {
  let score = reportSimilarityScores[promptIndex];
  return Number.isFinite(score) ? score : null;
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
  return reportPersonalDrawings[promptIndex] || null;
}

function getReportRepresentativeDrawing(promptIndex) {
  return reportRepresentativeDrawings[promptIndex] || null;
}

function registerReportPersonalDrawing(drawing) {
  if (!drawing) return;
  let promptIndex = getDrawingPromptIndex(drawing);
  if (!Number.isInteger(promptIndex) || promptIndex < 0 || promptIndex >= 4) return;
  reportPersonalDrawings[promptIndex] = drawing;
  invalidateAppleReportSimilarity();
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

    let collective = buildReportCollectiveMask(candidates);
    let personalDrawing = reportPersonalDrawings[promptIndex];
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
  let dilatedPersonal = dilateReportMask(personalMask, REPORT_MATCH_RADIUS);
  let ranked = candidates.map((candidate) => {
    let candidateDilated = dilateReportMask(candidate.mask, REPORT_MATCH_RADIUS);
    return {
      candidate,
      score: scoreReportMasks(
        personalMask,
        candidate.mask,
        REPORT_MATCH_RADIUS,
        dilatedPersonal,
        candidateDilated
      )
    };
  }).sort((a, b) => b.score - a.score);

  // Normalization already handles most alignment. Apply the more expensive
  // transform search only to the strongest coarse candidates.
  let finalists = ranked.slice(0, Math.min(6, ranked.length));
  let best = { drawing: null, score: 0 };
  for (let finalist of finalists) {
    let refinedScore = findBestReportMaskScore(
      personalMask,
      finalist.candidate.mask
    );
    if (refinedScore > best.score) {
      best = {
        drawing: finalist.candidate.drawing,
        score: refinedScore
      };
    }
  }
  return best;
}

function findBestReportMaskScore(personalMask, collectiveMask) {
  let bestScore = 0;
  let translations = [-6, 0, 6];
  let scales = [0.94, 1, 1.06];
  let rotations = [-4, 0, 4];
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
