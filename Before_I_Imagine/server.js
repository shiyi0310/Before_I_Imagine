const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "drawing-images";
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve index.html, sketch.js, style.css, p5.js, and other local assets.
app.use(express.static(__dirname));

app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is working!",
    databaseConnected: Boolean(supabase)
  });
});

function attachDatabaseFields(row) {
  const drawing = row && row.drawing && typeof row.drawing === "object"
    ? row.drawing
    : {};

  return {
    ...drawing,
    dbId: row.id,
    dbCreatedAt: row.created_at,
    image_url: row.image_url || null,
    thumb_url: row.thumb_url || null
  };
}

function stripHeavyDrawingFields(drawing) {
  const light = drawing && typeof drawing === "object" ? { ...drawing } : {};
  delete light.actions;
  delete light.strokes;
  delete light.path;
  delete light.paths;
  delete light.preview;
  return light;
}

function attachLightDatabaseFields(row) {
  const light = stripHeavyDrawingFields(row.drawing);
  return {
    ...light,
    dbId: row.id,
    id: light.id || row.id,
    dbCreatedAt: row.created_at,
    createdAt: light.createdAt || row.created_at,
    image_url: row.image_url || null,
    thumb_url: row.thumb_url || null
  };
}

function dataURLToUpload(dataURL) {
  if (typeof dataURL !== "string" || !dataURL.startsWith("data:image/")) return null;
  const match = dataURL.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") ? "jpg" : "png";
  return {
    buffer: Buffer.from(match[2], "base64"),
    mimeType,
    extension
  };
}

async function uploadDrawingImage(dataURL, prefix, drawingId) {
  const upload = dataURLToUpload(dataURL);
  if (!upload) return null;

  const filePath = `${prefix}/${drawingId}-${Date.now()}.${upload.extension}`;
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(filePath, upload.buffer, {
      contentType: upload.mimeType,
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(filePath);

  return data && data.publicUrl ? data.publicUrl : null;
}

app.get("/api/drawings", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const { data, error } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url")
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data.map(attachLightDatabaseFields));
});

app.get("/api/drawings/missing-images", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 25);
  const { data, error, count } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url", { count: "exact" })
    .or("image_url.is.null,thumb_url.is.null")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    total: count || 0,
    drawings: data.map(attachDatabaseFields)
  });
});

app.get("/api/drawings/:id", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const { data, error } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(attachDatabaseFields(data));
});

app.post("/api/drawings", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const body = req.body;
  const drawing = body && body.drawing && typeof body.drawing === "object"
    ? body.drawing
    : body;

  if (!drawing || typeof drawing !== "object" || Array.isArray(drawing)) {
    return res.status(400).json({ error: "Invalid drawing data." });
  }

  const drawingId = drawing.id || Date.now();
  const imageUrl = await uploadDrawingImage(body.imageDataUrl, "full", drawingId);
  const thumbUrl = await uploadDrawingImage(body.thumbDataUrl, "thumb", drawingId);
  const storedDrawing = {
    ...drawing,
    image_url: imageUrl,
    thumb_url: thumbUrl
  };
  delete storedDrawing.preview;

  const { data, error } = await supabase
    .from("drawings")
    .insert([{ drawing: storedDrawing, image_url: imageUrl, thumb_url: thumbUrl }])
    .select("id, created_at, drawing, image_url, thumb_url")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(attachDatabaseFields(data));
});

app.patch("/api/drawings/:id/images", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const { imageDataUrl, thumbDataUrl } = req.body || {};

  const { data: existing, error: selectError } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url")
    .eq("id", req.params.id)
    .single();

  if (selectError) {
    return res.status(500).json({ error: selectError.message });
  }

  const drawing = existing && existing.drawing && typeof existing.drawing === "object"
    ? existing.drawing
    : {};
  const drawingId = drawing.id || existing.id;
  const imageUrl = existing.image_url || await uploadDrawingImage(imageDataUrl, "full", drawingId);
  const thumbUrl = existing.thumb_url || await uploadDrawingImage(thumbDataUrl, "thumb", drawingId);
  const updatedDrawing = {
    ...drawing,
    image_url: imageUrl || null,
    thumb_url: thumbUrl || null
  };

  const { data, error } = await supabase
    .from("drawings")
    .update({
      drawing: updatedDrawing,
      image_url: existing.image_url || imageUrl || null,
      thumb_url: existing.thumb_url || thumbUrl || null
    })
    .eq("id", req.params.id)
    .select("id, created_at, drawing, image_url, thumb_url")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(attachDatabaseFields(data));
});

app.patch("/api/drawings/:id", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const { preview } = req.body || {};

  if (typeof preview !== "string" || !preview.startsWith("data:image/")) {
    return res.status(400).json({ error: "Invalid preview data." });
  }

  const { data: existing, error: selectError } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url")
    .eq("id", req.params.id)
    .single();

  if (selectError) {
    return res.status(500).json({ error: selectError.message });
  }

  const drawing = existing && existing.drawing && typeof existing.drawing === "object"
    ? existing.drawing
    : {};
  const updatedDrawing = {
    ...drawing,
    preview
  };

  const { data, error } = await supabase
    .from("drawings")
    .update({ drawing: updatedDrawing })
    .eq("id", req.params.id)
    .select("id, created_at, drawing, image_url, thumb_url")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(attachDatabaseFields(data));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
