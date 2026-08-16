-- CreatorFlow MVP schema — platform-agnostic core with JSONB escape hatches.
-- See docs: social-media-automation-mvp-docs-supabase.md §4

create extension if not exists "pgcrypto";

create table connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok')),
  platform_account_id text not null,
  oauth_tokens jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table content_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('upload', 'generated')),
  storage_url text not null,
  duration_seconds int,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create table thumbnails (
  id uuid primary key default gen_random_uuid(),
  content_asset_id uuid not null references content_assets(id) on delete cascade,
  storage_url text not null,
  variant_label text not null,
  generation_params jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table metadata_drafts (
  id uuid primary key default gen_random_uuid(),
  content_asset_id uuid not null references content_assets(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok')),
  title text not null default '',
  description text not null default '',
  tags text[] not null default '{}',
  seo_score numeric,
  generated_by text not null default 'ai' check (generated_by in ('ai', 'manual')),
  created_at timestamptz not null default now()
);

create table scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  content_asset_id uuid not null references content_assets(id) on delete cascade,
  connected_account_id uuid not null references connected_accounts(id) on delete cascade,
  metadata_draft_id uuid not null references metadata_drafts(id) on delete restrict,
  thumbnail_id uuid references thumbnails(id) on delete set null,
  scheduled_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'failed')),
  platform_post_id text,
  platform_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references scheduled_posts(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok')),
  fetched_at timestamptz not null default now(),
  metrics jsonb not null default '{}'
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references scheduled_posts(id) on delete cascade,
  platform_comment_id text not null,
  author text not null,
  text text not null,
  sentiment text,
  moderation_action text check (moderation_action in ('hidden', 'flagged', 'approved')),
  fetched_at timestamptz not null default now()
);

create table clips (
  id uuid primary key default gen_random_uuid(),
  content_asset_id uuid not null references content_assets(id) on delete cascade,
  start_ms int not null,
  end_ms int not null,
  storage_url text not null default '',
  score numeric,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz not null default now()
);

-- Generic jobs table backs every async operation across all six modules
-- (thumbnail render, metadata gen, clip analysis, publish, analytics fetch)
-- so the frontend has one polling/status pattern instead of six.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  progress numeric not null default 0,
  error text,
  result_ref uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on connected_accounts (user_id);
create index on content_assets (user_id);
create index on thumbnails (content_asset_id);
create index on metadata_drafts (content_asset_id);
create index on scheduled_posts (content_asset_id);
create index on scheduled_posts (connected_account_id);
create index on analytics_snapshots (scheduled_post_id);
create index on comments (scheduled_post_id);
create index on clips (content_asset_id);
create index on jobs (user_id);

-- Row Level Security: every table scoped to its owning user.
alter table connected_accounts enable row level security;
alter table content_assets enable row level security;
alter table thumbnails enable row level security;
alter table metadata_drafts enable row level security;
alter table scheduled_posts enable row level security;
alter table analytics_snapshots enable row level security;
alter table comments enable row level security;
alter table clips enable row level security;
alter table jobs enable row level security;

create policy "own connected_accounts" on connected_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own content_assets" on content_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own thumbnails" on thumbnails
  for all using (exists (
    select 1 from content_assets a where a.id = thumbnails.content_asset_id and a.user_id = auth.uid()
  ));

create policy "own metadata_drafts" on metadata_drafts
  for all using (exists (
    select 1 from content_assets a where a.id = metadata_drafts.content_asset_id and a.user_id = auth.uid()
  ));

create policy "own scheduled_posts" on scheduled_posts
  for all using (exists (
    select 1 from content_assets a where a.id = scheduled_posts.content_asset_id and a.user_id = auth.uid()
  ));

create policy "own analytics_snapshots" on analytics_snapshots
  for all using (exists (
    select 1 from scheduled_posts p
    join content_assets a on a.id = p.content_asset_id
    where p.id = analytics_snapshots.scheduled_post_id and a.user_id = auth.uid()
  ));

create policy "own comments" on comments
  for all using (exists (
    select 1 from scheduled_posts p
    join content_assets a on a.id = p.content_asset_id
    where p.id = comments.scheduled_post_id and a.user_id = auth.uid()
  ));

create policy "own clips" on clips
  for all using (exists (
    select 1 from content_assets a where a.id = clips.content_asset_id and a.user_id = auth.uid()
  ));

create policy "own jobs" on jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
