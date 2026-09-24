-- Contextual Echo MVP schema.
-- Audio files live in the private `recordings` bucket at `{user_id}/{recording_id}.m4a`.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  native_language text not null default 'ko',
  target_language text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  source text not null check (source in ('record', 'upload')),
  audio_path text not null,
  status text not null default 'uploaded' check (
    status in ('uploaded', 'transcribing', 'analyzing', 'ready', 'failed')
  ),
  transcript text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  original_text text not null,
  local_expression text,
  korean_meaning text,
  context text,
  examples jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  saved boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.review_cards (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid not null unique references public.sentences (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ease_factor numeric not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index recordings_user_created_idx
  on public.recordings (user_id, created_at desc);

create index sentences_recording_position_idx
  on public.sentences (recording_id, position);

create index review_cards_due_idx
  on public.review_cards (user_id, next_review_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recordings_set_updated_at
  before update on public.recordings
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.recordings enable row level security;
alter table public.sentences enable row level security;
alter table public.review_cards enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "recordings_select_own" on public.recordings
  for select to authenticated using (user_id = auth.uid());

create policy "recordings_insert_own" on public.recordings
  for insert to authenticated with check (user_id = auth.uid());

create policy "recordings_update_own" on public.recordings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sentences_select_own" on public.sentences
  for select to authenticated using (user_id = auth.uid());

create policy "sentences_update_own" on public.sentences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "review_cards_select_own" on public.review_cards
  for select to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit)
values ('recordings', 'recordings', false, 52428800)
on conflict (id) do nothing;

create policy "recordings_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings_storage_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
