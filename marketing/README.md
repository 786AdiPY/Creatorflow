# CreatorFlow — marketing site

The public-facing site: the landing page and the Studio workflow builder.
Deliberately a **separate app** from `../frontend/` (the authenticated
console) — different audience, different bundle, no shared build. See the
top-level README for how the three pieces (`backend/`, `frontend/`,
`marketing/`) fit together.

```
src/
  pages/
    Landing.tsx / Landing.css   marketing page — problem, pipeline, embedded
                                 canvas, gate, platform, CTA
    Studio.tsx / Studio.css     the n8n-style workflow builder
    NotFound.tsx                catch-all route
  flow/                         shared node-canvas domain: node types, the
                                 default demo graph, and its CSS — used by
                                 both Landing's embedded preview and Studio
  components/
    PipelinePreview.tsx          read-only @xyflow/react canvas embedded on
                                  the landing page (not a screenshot)
    ErrorBoundary.tsx
  lib/
    motion.tsx                   scroll-reveal / tilt / magnetic-button
                                  primitives used by Landing
    config.ts                    CONSOLE_URL — where frontend/ is hosted
```

## Scope

Studio is a real, working node editor — drag from the palette, connect,
configure, delete, "Run" (a local simulation with a log panel). It does not
call the backend: wiring "Run" to the actual jobs the console/backend expose
is the next step, not something this page pretends to do.

## Setup

```bash
npm install
cp .env.example .env   # VITE_CONSOLE_URL — where frontend/ is running/hosted
npm run dev             # http://localhost:5174
```

`npm run build` type-checks (`tsc -b`) then produces `dist/`; `npm run preview`
serves that build locally.
