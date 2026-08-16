# CreatorFlow — Social Media Automation Suite
## End-to-End MVP Technical Documentation

**Status:** MVP / Hackathon Build
**Stack:** Supabase (backend) + React/JS (frontend)
**Audience:** Engineers building, extending, or scaling this system

---

## 1. Problem & Scope

Creators lose hours to repetitive, non-creative work: writing titles/descriptions/tags, picking upload times, generating thumbnails, moderating comments, cutting clips from long-form content, and reading analytics dashboards manually.

**MVP goal:** one tool, one clean UI, that covers the full pipeline at a "good enough to actually use" level per module — not six disconnected scripts.

**MVP modules (in scope):**
1. Thumbnail Generation
2. Metadata & SEO (title/description/tags)
3. Upload Scheduling
4. Analytics Reporting
5. Comment Moderation
6. Clip Generation

**Explicitly out of scope for MVP** (call these out to your team/judges — scoping is a feature, not a gap):
- Multi-user org accounts / team roles
- Billing
- Native mobile apps
- Support for every platform (target 1–2 platforms end-to-end first, e.g. YouTube + Instagram)
- Fine-tuned/custom ML models (use off-the-shelf APIs first)

---

## 2. Architecture Overview

Design this as **one Supabase backend with modular Edge Functions**, not six microservices — microservices are a v2 concern (see §9). Keep every module as an isolated Edge Function/package so it *can* be split out later without a rewrite.

```
                        ┌─────────────────────────┐
                        │   React Frontend (SPA)  │
                        │  Dashboard / Editor UI  │
                        └────────────┬────────────┘
                                     │ REST (JSON)
                        ┌────────────▼────────────┐
                        │     Supabase Backend     │
                        │ (Auth, Edge Functions,   │
                        │  DB, Storage, Realtime)  │
                        └────────────┬────────────┘
          ┌───────────┬─────────────┼─────────────┬───────────┬───────────┐
          ▼           ▼             ▼             ▼           ▼           ▼
     Thumbnail    Metadata     Scheduler     Analytics   Moderation    Clip
      Module        Module      Module        Module      Module     Module
          │           │             │             │           │           │
          └─────┬─────┴─────┬───────┴──────┬──────┴─────┬─────┴─────┬─────┘
                ▼            ▼              ▼            ▼           ▼
          Supabase Edge Functions ── Supabase Postgres ── Supabase Storage
                                     │
                          Platform Connectors
                     (YouTube Data API, Instagram
                      Graph API, TikTok API, etc.)
```

**Why this shape:**
- A managed Supabase backend keeps the MVP shippable in a hackathon timeframe.
- Long-running work (rendering thumbnails, transcoding clips, analyzing video for clip-worthy moments) goes through **Supabase Edge Functions/background execution** as background jobs from day one — this is the single biggest thing that prevents a painful rewrite later.
- Every module talks to the DB and job execution layer through its own Edge Function/package (`modules/thumbnail/`, `modules/scheduler/`, etc.) — never directly across modules. This is what makes future extraction into services cheap.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Supabase | managed Postgres, Auth, Storage, Edge Functions, and Realtime — removes infrastructure overhead for the hackathon |
| Background jobs | Supabase Edge Functions/background execution | needed for rendering/transcoding/API calls without blocking the frontend |
| Database | Supabase Postgres | relational integrity for users/posts/schedules; JSONB for flexible per-platform metadata |
| ORM | Supabase client / SQL | direct database access without a separate ORM layer for the MVP |
| File/object storage | Supabase Storage | thumbnails, source videos, clips |
| Frontend | React + Vite, TypeScript | matches your existing stack |
| State/data fetching | React Query (TanStack Query) | job polling, cache invalidation on schedule/analytics data |
| UI kit | Tailwind + shadcn/ui or MUI | speed over custom design for a hackathon |
| Auth | Supabase Auth + OAuth2 (per-platform) | you're proxying platform APIs, so platform OAuth is unavoidable |
| Media processing | ffmpeg (clip gen), Pillow / a lightweight image-gen API (thumbnails) | |
| Metadata/SEO generation | LLM API call (Claude/GPT) with a constrained prompt + platform char-limit validation | |

---

## 4. Data Model (MVP schema)

Design the schema to be **platform-agnostic at the core**, with a JSONB escape hatch for platform-specific fields. This is the single most important scaling decision in the whole doc — it's what lets you add a new platform without a migration.

