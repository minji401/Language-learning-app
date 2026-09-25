alter table public.recordings
  add column if not exists speaker_transcript text;

alter table public.sentences
  add column if not exists speaker text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sentences_speaker_check'
  ) then
    alter table public.sentences
      add constraint sentences_speaker_check
      check (speaker is null or speaker in ('A', 'B'));
  end if;
end $$;
