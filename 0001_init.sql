-- ============================================================================
-- CAIAH'S CORNER — full backend schema (single clean SQL-editor submission)
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It is idempotent: re-running it will not duplicate tables, policies, or seeds.
--
-- MODEL NOTE — this app is single-tenant ("Caiah's corner"). There is no
-- per-person login: the soft gate (caiah password vs. family/friend name) lives
-- in the browser. So the dataset is ONE shared world that the public anon key
-- reads and writes. RLS is therefore permissive (anon = full CRUD). That is the
-- correct model for a shared family gift, but it means anyone with the anon key
-- and the project URL can reach the data directly, bypassing the client gate.
-- If you later want real privacy for $ amounts / private feed posts, see the
-- "HARDENING" notes at the bottom.
--
-- STAYS LOCAL (do NOT migrate — these are per-device, not shared):
--   • the chosen viewer (sessionStorage "caiah-viewer-v1")
--   • a visitor's own display name (localStorage "caiah-mailbox-author")
--   • password hint try-count (localStorage "caiah-pw-tries")
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. FEED  — "keep up with caiah"  (photo / postcard / video posts)
--    localStorage: caiah-feed-v1
-- ============================================================================
create table if not exists public.feed_posts (
  id          text primary key,                 -- client id e.g. "p-xxxx"
  kind        text not null default 'photo'
                check (kind in ('photo','postcard','video')),
  caption     text default '',
  body        text default '',                  -- postcard text
  color       text default '',                  -- postcard color id (pink/butter/…)
  photo_url   text default '',                  -- photo: storage URL or data URL
  video_id    text default '',                  -- IDB/storage key for the clip
  poster      text default '',                  -- video poster (data URL or storage URL)
  duration    numeric,                          -- video length (seconds)
  is_public   boolean not null default true,    -- client field: post.public
  created_at  timestamptz not null default now()
);
create index if not exists feed_posts_created_idx on public.feed_posts (created_at desc);
create index if not exists feed_posts_public_idx  on public.feed_posts (is_public);

