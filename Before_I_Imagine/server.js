function setup() {
  loadArchive().then(() => {
    refreshArchiveViews();
  });
}

async function submitDrawing() {
  archive.push(drawingData);
  saveArchive();
  refreshArchiveViews();
  saveDrawingToCloud(drawingData);

  alert("Drawing saved.");
}

        archive = cloudArchive.map(normalizeDrawingData).filter(Boolean);

      archive = JSON.parse(saved).map(normalizeDrawingData).filter(Boolean);