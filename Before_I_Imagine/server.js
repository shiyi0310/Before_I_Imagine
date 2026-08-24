require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODERATION_MODEL = "omni-moderation-2024-09-26";
const BLOCKED_REFLECTION_PATTERNS = [
  {
    category: "sexual",
    pattern: /\b(?:sex|sexual|porn|pornography|porno|nude|naked|penis|dick|cock|vagina|pussy|boobs?|breasts?|blowjob|masturbat(?:e|ion|ing))\b/i
  },
  {
    category: "sexual",
    pattern: /(?:色情|黄色内容|黄色网站|黄网|黄片|性爱|做爱|裸体|裸照|阴茎|鸡巴|屌|阴道|逼|乳房|奶子)/i
  },
  {
    category: "violence",
    pattern: /\b(?:blood|bloody|gore|gory|murder|murdered|killing|killed|kill)\b/i
  },
  {
    category: "violence",
    pattern: /(?:血腥|流血|暴力|谋杀|杀人|杀死|尸体|肢解)/i
  }
];

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
    thumb_url: row.thumb_url || null,
    moderation_status: row.moderation_status || null,
    reflection_text: row.reflection_text || drawing.reflection_text || null
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
    thumb_url: row.thumb_url || null,
    moderation_status: row.moderation_status || null,
    reflection_text: row.reflection_text || light.reflection_text || null
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

function findBlockedReflectionCategory(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const match = BLOCKED_REFLECTION_PATTERNS.find(item => item.pattern.test(text));
  return match ? match.category : null;
}

function formatModerationScores(scores) {
  if (!scores || typeof scores !== "object") return "unavailable";
  return Object.entries(scores)
    .filter(([, score]) => typeof score === "number")
    .map(([category, score]) => {
      const value = score > 0 && score < 0.0001 ? score.toExponential(3) : score.toFixed(4);
      return `${category}=${value}`;
    })
    .join(", ");
}

async function moderateDrawingContent(drawingId, input, inputLabel, safeStatus = "approved") {
  console.log(`[Moderation] Checking ${inputLabel} for drawing ID ${drawingId} ...`);

  if (!process.env.OPENAI_API_KEY) {
    console.error(`[Moderation] Failed, keeping pending drawing ID ${drawingId}: OPENAI_API_KEY is not configured.`);
    return "pending";
  }
  if (!input) {
    console.error(`[Moderation] Failed, keeping pending drawing ID ${drawingId}: no ${inputLabel} input.`);
    return "pending";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODERATION_MODEL,
        input
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI Moderation API returned ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const result = await response.json();
    const moderationResult = result && result.results && result.results[0];
    const flagged = moderationResult && moderationResult.flagged;
    if (typeof flagged !== "boolean") {
      throw new Error("OpenAI Moderation API returned an unexpected response.");
    }

    console.log(`[Moderation] Scores ${inputLabel} for drawing ID ${drawingId}: ${formatModerationScores(moderationResult.category_scores)}`);

    const moderationStatus = flagged ? "rejected" : safeStatus;
    const { error } = await supabase
      .from("drawings")
      .update({ moderation_status: moderationStatus })
      .eq("id", drawingId);

    if (error) {
      throw new Error(`Could not store moderation result: ${error.message}`);
    }

    const action = moderationStatus === "rejected"
      ? "Rejected"
      : moderationStatus === "approved"
        ? "Approved"
        : "Safe text, keeping pending";
    console.log(`[Moderation] ${action} drawing ID ${drawingId} ...`);
    return moderationStatus;
  } catch (error) {
    console.error(`[Moderation] Failed, keeping pending drawing ID ${drawingId}:`, error.message);
    return "pending";
  }
}

async function moderateDrawingImage(drawingId, imageInput) {
  return moderateDrawingContent(drawingId, [{
    type: "image_url",
    image_url: { url: imageInput }
  }], "image");
}

async function moderateDrawingReflection(drawingId, reflectionText, safeStatus) {
  return moderateDrawingContent(drawingId, reflectionText, "reflection", safeStatus);
}

