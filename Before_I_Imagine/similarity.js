// Apple Report similarity state and future comparison helpers.
// The UI currently shows pending scores until the mask comparison phase is added.

let reportSimilarityScores = [null, null, null, null];

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

function resetReportSimilarityScores() {
  reportSimilarityScores = [null, null, null, null];
}

