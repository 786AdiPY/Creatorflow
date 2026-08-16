# CreatorFlow

CreatorFlow is an AI-powered workspace that turns a creator's raw content into publish-ready social media content, handles publishing, and brings the resulting performance data back into one dashboard.

Per-page breakdown: [features.md](features.md)

## Workflow

![CreatorFlow workflow diagram](docs/workflow-diagram.png)

Upload lands as a content asset, the orchestrator fans out to the five generation
modules (metadata, thumbnail, clip, comment moderation, optimization) with a quality
check/validation gate in front of each, then review/approve triggers publish across
platforms and analytics rolls back into the dashboard. The Workflow tab in
`/library` renders this same flow live — see [features.md](features.md) for
how each piece is wired today vs. the full diagram.

## Structure

Two apps.

```
frontend/            React + Vite + TypeScript SPA — landing page + the
                      dashboard (Workflow builder + six review modules)
backend/
  supabase/
    migrations/         Postgres schema
  api/
    index.py             FastAPI app — metadata/thumbnail/clip generation, publish
  vercel.json
```

## Setup

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENROUTER_API_KEY
uvicorn api.index:app --reload --port 8000

# Schema — no CLI needed, paste these into your Supabase project's SQL Editor:
#   backend/supabase/migrations/0001_init.sql
#   backend/supabase/migrations/0002_storage.sql

# Frontend
cd ../frontend
cp .env.example .env   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_API_URL
npm install
npm run dev             # http://localhost:5174
```

Deploying to Vercel (Single Project):

1. Import this repository into Vercel.
2. Under **Project Settings** -> **General**:
   - Set **Root Directory** to `./` (leave blank or select repository root).
   - **Framework Preset**: `Other` or `Vite`.
3. Set Environment Variables in Vercel Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY` (optional)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (optional, defaults to `/api` for same-origin)
4. Deploy! `vercel.json` automatically builds the React frontend into `frontend/dist` and routes `/api/*` requests to the Python serverless function at `api/index.py`.

### AI features (OpenRouter)

All text-generation AI (currently: metadata/SEO title+description+tags) goes through
`backend/api/index.py` using an `OPENROUTER_API_KEY` env var. Defaults to
`openai/gpt-4o-mini`; override with `OPENROUTER_MODEL`. Thumbnail generation
and clip analysis are not text tasks and are still placeholders.

## Current state

Schema + the full dashboard (Workflow builder, Thumbnails, Metadata,
Clips, Schedule, Moderation, Analytics) are wired end-to-end against a real
Supabase project. Metadata generation calls OpenRouter for real. Thumbnail
render and clip analysis are still placeholders — see `TODO` comments in
`backend/api/index.py`. Publishing is mocked (no real platform OAuth yet).
No auth in this pass — single-workspace MVP, see `0001_init.sql`'s header.
