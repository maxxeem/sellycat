-- Phase 7 (part 4): support requests (dashboard → Support, handled by staff) and the help center
-- (sellycat.com/help: articles DE/EN with draft and history, search, feedback). Same model as SwypeCast.

-- ---------------------------------------------------------------- support
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number serial not null unique,
  tenant_id uuid references public.tenants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  -- Snapshot of who asked (people leave shops, shops change plans).
  user_name text,
  user_email text not null,
  tenant_name text,
  plan_id text,
  locale text not null default 'de' check (locale in ('de', 'en')),
  subject text not null check (char_length(subject) between 1 and 200),
  category text not null check (category in ('question', 'problem', 'billing', 'feature', 'other')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  internal_note text check (internal_note is null or char_length(internal_note) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index support_tickets_tenant_idx on public.support_tickets (tenant_id, last_message_at desc);
create index support_tickets_status_idx on public.support_tickets (status, last_message_at desc);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  author text not null check (author in ('customer', 'staff')),
  author_user_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  attachment_path text,
  attachment_name text,
  attachment_bytes integer,
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
create index support_messages_attachment_idx on public.support_messages (attachment_path) where attachment_path is not null;

-- Who reads a ticket: the person who wrote it, the shop's owners and admins, staff.
-- Writes only through the server (service role) after these checks.
create or replace function public.can_see_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket and (t.user_id = auth.uid() or (t.tenant_id is not null and public.can_manage(t.tenant_id)))
  );
$$;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
create policy support_tickets_read on public.support_tickets for select to authenticated using (public.can_see_ticket(id));
create policy support_messages_read on public.support_messages for select to authenticated using (public.can_see_ticket(ticket_id));

-- Attachments: private bucket, signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support', 'support', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4'])
on conflict (id) do nothing;

alter table public.platform_settings
  add column if not exists support_notify_email text,
  add column if not exists support_notify_staff_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------- help center
create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  category text not null check (category in ('getting-started', 'deals', 'payments', 'vouchers', 'design', 'team-account', 'billing', 'technical')),
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger help_articles_updated before update on public.help_articles for each row execute function public.set_updated_at();

create table public.help_article_versions (
  article_id uuid not null references public.help_articles (id) on delete cascade,
  locale text not null check (locale in ('de', 'en')),
  -- Live text (empty title = this language is not published yet).
  title text not null default '',
  body text not null default '',
  draft_title text,
  draft_body text,
  draft_updated_at timestamptz,
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  search tsvector generated always as (
    case when locale = 'de'
      then setweight(to_tsvector('german', coalesce(title, '')), 'A') || setweight(to_tsvector('german', coalesce(body, '')), 'B')
      else setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(body, '')), 'B')
    end
  ) stored,
  primary key (article_id, locale)
);
create index help_article_versions_search_idx on public.help_article_versions using gin (search);

create table public.help_article_history (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.help_articles (id) on delete cascade,
  locale text not null check (locale in ('de', 'en')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index help_article_history_idx on public.help_article_history (article_id, locale, created_at desc);

create table public.help_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.help_articles (id) on delete cascade,
  locale text not null check (locale in ('de', 'en')),
  helpful boolean not null,
  comment text check (comment is null or char_length(comment) <= 1000),
  session text not null check (char_length(session) <= 64),
  created_at timestamptz not null default now(),
  unique (article_id, session)
);

alter table public.help_articles enable row level security;
alter table public.help_article_versions enable row level security;
alter table public.help_article_history enable row level security;
alter table public.help_feedback enable row level security;
-- Published articles are public; drafts, history and feedback are staff-only. Writes via the server.
create policy help_articles_read on public.help_articles for select using (status = 'published' or public.is_staff());
create policy help_versions_read on public.help_article_versions for select
  using (exists (select 1 from public.help_articles a where a.id = article_id and (a.status = 'published' or public.is_staff())));
create policy help_history_read on public.help_article_history for select to authenticated using (public.is_staff());
create policy help_feedback_read on public.help_feedback for select to authenticated using (public.is_staff());

-- The public columns only: nobody outside staff tools (service role) reads drafts.
revoke select on public.help_article_versions from anon, authenticated;
grant select (article_id, locale, title, body, published_at) on public.help_article_versions to anon, authenticated;

-- Images in articles: public bucket, uploaded by staff through the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('help', 'help', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Full-text search over the live texts of one language, with a highlighted snippet.
create or replace function public.help_search(p_query text, p_locale text, p_limit integer default 20)
returns table (slug text, category text, title text, snippet text, rank real)
language sql stable security definer set search_path = '' as $$
  select a.slug, a.category, v.title,
    ts_headline(case when p_locale = 'de' then 'german'::regconfig else 'english'::regconfig end, v.body, q,
      'MaxWords=30, MinWords=12, StartSel=<mark>, StopSel=</mark>') as snippet,
    ts_rank(v.search, q) as rank
  from public.help_article_versions v
  join public.help_articles a on a.id = v.article_id
  cross join websearch_to_tsquery(case when p_locale = 'de' then 'german'::regconfig else 'english'::regconfig end, left(p_query, 120)) q
  where a.status = 'published' and v.title <> '' and v.locale = case when p_locale = 'de' then 'de' else 'en' end and v.search @@ q
  order by rank desc, a.sort_order
  limit greatest(1, least(p_limit, 50));
$$;
revoke all on function public.help_search(text, text, integer) from public;
grant execute on function public.help_search(text, text, integer) to anon, authenticated;