-- stickers stuck ON a post (was post.reactions[])
create table if not exists public.feed_reactions (
  id          text primary key,                 -- client id e.g. "r-xxxx"
  post_id     text not null references public.feed_posts(id) on delete cascade,
  sticker     text not null,                    -- emoji
  from_name   text not null default 'anonymous',
  pos         jsonb not null default '{"x":50,"y":50,"r":0}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists feed_reactions_post_idx on public.feed_reactions (post_id);

-- comments on a post (was post.comments[])
create table if not exists public.feed_comments (
  id          text primary key,                 -- client id e.g. "c-xxxx"
  post_id     text not null references public.feed_posts(id) on delete cascade,
  body        text not null,
  from_name   text not null default 'anonymous',
  created_at  timestamptz not null default now()
);
create index if not exists feed_comments_post_idx on public.feed_comments (post_id);

-- ============================================================================
-- 2. MAILBOX — family/friends drop notes; caiah sees unread
--    localStorage: caiah-mailbox-v1
-- ============================================================================
create table if not exists public.mail_messages (
  id              text primary key,             -- client id e.g. "m-xxxx"
  from_name       text not null default 'anonymous',
  body            text not null,
  link            text default '',
  photo_url       text default '',              -- storage URL or data URL
  video_id        text default '',
  video_poster    text default '',
  video_duration  numeric,
  reply_to        text references public.mail_messages(id) on delete set null,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists mail_created_idx on public.mail_messages (created_at desc);
create index if not exists mail_unread_idx  on public.mail_messages (read);

-- ============================================================================
-- 3. JOURNAL — "the daily scrap" (one entry per calendar day)
--    localStorage: caiah-journal
-- ============================================================================
create table if not exists public.journal_entries (
  entry_date  date primary key,                 -- "YYYY-MM-DD"
  mood        text not null default 'happy',
  text        text not null default '',
  updated_at  timestamptz not null default now()
);
drop trigger if exists journal_set_updated_at on public.journal_entries;
create trigger journal_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. WISHLIST
--    localStorage: caiah-wishlist
-- ============================================================================
create table if not exists public.wishlist_items (
  id          text primary key,                 -- client id
  text        text not null,
  link        text,
  received    boolean not null default false,
  added_at    date,
  created_at  timestamptz not null default now()
);
create index if not exists wishlist_created_idx on public.wishlist_items (created_at desc);

-- ============================================================================
-- 5. BUCKET LIST  (move-in gated section)
--    localStorage: caiah-bucket
-- ============================================================================
create table if not exists public.bucket_items (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists bucket_position_idx on public.bucket_items (position);

-- ============================================================================
-- 6. FUNDS — money tracker (the sun)
--    localStorage: caiah-funds-v1
-- ============================================================================
create table if not exists public.fund_transactions (
  id          text primary key,                 -- client id e.g. "tx-xxxx"
  kind        text not null check (kind in ('in','out')),
  amount      numeric(12,2) not null check (amount >= 0),
  label       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists fund_tx_created_idx on public.fund_transactions (created_at desc);

-- singleton: the low-threshold knob + cash handles
create table if not exists public.fund_settings (
  id          smallint primary key default 1 check (id = 1),
  threshold   numeric not null default 50,
  handles     jsonb   not null default '{}'::jsonb,   -- {venmo,cashapp,zelle,paypal}
  updated_at  timestamptz not null default now()
);
drop trigger if exists fund_settings_set_updated_at on public.fund_settings;
create trigger fund_settings_set_updated_at
  before update on public.fund_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 7. COUNTDOWNS — upper-left widget
--    localStorage: caiah-countdowns  +  caiah-celebrated
-- ============================================================================
create table if not exists public.countdown_events (
  id          text primary key,                 -- client id e.g. "udel-move"
  label       text not null,
  event_date  date,                             -- "YYYY-MM-DD"
  event_time  text default '',                  -- "HH:MM" or ""
  emoji       text default '✦',                 -- emoji OR a data-URL icon
  color       text default '',
  position    integer not null default 0
);
create index if not exists countdown_position_idx on public.countdown_events (position);

-- which 0-moments have already fired their celebration
create table if not exists public.celebrated_events (
  event_key     text primary key,               -- matches client celebrated key
  celebrated_at timestamptz not null default now()
);

-- ============================================================================
-- 8. BOARD CUTOUTS — decorate-mode photo cutouts + stickers
--    localStorage: caiah-cutouts
-- ============================================================================
create table if not exists public.board_cutouts (
  id          text primary key,                 -- client id
  kind        text not null check (kind in ('photo','sticker')),
  src         text default '',                  -- photo: storage URL or data URL
  emoji       text default '',                  -- sticker glyph
  color       text default '',                  -- sticker color
  x           double precision not null default 0,
  y           double precision not null default 0,
  rotation    double precision not null default 0,
  scale       double precision not null default 1,
  z           integer not null default 100,
  updated_at  timestamptz not null default now()
);
drop trigger if exists cutouts_set_updated_at on public.board_cutouts;
create trigger cutouts_set_updated_at
  before update on public.board_cutouts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 9. BOARD LAYOUT — card order / custom cards (singleton document)
--    localStorage: caiah-layout-v1
-- ============================================================================
create table if not exists public.board_layout (
  id          smallint primary key default 1 check (id = 1),
  items       jsonb not null default '[]'::jsonb,   -- the full layout.items[]
  meta        jsonb not null default '{}'::jsonb,   -- _feedPinned, seenBuiltins, etc.
  updated_at  timestamptz not null default now()
);
drop trigger if exists board_layout_set_updated_at on public.board_layout;
create trigger board_layout_set_updated_at
  before update on public.board_layout
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 10. APP SETTINGS — launch gating flags (singleton)
-- ============================================================================
create table if not exists public.app_settings (
  id          smallint primary key default 1 check (id = 1),
  moved_in    boolean not null default false,   -- unlocks advice/bucket/care
  grad_seen   boolean not null default false,   -- has the grad celebration played
  updated_at  timestamptz not null default now()
);
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — enable on every table, grant anon + authenticated full CRUD
--   (single shared world; the gate is client-side — see header note)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'feed_posts','feed_reactions','feed_comments',
    'mail_messages','journal_entries','wishlist_items','bucket_items',
    'fund_transactions','fund_settings',
    'countdown_events','celebrated_events',
    'board_cutouts','board_layout','app_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all', t
    );
    -- RLS policies are not enough on their own: the role also needs the
    -- underlying SQL privilege, or every query returns "permission denied".
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated;', t);
  end loop;
end $$;

-- Future-proof: any tables created later in the public schema also get access.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================================
-- REALTIME — broadcast inserts/updates so the family sees changes live
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'feed_posts','feed_reactions','feed_comments',
    'mail_messages','journal_entries','wishlist_items','bucket_items',
    'fund_transactions','fund_settings',
    'countdown_events','board_cutouts','board_layout','app_settings'
  ]
  loop
    -- add to the realtime publication if not already a member
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ============================================================================
-- STORAGE — buckets for images + video clips (replace the data-URL approach)
--   photos : feed photos, mail photos, cutout images, countdown icons
--   videos : feed + mailbox video clips
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- public read + anon write on both buckets
drop policy if exists "media public read"   on storage.objects;
drop policy if exists "media anon insert"    on storage.objects;
drop policy if exists "media anon update"    on storage.objects;
drop policy if exists "media anon delete"    on storage.objects;

create policy "media public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('photos','videos'));

create policy "media anon insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id in ('photos','videos'));

create policy "media anon update" on storage.objects
  for update to anon, authenticated
  using (bucket_id in ('photos','videos'))
  with check (bucket_id in ('photos','videos'));

create policy "media anon delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id in ('photos','videos'));

-- ============================================================================
-- SEEDS — defaults that match the app's built-in starting state.
--   All idempotent: safe to re-run.
-- ============================================================================

-- singletons
insert into public.app_settings  (id) values (1) on conflict (id) do nothing;
insert into public.fund_settings (id, threshold, handles)
  values (1, 50, '{}'::jsonb) on conflict (id) do nothing;

-- default board layout (built-in card order, feed pinned first)
insert into public.board_layout (id, items, meta)
values (
  1,
  '[
    {"id":"feed","kind":"builtin","builtinId":"feed"},
    {"id":"memory","kind":"builtin","builtinId":"memory"},
    {"id":"advice","kind":"builtin","builtinId":"advice"},
    {"id":"bucket","kind":"builtin","builtinId":"bucket"},
    {"id":"journal","kind":"builtin","builtinId":"journal"},
    {"id":"wishlist","kind":"builtin","builtinId":"wishlist"},
    {"id":"care","kind":"builtin","builtinId":"care"},
    {"id":"funds","kind":"builtin","builtinId":"funds"},
    {"id":"letter","kind":"builtin","builtinId":"letter"}
  ]'::jsonb,
  '{"_feedPinned":true,"_fundsAboveLetter":true}'::jsonb
)
on conflict (id) do nothing;

-- default countdowns (only if the table is empty)
insert into public.countdown_events (id, label, event_date, event_time, emoji, color, position)
select * from (values
  ('udel-move', 'move-in @ udel',    date '2026-08-25', '', '🏠', 'var(--pink-deep)',   0),
  ('thx',       'thanksgiving home', date '2026-11-25', '', '🦃', 'var(--butter-deep)', 1),
  ('wb',        'winter break',      date '2026-12-19', '', '❄',  'var(--blue-deep)',   2)
) as v(id, label, event_date, event_time, emoji, color, position)
where not exists (select 1 from public.countdown_events);

-- default bucket list (only if the table is empty)
insert into public.bucket_items (text, done, position)
select v.text, false, v.position
from (values
  ('survive welcome week', 0),
  ('find the best dining hall cookie', 1),
  ('make 1 friend in your first cs lecture', 2),
  ('go to a UDel basketball game (just once)', 3),
  ('learn at least one new k-pop dance per semester', 4),
  ('see the blue hen statue at least 3 times', 5),
  ('submit one piece of art to a campus show', 6),
  ('explore Main Street for the secret good food spot', 7),
  ('write your first ''hello world'' in a college class', 8),
  ('call home unprompted (i''ll know)', 9),
  ('join one club that scares you a little', 10),
  ('stay up too late on a random tuesday with friends', 11)
) as v(text, position)
where not exists (select 1 from public.bucket_items);

-- ============================================================================
-- HARDENING (optional, later) — if you want real privacy:
--   1. Create a single Supabase auth user for Caiah; sign her in client-side
--      instead of the "kemba2026" string gate.
--   2. Split policies: keep anon INSERT on mail_messages / feed_reactions /
--      feed_comments (so family can write), but restrict SELECT of $ amounts
--      (fund_transactions, fund_settings) and private posts
--      (feed_posts where is_public = false) to the authenticated caiah user.
--   3. Family read of the feed becomes:  using (is_public = true)
--      plus an authenticated-only policy for the rest.
-- ============================================================================