```sql
-- Core entities
users (
  id UUID PK, email, hashed_password, created_at
)

connected_accounts (
  id UUID PK, user_id FK, platform TEXT,        -- 'youtube' | 'instagram' | 'tiktok'
  platform_account_id TEXT, oauth_tokens JSONB,  -- encrypted at rest
  created_at
)

content_assets (
  id UUID PK, user_id FK, source_type TEXT,      -- 'upload' | 'generated'
  storage_url TEXT, duration_seconds INT NULL,
  status TEXT,                                   -- 'processing' | 'ready' | 'failed'
  created_at
)

thumbnails (
  id UUID PK, content_asset_id FK, storage_url,
  variant_label TEXT, generation_params JSONB, created_at
)

metadata_drafts (
  id UUID PK, content_asset_id FK, platform TEXT,
  title TEXT, description TEXT, tags TEXT[],
  seo_score NUMERIC NULL, generated_by TEXT,      -- 'ai' | 'manual'
  created_at
)

scheduled_posts (
  id UUID PK, content_asset_id FK, connected_account_id FK,
  metadata_draft_id FK, thumbnail_id FK NULL,
  scheduled_time TIMESTAMPTZ, status TEXT,        -- 'pending'|'posted'|'failed'
  platform_post_id TEXT NULL, platform_payload JSONB, -- escape hatch
  created_at
)

analytics_snapshots (
  id UUID PK, scheduled_post_id FK, platform TEXT,
  fetched_at TIMESTAMPTZ, metrics JSONB           -- views, likes, retention, etc. (shape varies per platform)
)

comments (
  id UUID PK, scheduled_post_id FK, platform_comment_id TEXT,
  author TEXT, text TEXT, sentiment TEXT NULL,
  moderation_action TEXT NULL,                    -- 'hidden'|'flagged'|'approved'|null
  fetched_at TIMESTAMPTZ
)

clips (
  id UUID PK, content_asset_id FK, start_ms INT, end_ms INT,
  storage_url TEXT, score NUMERIC NULL,           -- "clip-worthiness" score
  status TEXT, created_at
)

jobs (
  id UUID PK, user_id FK, job_type TEXT, status TEXT,
  progress NUMERIC, error TEXT NULL, result_ref UUID NULL,
  created_at, updated_at
)
```

**Key decisions worth defending to reviewers:**
- `platform_payload`/`generation_params`/`metrics` as JSONB = you don't need a migration every time a platform changes its response shape.
- A generic `jobs` table backs every async operation (thumbnail render, clip analysis, publish, analytics fetch) so the frontend has **one** polling/status pattern for all six modules, not six.
- `metadata_drafts` is separate from `scheduled_posts` so users can generate/edit metadata before committing to a schedule — matches real creator workflow.

---

## 5. API Design (representative endpoints)

```
POST   /api/auth/connect/{platform}          — start OAuth flow
GET    /api/auth/callback/{platform}         — OAuth callback

POST   /api/content                          — upload/register a content asset
GET    /api/content/{id}

POST   /api/thumbnails/generate              — {content_asset_id, style_prompt?} -> job_id
GET    /api/thumbnails/{content_asset_id}    — list variants

POST   /api/metadata/generate                — {content_asset_id, platform} -> job_id
PATCH  /api/metadata/{id}                    — manual edit

POST   /api/schedule                         — {content_asset_id, connected_account_id, metadata_draft_id, scheduled_time}
GET    /api/schedule?range=...               — calendar view data
DELETE /api/schedule/{id}

GET    /api/analytics/{scheduled_post_id}
GET    /api/analytics/summary?range=...      — aggregate dashboard data

GET    /api/comments/{scheduled_post_id}
POST   /api/comments/{id}/action              — {action: 'hide'|'flag'|'approve'}

POST   /api/clips/generate                    — {content_asset_id} -> job_id
GET    /api/clips/{content_asset_id}

GET    /api/jobs/{id}                         — poll job status/progress
WS     /ws/jobs/{id}                          — push job status (optional MVP nicety)
```

Keep every long-running action **async by contract**: the POST returns a `job_id` immediately, never blocks on rendering/LLM calls. This one rule is what keeps the UI feeling fast and keeps the backend scalable later.

---

## 6. Frontend Architecture

```
src/
  api/            — typed API client (one function per endpoint, generated from OpenAPI if time allows)
  features/
    thumbnails/
    metadata/
    scheduler/     — calendar view
    analytics/     — charts (recharts)
    moderation/    — comment inbox/queue
    clips/         — clip review/export
  components/       — shared UI (JobStatusBadge, PlatformIcon, AssetPicker...)
  hooks/            — useJobPolling(jobId), useConnectedAccounts()
  store/            — React Query for server state; light Zustand/Context for UI-only state
```

**Job polling pattern (reuse across all 6 modules):**
```ts
useJobPolling(jobId) → React Query with refetchInterval until status is 'done'|'failed'
```
Build this once, use it everywhere a module kicks off async work. This is the frontend equivalent of the generic `jobs` table.

