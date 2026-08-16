# CreatorFlow — Features

One app (`frontend/`), two routes. Everything reads/writes the same Supabase
project; `backend/` (FastAPI) is the only thing that touches OpenRouter or
does anything on a schedule.

## `/` — Landing

Public marketing page. Problem → pipeline → embedded live canvas preview →
approval gate → platform capabilities → CTA into the dashboard. No auth, no
backend calls — the pipeline preview it embeds is the same read-only
`@xyflow/react` canvas as Studio, just non-interactive.

## `/library` — Dashboard

Single shell: brand mark + asset picker/upload in the top bar, one left nav
with all seven modules below. Selecting or uploading an asset up top is
global — every tab operates on whichever asset is currently selected.

- **Workflow** — the n8n-style builder (formerly a separate `/studio` route,
  now the default tab). Drag modules onto the canvas, wire them, configure
  each one, hit **Run**: it walks the graph left-to-right and calls the real
  endpoint behind each node (clip/thumbnail/metadata generation, schedule,
  a real human-approval pause, publish, analytics/moderation reads).
- **Thumbnails** — generate cover variants for the selected asset, pick one.
- **Metadata** — generate title/description/tags per platform via
  `backend/`'s OpenRouter call, edit inline, save.
- **Clips** — find clip-worthy moments in a long-form asset.
- **Schedule** — queue a post (platform + time), publish it immediately from
  the table once it's pending.
- **Moderation** — inbox of comments awaiting approve/hide, scoped to the
  selected asset's posts.
- **Analytics** — stat tiles + a snapshot table for the selected asset's
  published posts.

Thumbnail/clip generation and publish are still placeholders under the hood
(no real image-gen/ffmpeg/platform API yet) — the endpoints, data flow, and
UI are real; swapping in a real provider doesn't change any of this.
