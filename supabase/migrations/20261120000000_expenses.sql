create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  category text not null,
  amount bigint not null check (amount between 1 and 999999999999),
  date date not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (
    (type = 'expense' and category in ('Ăn uống', 'Đi lại', 'Mua sắm', 'Nhà ở', 'Hóa đơn', 'Sức khỏe', 'Giải trí', 'Chi khác'))
    or (type = 'income' and category in ('Lương', 'Thưởng', 'Thu khác'))
  )
);

create index transactions_user_date_idx on public.transactions (user_id, date desc, created_at desc, id);

create table public.budgets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount bigint not null check (amount between 0 and 999999999999),
  primary key (user_id, month)
);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
revoke all on public.transactions, public.budgets from anon, authenticated;
grant select, insert, update, delete on public.transactions, public.budgets to authenticated;

create policy "Own transactions" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Own budgets" on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
