"""CreatorFlow backend — FastAPI on Vercel.

Deployed as one of two runtimes in a single Vercel project (see the root
vercel.json): this Python function owns everything under /api/*, a static
build of ../frontend owns everything else. Routes here are prefixed with
/api accordingly — Vercel forwards the request path as-is, it doesn't strip
the matched prefix.

No job queue: Vercel's Python functions don't support background work after
the response the way Deno's EdgeRuntime.waitUntil did, so every endpoint here
does its work synchronously and returns the finished row. That's a genuine
simplification, not a workaround — thumbnail/clip generation are still
placeholders and metadata generation (the one real external call, to
OpenRouter) comfortably finishes inside a request.
"""
import os
import json
import uuid
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
def get_db() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(
            500,
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables."
        )
    return create_client(url, key)

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL") or "openai/gpt-4o-mini"

app = FastAPI(title="CreatorFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Platform = Literal["youtube", "instagram", "tiktok"]

PLATFORM_LIMITS = {
    "youtube": {"title": 100, "description": 5000, "tags": 15},
    "instagram": {"title": 0, "description": 2200, "tags": 30},
    "tiktok": {"title": 0, "description": 2200, "tags": 10},
}


@app.get("/")
@app.get("/api")
@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── metadata ──────────────────────────────────────────────────────────────
class MetadataGenerateRequest(BaseModel):
    content_asset_id: str
    platform: Platform


@app.post("/api/metadata/generate")
def generate_metadata(body: MetadataGenerateRequest):
    if not OPENROUTER_API_KEY:
        raise HTTPException(500, "Missing OPENROUTER_API_KEY")

    limits = PLATFORM_LIMITS[body.platform]

    asset = (
        get_db().table("content_assets")
        .select("storage_url, source_type")
        .eq("id", body.content_asset_id)
        .single()
        .execute()
        .data
    )

    system_prompt = (
        "You write high-CTR, platform-appropriate social media metadata. "
        'Respond with strict JSON only: {"title": string, "description": string, "tags": string[]}. '
        f"Title must be {limits['title'] or 'omitted (empty string)'} characters or fewer. "
        f"Description must be {limits['description']} characters or fewer. "
        f"Provide at most {limits['tags']} tags."
    )
    user_prompt = (
        f"Platform: {body.platform}\n"
        f"Content asset: {asset['storage_url']} ({asset['source_type']})\n"
        "Generate title, description, and tags for this content."
    )

    resp = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/786AdiPY/Creatorflow",
            "X-Title": "CreatorFlow",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        raise HTTPException(502, f"OpenRouter request failed: {resp.status_code} {resp.text}")

    content = resp.json()["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    draft = {
        "content_asset_id": body.content_asset_id,
        "platform": body.platform,
        "title": (parsed.get("title") or "")[: limits["title"]] if limits["title"] else "",
        "description": (parsed.get("description") or "")[: limits["description"]],
        "tags": (parsed.get("tags") or [])[: limits["tags"]],
        "generated_by": "ai",
    }
    row = get_db().table("metadata_drafts").insert(draft).execute().data[0]
    return row


# ── thumbnails ────────────────────────────────────────────────────────────
class ThumbnailGenerateRequest(BaseModel):
    content_asset_id: str
    style_prompt: str | None = None


@app.post("/api/thumbnails/generate")
def generate_thumbnails(body: ThumbnailGenerateRequest):
    # TODO: call an image-gen API and upload results to Storage. Placeholder
    # variants so the pipeline is exercisable end-to-end without a provider.
    variants = [
        {
            "content_asset_id": body.content_asset_id,
            "storage_url": f"https://placehold.co/1280x720?text=Variant+{n}",
            "variant_label": f"variant_{n}",
            "generation_params": {},
        }
        for n in (1, 2)
    ]
    rows = get_db().table("thumbnails").insert(variants).execute().data
    return rows


# ── clips ─────────────────────────────────────────────────────────────────
class ClipGenerateRequest(BaseModel):
    content_asset_id: str


@app.post("/api/clips/generate")
def generate_clips(body: ClipGenerateRequest):
    # TODO: run ffmpeg scene detection / highlight scoring over the source asset.
    candidate = {
        "content_asset_id": body.content_asset_id,
        "start_ms": 0,
        "end_ms": 30000,
        "storage_url": "",
        "score": 0.5,
        "status": "done",
    }
    row = get_db().table("clips").insert(candidate).execute().data[0]
    return row


# ── publish ───────────────────────────────────────────────────────────────
class PublishRequest(BaseModel):
    scheduled_post_id: str


def mock_publish(platform: str) -> str:
    # Swap for a real per-platform API call when OAuth lands.
    return f"mock_{platform}_{uuid.uuid4()}"


@app.post("/api/publish")
def publish_now(body: PublishRequest):
    post = (
        get_db().table("scheduled_posts")
        .select("*, connected_accounts(platform)")
        .eq("id", body.scheduled_post_id)
        .single()
        .execute()
        .data
    )
    try:
        platform_post_id = mock_publish(post["connected_accounts"]["platform"])
        updated = (
            get_db().table("scheduled_posts")
            .update({"status": "posted", "platform_post_id": platform_post_id})
            .eq("id", body.scheduled_post_id)
            .execute()
            .data[0]
        )
        return updated
    except Exception as err:  # noqa: BLE001 — surfaced to the caller, not swallowed
        updated = (
            get_db().table("scheduled_posts")
            .update({"status": "failed", "platform_payload": {"error": str(err)}})
            .eq("id", body.scheduled_post_id)
            .execute()
            .data[0]
        )
        return updated
