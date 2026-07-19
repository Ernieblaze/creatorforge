-- ═══════════════════════════════════════════════════════════
-- Output feedback (👍/👎 on generations) — tells us which tools
-- delight or disappoint. Paste in the SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════
create table if not exists public.output_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  tool text not null,
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz not null default now()
);

create index if not exists output_feedback_tool_idx
  on public.output_feedback (tool, created_at desc);

alter table public.output_feedback enable row level security;

drop policy if exists "feedback insert own" on public.output_feedback;
drop policy if exists "feedback admin read" on public.output_feedback;

create policy "feedback insert own" on public.output_feedback
  for insert with check (auth.uid() = user_id);
create policy "feedback admin read" on public.output_feedback
  for select using (public.is_admin());
