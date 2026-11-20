-- Shop Ledger initial schema. Times are epoch milliseconds (bigint) to match Dexie.
-- Money is integer rupees.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  role text not null check (role in ('owner', 'manager', 'worker')),
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Role of the signed-in user, null if inactive or unknown.
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff_admin() returns boolean
language sql stable as $$ select public.app_role() in ('owner', 'manager') $$;

-- Common columns: id, created_at, updated_at, deleted_at
create table public.tag_groups (
  id uuid primary key, name text not null, sort int not null default 0,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.tags (
  id uuid primary key, group_id uuid not null references public.tag_groups (id), name text not null,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.parties (
  id uuid primary key, name text not null, phone text, address text,
  kind text not null check (kind in ('seller', 'creditor')),
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.lots (
  id uuid primary key, title text not null, description text, tag_ids uuid[] not null default '{}',
  mode text not null check (mode in ('whole', 'single')),
  qty_bought int not null check (qty_bought > 0), qty_remaining int not null,
  total_cost int not null, unit_cost int not null,
  min_price int not null, suggested_price int not null, max_price int not null,
  payment_type text not null check (payment_type in ('cash', 'credit')),
  party_id uuid references public.parties (id), due_date date,
  lot_photo_id uuid, bill_photo_id uuid,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.pieces (
  id uuid primary key, lot_id uuid not null references public.lots (id), title text not null,
  photo_id uuid, tag_ids uuid[] not null default '{}',
  unit_cost int not null, min_price int not null, suggested_price int not null, max_price int not null,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold', 'returned', 'written_off')),
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.sales (
  id uuid primary key, lot_id uuid not null references public.lots (id), piece_id uuid references public.pieces (id),
  qty int not null check (qty > 0), unit_sale_price int not null, total int not null,
  unit_cost_snapshot int not null default 0,
  payment_method text not null check (payment_method in ('cash', 'easypaisa', 'jazzcash')),
  photo_id uuid, sold_by uuid not null default auth.uid() references public.profiles (id), sold_at bigint not null,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.party_payments (
  id uuid primary key, party_id uuid not null references public.parties (id), lot_id uuid references public.lots (id),
  amount int not null, method text not null, paid_at bigint not null, note text,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.customer_returns (
  id uuid primary key, sale_id uuid not null references public.sales (id), qty int not null, refund_amount int not null,
  back_to_stock text not null check (back_to_stock in ('stock', 'defective')), returned_at bigint not null, note text,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.vendor_returns (
  id uuid primary key, lot_id uuid not null references public.lots (id), piece_ids uuid[], qty int not null, value int not null,
  type text not null check (type in ('vendor_return', 'write_off')),
  settlement text check (settlement in ('reduce_dues', 'cash_refund')), photo_id uuid, at bigint not null, note text,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);
create table public.expenses (
  id uuid primary key, type text not null check (type in ('chai', 'month_end')), name text not null,
  amount int not null, month text not null, at bigint not null, note text,
  created_at bigint not null, updated_at bigint not null, deleted_at bigint
);

-- Workers record sales without seeing cost: the server fills the cost snapshot and reduces stock.
create or replace function public.on_sale_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.piece_id is not null then
    select unit_cost into new.unit_cost_snapshot from pieces where id = new.piece_id;
    update pieces set status = 'sold', updated_at = new.updated_at where id = new.piece_id;
  else
    select unit_cost into new.unit_cost_snapshot from lots where id = new.lot_id;
  end if;
  update lots set qty_remaining = qty_remaining - new.qty, updated_at = new.updated_at where id = new.lot_id;
  return new;
end $$;
create trigger sales_before_insert before insert on public.sales
for each row execute function public.on_sale_insert();

-- What workers may see: no cost, vendor or bill fields.
create view public.worker_items with (security_invoker = false) as
  select l.id as lot_id, null::uuid as piece_id, l.title, l.tag_ids, l.lot_photo_id as photo_id,
         l.qty_remaining, l.min_price, l.suggested_price, l.max_price, l.updated_at
  from public.lots l where l.deleted_at is null and l.mode = 'whole' and l.qty_remaining > 0
    and public.app_role() is not null
  union all
  select p.lot_id, p.id, p.title, p.tag_ids, p.photo_id, 1, p.min_price, p.suggested_price, p.max_price, p.updated_at
  from public.pieces p where p.deleted_at is null and p.status = 'in_stock'
    and public.app_role() is not null;

-- Row level security
alter table public.profiles enable row level security;
alter table public.tag_groups enable row level security;
alter table public.tags enable row level security;
alter table public.parties enable row level security;
alter table public.lots enable row level security;
alter table public.pieces enable row level security;
alter table public.sales enable row level security;
alter table public.party_payments enable row level security;
alter table public.customer_returns enable row level security;
alter table public.vendor_returns enable row level security;
alter table public.expenses enable row level security;

create policy "read own profile or owner reads all" on public.profiles for select
  using (id = auth.uid() or public.app_role() = 'owner');
create policy "owner manages profiles" on public.profiles for all
  using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

create policy "staff read tag groups" on public.tag_groups for select using (public.app_role() is not null);
create policy "owner writes tag groups" on public.tag_groups for all
  using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "staff read tags" on public.tags for select using (public.app_role() is not null);
create policy "owner writes tags" on public.tags for all
  using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

create policy "admin full access" on public.parties for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "admin full access" on public.lots for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "admin full access" on public.pieces for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "admin full access" on public.party_payments for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "admin full access" on public.customer_returns for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "admin full access" on public.vendor_returns for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "admin full access" on public.expenses for all using (public.is_staff_admin()) with check (public.is_staff_admin());

create policy "admin full access" on public.sales for all using (public.is_staff_admin()) with check (public.is_staff_admin());
create policy "worker records own sales" on public.sales for insert
  with check (public.app_role() = 'worker' and sold_by = auth.uid());
create policy "worker reads own sales" on public.sales for select
  using (public.app_role() = 'worker' and sold_by = auth.uid());

grant select on public.worker_items to authenticated;

-- Photos bucket (private)
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict do nothing;
create policy "staff upload photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.app_role() is not null);
create policy "staff read photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.app_role() is not null);

-- Starter tags
insert into public.tag_groups (id, name, sort, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000001', 'Type', 1, 0, 0),
  ('00000000-0000-0000-0000-000000000002', 'For', 2, 0, 0),
  ('00000000-0000-0000-0000-000000000003', 'Fabric', 3, 0, 0),
  ('00000000-0000-0000-0000-000000000004', 'Work', 4, 0, 0);
insert into public.tags (id, group_id, name, created_at, updated_at)
select gen_random_uuid(), g.id, t.name, 0, 0 from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Unstitched'), ('00000000-0000-0000-0000-000000000001', 'Stitched'),
  ('00000000-0000-0000-0000-000000000002', 'Man'), ('00000000-0000-0000-0000-000000000002', 'Woman'), ('00000000-0000-0000-0000-000000000002', 'Kids'),
  ('00000000-0000-0000-0000-000000000003', 'Lawn'), ('00000000-0000-0000-0000-000000000003', 'Cotton'), ('00000000-0000-0000-0000-000000000003', 'Silk'),
  ('00000000-0000-0000-0000-000000000003', 'Kattan'), ('00000000-0000-0000-0000-000000000003', 'Attal'), ('00000000-0000-0000-0000-000000000003', 'Khaddar'),
  ('00000000-0000-0000-0000-000000000003', 'Linen'),
  ('00000000-0000-0000-0000-000000000004', 'Plain'), ('00000000-0000-0000-0000-000000000004', 'Printed'), ('00000000-0000-0000-0000-000000000004', 'Embroidery')
) as t(group_id, name) join public.tag_groups g on g.id = t.group_id;
