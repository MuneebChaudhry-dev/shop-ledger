-- 1. Server clock for reliable pulls: every write stamps synced_at with server time.
--    Clients pull rows with synced_at > their cursor (phone clocks can be wrong).
create or replace function public.stamp_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','tag_groups','tags','parties','lots','pieces','sales',
                           'party_payments','customer_returns','vendor_returns','expenses'] loop
    execute format('alter table public.%I add column if not exists synced_at bigint not null default 0', t);
    execute format('create index if not exists %I on public.%I (synced_at)', t || '_synced_at_idx', t);
    execute format('create trigger stamp_synced_at before insert or update on public.%I
                    for each row execute function public.stamp_synced_at()', t);
    -- Stamp rows that already exist (for example the starter tags) so phones pull them.
    execute format('update public.%I set synced_at = 0', t);
  end loop;
end $$;

-- 2. Settings (margins, chai default). Owner writes, owner and manager read.
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at bigint not null,
  synced_at bigint not null default 0
);
create trigger stamp_synced_at before insert or update on public.settings
  for each row execute function public.stamp_synced_at();
alter table public.settings enable row level security;
create policy "admin reads settings" on public.settings for select using (public.is_staff_admin());
create policy "owner writes settings" on public.settings for all
  using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
insert into public.settings (key, value, updated_at) values
  ('margins', '{"min":0.1,"suggested":0.25,"max":0.4}', 0),
  ('chaiDefault', '200', 0);

-- 3. Stock is owned by the server. Clients may send a stale qty_remaining or piece status;
--    those columns change only inside the stock triggers below (flag app.stock_write).
create or replace function public.guard_stock_columns() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.stock_write', true), '') <> '1' then
    if tg_table_name = 'lots' then new.qty_remaining := old.qty_remaining; end if;
    if tg_table_name = 'pieces' then new.status := old.status; end if;
  end if;
  return new;
end $$;
create trigger guard_stock before update on public.lots for each row execute function public.guard_stock_columns();
create trigger guard_stock before update on public.pieces for each row execute function public.guard_stock_columns();

-- A lot created offline may already have sales, returns or write-offs queued behind it, and the phone
-- sends its already-reduced count. The server always starts from the full count and lets the
-- sale / return triggers apply each change exactly once.
create or replace function public.reset_stock_on_insert() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.stock_write', true), '') <> '1' then
    if tg_table_name = 'lots' then new.qty_remaining := new.qty_bought; end if;
    if tg_table_name = 'pieces' then new.status := 'in_stock'; end if;
  end if;
  return new;
end $$;
create trigger reset_stock before insert on public.lots for each row execute function public.reset_stock_on_insert();
create trigger reset_stock before insert on public.pieces for each row execute function public.reset_stock_on_insert();

-- Important 6: last write wins by updated_at. An old offline edit cannot overwrite a newer one,
-- and a soft delete cannot be undone by a stale phone.
create or replace function public.last_write_wins() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at then return null; end if;
  if old.deleted_at is not null and new.deleted_at is null then new.deleted_at := old.deleted_at; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['tag_groups','tags','parties','lots','pieces','expenses'] loop
    execute format('create trigger lww_guard before update on public.%I
                    for each row execute function public.last_write_wins()', t);
  end loop;
end $$;

-- Replace the first sale trigger: cost snapshot before insert, stock change after insert.
-- Clients push sales and returns with a plain INSERT; a retry fails with a duplicate key and the
-- AFTER INSERT trigger never fires for it, so stock is never changed twice.
drop trigger if exists sales_before_insert on public.sales;
drop function if exists public.on_sale_insert();

create or replace function public.sale_snapshot_cost() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.piece_id is not null then
    select unit_cost into new.unit_cost_snapshot from pieces where id = new.piece_id;
  else
    select unit_cost into new.unit_cost_snapshot from lots where id = new.lot_id;
  end if;
  new.unit_cost_snapshot := coalesce(new.unit_cost_snapshot, 0);
  return new;
end $$;
create trigger sales_snapshot before insert on public.sales
  for each row execute function public.sale_snapshot_cost();

create or replace function public.sale_apply_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.stock_write', '1', true);
  update lots set qty_remaining = greatest(0, qty_remaining - new.qty) where id = new.lot_id;
  if new.piece_id is not null then update pieces set status = 'sold' where id = new.piece_id; end if;
  perform set_config('app.stock_write', '0', true);
  return null;
end $$;
create trigger sales_stock after insert on public.sales
  for each row execute function public.sale_apply_stock();

create or replace function public.customer_return_apply_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if new.back_to_stock <> 'stock' then return null; end if;
  select lot_id, piece_id into s from sales where id = new.sale_id;
  perform set_config('app.stock_write', '1', true);
  update lots set qty_remaining = qty_remaining + new.qty where id = s.lot_id;
  if s.piece_id is not null then update pieces set status = 'in_stock' where id = s.piece_id; end if;
  perform set_config('app.stock_write', '0', true);
  return null;
end $$;
create trigger customer_returns_stock after insert on public.customer_returns
  for each row execute function public.customer_return_apply_stock();

alter table public.vendor_returns add column if not exists cost_of_items int not null default 0;

create or replace function public.vendor_return_apply_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.stock_write', '1', true);
  update lots set qty_remaining = greatest(0, qty_remaining - new.qty) where id = new.lot_id;
  if new.piece_ids is not null then
    update pieces set status = case when new.type = 'write_off' then 'written_off' else 'returned' end
    where id = any (new.piece_ids);
  end if;
  perform set_config('app.stock_write', '0', true);
  return null;
end $$;
create trigger vendor_returns_stock after insert on public.vendor_returns
  for each row execute function public.vendor_return_apply_stock();

-- 4. Worker view: no cost, vendor or bill columns.
drop view if exists public.worker_items;
create view public.worker_items with (security_invoker = false) as
  select l.id as lot_id, null::uuid as piece_id, l.title, l.tag_ids, l.lot_photo_id as photo_id,
         l.qty_remaining, l.min_price, l.suggested_price, l.max_price
  from public.lots l
  where l.deleted_at is null and l.mode = 'whole' and l.qty_remaining > 0 and public.app_role() is not null
  union all
  select p.lot_id, p.id, p.title, p.tag_ids, p.photo_id, 1, p.min_price, p.suggested_price, p.max_price
  from public.pieces p
  where p.deleted_at is null and p.status = 'in_stock' and public.app_role() is not null;
revoke all on public.worker_items from anon;
grant select on public.worker_items to authenticated;

-- 5. Workers must not read sales back: the rows carry unit_cost_snapshot (the buy cost).
--    Their pushes use a plain INSERT (INSERT ... ON CONFLICT would require a SELECT policy).
drop policy if exists "worker reads own sales" on public.sales;

-- 6. Photos: bill photos (they show buy costs) live under bills/ and only owner and manager can read them.
drop policy if exists "staff read photos" on storage.objects;
create policy "staff read item photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.app_role() is not null and name not like 'bills/%');
create policy "admin reads bill photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_staff_admin() and name like 'bills/%');