**One shell, six feature tabs** — a single dashboard shell (sidebar nav + top content-asset picker) with each module as a tab/route operating on the currently selected `content_asset`. This is what makes it feel "all-in-one" instead of six tools bolted together.

---

## 7. Platform Integration Notes

- Abstract each platform behind a `PlatformConnector` interface (`publish()`, `fetch_analytics()`, `fetch_comments()`, `moderate_comment()`) so adding a platform means implementing one interface, not touching six modules.
- Start with **one platform fully working end-to-end** (recommend YouTube — richest API for analytics + comments) before adding a second. A shallow 4-platform integration demos worse than one deep one.
- Store OAuth tokens securely; refresh proactively via a scheduled Supabase Edge Function/task.

---

## 8. MVP Deployment

- Supabase provides the backend infrastructure: Auth, Postgres, Storage, Edge Functions, and Realtime.
- Frontend as a static build served separately (Vercel/Netlify) or through the same deployment.
- Environment-based config (`.env`) for platform API keys, Supabase URL, Supabase anon/service keys, and storage configuration.

---

## 9. Scaling Roadmap (post-MVP)

This is the part judges/future-you will care about most — show you know *why* today's shortcuts are safe.

| Concern | MVP approach | Scale path |
|---|---|---|
| Compute for media jobs | Supabase Edge Functions/background execution | Split into dedicated worker services per job type (thumbnail-render, clip-transcode, llm-metadata); autoscale workers by queue depth |
| Module coupling | Modular Supabase backend with isolated Edge Functions | Extract hot modules (clip gen, thumbnail gen — most CPU-heavy) into their own services behind the same job-queue contract; the `jobs` table abstraction means the frontend doesn't change |
| Database | Supabase Postgres | Read replicas for analytics queries; consider a separate analytics/OLAP store (ClickHouse) once `analytics_snapshots` volume grows — don't do this on day 1 |
| Storage | Supabase Storage | CDN in front of thumbnails/clips; lifecycle rules to archive old source video |
| Platform rate limits | Sequential calls per user | Per-platform rate-limit-aware queues (token bucket per connected account) |
| Multi-platform | 1–2 platforms, interface-based connectors | Add connectors incrementally; no core schema change needed since `platform_payload` is JSONB |
| Auth/multi-tenancy | Single user = single owner of their assets | Add org/team model as a layer above `users`, not a rewrite of it |
| LLM costs (metadata/SEO) | Direct API call per request | Cache prompt templates + response by content fingerprint; batch where platform allows |

**The core principle:** the job-execution + JSONB-escape-hatch + connector-interface pattern chosen for the MVP is deliberately the same pattern you'd want at scale — you're not scaling by rewriting, you're scaling by splitting things that are already isolated.

---

## 10. Security & Compliance Notes

- Store OAuth tokens securely via Supabase and never log them.
- Respect each platform's ToS on automation — especially auto-posting and comment moderation (some platforms restrict automated comment deletion).
- Rate-limit your own API to protect against a runaway frontend loop hammering platform APIs (and getting your app's API key banned).

---

## 11. Setup for New Developers

```bash
git clone <repo>
cd creatorflow

# Backend
# Configure Supabase project and environment variables
cp .env.example .env        # fill in platform API keys, Supabase URL/keys
supabase start               # optional for local Supabase
supabase db push
supabase functions serve    # run Edge Functions locally

# Frontend
cd ../frontend
npm install
npm run dev
```

**First things to read in the codebase, in order:**
1. `supabase/migrations/` — the schema in §4, source of truth
2. `supabase/functions/<any module>/` — pick one to see the module pattern (function → service → job)
3. `frontend/src/hooks/useJobPolling.ts` — the pattern every feature reuses
4. `supabase/functions/platforms/base.ts` — the `PlatformConnector` interface

---

## 12. MVP Definition of Done (per module)

- [ ] Thumbnail: upload/select source → generate ≥2 variants → pick one → attach to a scheduled post
- [ ] Metadata: generate title/description/tags for one platform → edit → save as draft
- [ ] Scheduler: pick asset + metadata + thumbnail + time → appears on calendar → auto-publishes at time
- [ ] Analytics: after a real or mock publish, show views/likes/comments on a dashboard
- [ ] Moderation: fetch comments for a post → approve/hide → action reflected on platform (or mocked)
- [ ] Clips: upload long-form video → get ≥1 suggested clip with in/out points → export

Ship all six at "does the happy path end-to-end" quality before polishing any one module — a judge (and a future user) will forgive rough edges far more than a missing pipeline stage.
