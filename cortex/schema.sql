-- Cortex 数据库表结构
-- 在 Supabase Dashboard → SQL Editor 中整体执行本文件

create table if not exists public.orders (
  id               bigserial primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  order_date       date not null,
  order_id         text,
  customer_id      text,
  product_category text,
  product_name     text,
  region           text,
  channel          text,
  payment_method   text,
  quantity         integer default 1,
  unit_price       numeric(10,2) default 0,
  revenue          numeric(12,2) default 0,
  profit           numeric(12,2) default 0,
  created_at       timestamptz default now()
);

-- 行级安全：每个用户只能读写自己的数据
alter table public.orders enable row level security;

drop policy if exists "users_select_own_orders" on public.orders;
create policy "users_select_own_orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "users_insert_own_orders" on public.orders;
create policy "users_insert_own_orders" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "users_delete_own_orders" on public.orders;
create policy "users_delete_own_orders" on public.orders
  for delete using (auth.uid() = user_id);

create index if not exists orders_user_date_idx on public.orders (user_id, order_date);
