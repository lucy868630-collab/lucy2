-- Relaywork waitlist
-- 在 Supabase Dashboard → SQL Editor 整体执行一次。
-- 设计要点：匿名可写、不可读；名单只能在 Supabase 控制台/服务端查看，
-- 因此公开的 anon key 即使出现在浏览器请求里，也无法把邮箱列表拉走。

create table if not exists public.waitlist (
  id          bigserial primary key,
  email       text not null unique,
  company     text,
  role        text,
  note        text,
  source      text default 'relaywork-landing',
  created_at  timestamptz default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "anon_insert_waitlist" on public.waitlist;
create policy "anon_insert_waitlist" on public.waitlist
  for insert to anon with check (true);

-- 收回默认授予的读写权限，只开放 insert
revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon;
grant usage, select on sequence public.waitlist_id_seq to anon;

create index if not exists waitlist_created_idx on public.waitlist (created_at desc);

-- 强制刷新 PostgREST schema cache，避免刚建完表立刻请求仍报 PGRST205
-- "Could not find the table 'public.waitlist' in the schema cache"
notify pgrst, 'reload schema';
