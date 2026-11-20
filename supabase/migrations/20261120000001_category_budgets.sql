create table public.category_budgets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null check (extract(day from month) = 1),
  category text not null check (
    category in ('Ăn uống', 'Đi lại', 'Mua sắm', 'Nhà ở', 'Hóa đơn', 'Sức khỏe', 'Giải trí', 'Chi khác')
  ),
  amount bigint not null check (amount between 0 and 999999999999),
  primary key (user_id, month, category)
);

alter table public.category_budgets enable row level security;
revoke all on public.category_budgets from anon, authenticated;
grant select, insert, update, delete on public.category_budgets to authenticated;

create policy "Own category budgets" on public.category_budgets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
