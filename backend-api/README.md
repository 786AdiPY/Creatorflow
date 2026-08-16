# CreatorFlow API

FastAPI backend, deployed to Vercel as a Python serverless function. Owns
everything that needs a server-side secret: OpenRouter metadata generation
and (mocked, for now) publishing. Reads/writes go straight to Supabase
Postgres via `supabase-py` with the service-role key — no ORM, no queue.

Simple by design: no job table, no background execution. Every endpoint does
its work in the request and returns the finished row — Vercel's Python
functions don't support work after the response the way Deno's Edge
Functions did, and for what these endpoints actually do (one LLM call, or
nothing external yet) that's not a real constraint.

## Endpoints

```
GET  /health
POST /metadata/generate    {content_asset_id, platform} -> metadata_drafts row
POST /thumbnails/generate  {content_asset_id}            -> thumbnails rows (placeholder)
POST /clips/generate       {content_asset_id}            -> clips row (placeholder)
POST /publish               {scheduled_post_id}           -> updated scheduled_posts row
```

Content asset creation, scheduling, and reads (thumbnails/clips/comments/
analytics lists) don't need a secret and go straight from the frontend to
Supabase via `supabase-js` — see `marketing/src/lib/supabase.ts`.

## Local dev

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENROUTER_API_KEY
uvicorn api.index:app --reload --port 8000
```

## Deploy (Vercel)

Point a Vercel project at this directory (Root Directory: `backend-api`),
set the same three env vars in the Vercel dashboard, deploy. `vercel.json`
rewrites every path into the single `api/index.py` ASGI app.