app.get("/api/drawings", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const { data, error } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text, moderation_status")
    .or("moderation_status.eq.approved,moderation_status.is.null")
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
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text, moderation_status", { count: "exact" })
    .or("moderation_status.eq.approved,moderation_status.is.null")
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
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text, moderation_status")
    .eq("id", req.params.id)
    .or("moderation_status.eq.approved,moderation_status.is.null")
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
    thumb_url: thumbUrl,
    reflection_text: drawing.reflection_text || null
  };
  delete storedDrawing.preview;

  const { data, error } = await supabase
    .from("drawings")
    .insert([{
      drawing: storedDrawing,
      image_url: imageUrl,
      thumb_url: thumbUrl,
      reflection_text: storedDrawing.reflection_text || null,
      moderation_status: "pending"
    }])
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text, moderation_status")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const moderationStatus = await moderateDrawingImage(data.id, body.thumbDataUrl || thumbUrl);
  return res.status(201).json(attachDatabaseFields({
    ...data,
    moderation_status: moderationStatus
  }));
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
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text")
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
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text")
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

  const { preview, tag, weight, reflection_text } = req.body || {};
  const hasPreview = preview !== undefined;
  const hasTag = tag !== undefined;
  const hasWeight = weight !== undefined;
  const hasReflectionText = reflection_text !== undefined;

  if (!hasPreview && !hasTag && !hasWeight && !hasReflectionText) {
    return res.status(400).json({ error: "No drawing fields supplied." });
  }
  if (hasPreview && (typeof preview !== "string" || !preview.startsWith("data:image/"))) {
    return res.status(400).json({ error: "Invalid preview data." });
  }
  if (hasTag && tag !== null && tag !== "outlier") {
    return res.status(400).json({ error: "Invalid drawing tag." });
  }
  if (hasWeight && (!Number.isFinite(Number(weight)) || Number(weight) < 0 || Number(weight) > 1)) {
    return res.status(400).json({ error: "Invalid drawing weight." });
  }
  if (hasReflectionText && reflection_text !== null && typeof reflection_text !== "string") {
    return res.status(400).json({ error: "Invalid reflection text." });
  }
  const normalizedReflectionText = hasReflectionText && typeof reflection_text === "string"
    ? reflection_text.trim() || null
    : reflection_text;

  const { data: existing, error: selectError } = await supabase
    .from("drawings")
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text, moderation_status")
    .eq("id", req.params.id)
    .single();

  if (selectError) {
    return res.status(500).json({ error: selectError.message });
  }

  const drawing = existing && existing.drawing && typeof existing.drawing === "object"
    ? existing.drawing
    : {};
  const updatedDrawing = { ...drawing };
  if (hasPreview) updatedDrawing.preview = preview;
  if (hasTag) {
    if (tag === null) delete updatedDrawing.tag;
    else updatedDrawing.tag = tag;
  }
  if (hasWeight) updatedDrawing.weight = Number(weight);
  if (hasReflectionText) updatedDrawing.reflection_text = normalizedReflectionText || null;

  const updateData = { drawing: updatedDrawing };
  const blockedReflectionCategory = hasReflectionText
    ? findBlockedReflectionCategory(normalizedReflectionText)
    : null;
  const shouldModerateReflection = Boolean(normalizedReflectionText)
    && !blockedReflectionCategory
    && existing.moderation_status !== "rejected";

  if (hasReflectionText) {
    updateData.reflection_text = normalizedReflectionText || null;
    if (blockedReflectionCategory) updateData.moderation_status = "rejected";
    else if (shouldModerateReflection) updateData.moderation_status = "pending";
  }

  const { data, error } = await supabase
    .from("drawings")
    .update(updateData)
    .eq("id", req.params.id)
    .select("id, created_at, drawing, image_url, thumb_url, reflection_text, moderation_status")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (blockedReflectionCategory) {
    console.log(`[Moderation] Rejected reflection for drawing ID ${data.id}: blocked ${blockedReflectionCategory} keyword.`);
    return res.json(attachDatabaseFields(data));
  }

  if (shouldModerateReflection) {
    const safeStatus = existing.moderation_status === "pending" ? "pending" : "approved";
    const moderationStatus = await moderateDrawingReflection(data.id, normalizedReflectionText, safeStatus);
    return res.json(attachDatabaseFields({
      ...data,
      moderation_status: moderationStatus
    }));
  }

  return res.json(attachDatabaseFields(data));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
