const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
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

app.get("/api/drawings", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const { data, error } = await supabase
    .from("drawings")
    .select("id, created_at, drawing")
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data.map((row) => row.drawing));
});

app.post("/api/drawings", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Render Environment."
    });
  }

  const drawing = req.body;

  if (!drawing || typeof drawing !== "object" || Array.isArray(drawing)) {
    return res.status(400).json({ error: "Invalid drawing data." });
  }

  const { data, error } = await supabase
    .from("drawings")
    .insert([{ drawing }])
    .select("id, created_at, drawing")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
