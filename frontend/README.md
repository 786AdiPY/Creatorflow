# CreatorFlow — frontend

The whole client app: the public landing page and the dashboard (`/library`)
— asset upload, the Workflow builder, and the six review modules
(Thumbnails, Metadata, Clips, Schedule, Moderation, Analytics). One Vite app,
two routes. See the top-level README for how `frontend/` and `backend/` fit
together.

```
src/
  pages/
    Landing.tsx / Landing.css     public marketing page — problem, pipeline,
                                   embedded canvas, gate, platform, CTA
    Library.tsx / Library.css     the dashboard shell — left nav with all
                                   seven modules, shared asset picker/upload
    Studio.tsx / Studio.css       the Workflow tab: the n8n-style builder,
                                   embedded inside Library (not its own route)
    NotFound.tsx                  catch-all route
  flow/                           shared node-canvas domain: node types, the
                                   default demo graph, and its CSS — used by
                                   both Landing's embedded preview and Studio
  components/
    AssetPicker.tsx                content-asset dropdown, used by Library
    PipelinePreview.tsx            read-only @xyflow/react canvas embedded on
                                    the landing page (not a screenshot)
    ErrorBoundary.tsx
  lib/
    supabase.ts                    Supabase client — direct reads/writes that
                                    don't need a secret
    api.ts                         client for backend/ (metadata/thumbnail/
                                    clip generation, publish)
    assets.ts                      shared upload-a-file-as-content_asset helper
    config.ts                      API_URL — where backend/ is hosted
    motion.tsx                     scroll-reveal / tilt / magnetic-button
                                    primitives used by Landing
```

## Setup

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_API_URL
npm run dev             # http://localhost:5174
```

`npm run build` type-checks (`tsc -b`) then produces `dist/`; `npm run preview`
serves that build locally. `vercel.json` rewrites every path to `index.html`
so client-side routes (`/library`) don't 404 on a fresh load — required for
any Vite + react-router SPA deployed to Vercel.
