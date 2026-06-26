-- Run this in Supabase SQL Editor before deploying the image pipeline.
-- Existing stroke/path data stays in public.drawings.drawing jsonb.

alter table public.drawings
  add column if not exists image_url text,
  add column if not exists thumb_url text;

-- Create a public Storage bucket named drawing-images in the Supabase dashboard:
-- Storage -> New bucket -> drawing-images -> Public bucket.
-- Or use your own bucket name and set SUPABASE_STORAGE_BUCKET on Render.
