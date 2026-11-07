-- RESTART CORPORAL ADMIN 2.0
-- Execute no Supabase SQL Editor. Faça backup antes de aplicar em produção.
create extension if not exists pgcrypto;

alter table public.products
  add column if not exists track_inventory boolean not null default false,
  add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0),
  add column if not exists stock_alert_level integer not null default 3 check (stock_alert_level >= 0);

create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 phone text unique,
 email text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number text unique default ('RC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 customer_id uuid references public.customers(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','confirmed','paid','processing','shipped','delivered','cancelled','refunded')),
 source text not null default 'manual',
 subtotal numeric(12,2) not null default 0 check(subtotal>=0),
 discount_total numeric(12,2) not null default 0 check(discount_total>=0),
 shipping_total numeric(12,2) not null default 0 check(shipping_total>=0),
 total numeric(12,2) not null default 0 check(total>=0),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,
 quantity integer not null check(quantity>0),
 unit_price numeric(12,2) not null check(unit_price>=0),
 line_total numeric(12,2) not null check(line_total>=0)
);
create table if not exists public.inventory_movements (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 quantity_delta integer not null,
 quantity_after integer not null,
 reason text not null,
 actor_id uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create table if not exists public.coupons (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 discount_type text not null check(discount_type in ('percent','fixed')),
 discount_value numeric(12,2) not null check(discount_value>0),
 minimum_total numeric(12,2) not null default 0,
 max_uses integer,
 used_count integer not null default 0,
 starts_at timestamptz,
 expires_at date,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.promotions (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text default '',
 discount_type text check(discount_type in ('percent','fixed')),
 discount_value numeric(12,2) default 0,
 starts_at timestamptz,
 ends_at timestamptz,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.staff_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 role text not null check(role in ('manager','orders','inventory','viewer')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid,
 action text not null,
 table_name text not null,
 record_id text,
 old_data jsonb,
 new_data jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.shipments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 carrier text,
 tracking_code text,
 shipping_cost numeric(12,2) not null default 0 check(shipping_cost>=0),
 status text not null default 'preparing' check(status in ('preparing','shipped','delivered','exception')),
 shipped_at timestamptz,
 delivered_at timestamptz,
 created_at timestamptz not null default now()
);

create or replace function public.has_admin_access()
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_admin() or exists(select 1 from public.staff_members s where s.user_id=auth.uid() and s.is_active=true);
$$;
revoke all on function public.has_admin_access() from public;
grant execute on function public.has_admin_access() to authenticated;

create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  insert into public.audit_logs(actor_id,action,table_name,record_id,new_data)
  values(auth.uid(),'INSERT',tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'user_id'),to_jsonb(new));
  return new;
 elsif tg_op='UPDATE' then
  insert into public.audit_logs(actor_id,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'UPDATE',tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'user_id'),to_jsonb(old),to_jsonb(new));
  return new;
 elsif tg_op='DELETE' then
  insert into public.audit_logs(actor_id,action,table_name,record_id,old_data)
  values(auth.uid(),'DELETE',tg_table_name,coalesce(to_jsonb(old)->>'id',to_jsonb(old)->>'user_id'),to_jsonb(old));
  return old;
 end if;
 return null;
end $$;

drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update or delete on public.products for each row execute function public.log_admin_change();
drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.log_admin_change();
drop trigger if exists audit_customers on public.customers;
create trigger audit_customers after insert or update or delete on public.customers for each row execute function public.log_admin_change();
drop trigger if exists audit_coupons on public.coupons;
create trigger audit_coupons after insert or update or delete on public.coupons for each row execute function public.log_admin_change();

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.coupons enable row level security;
alter table public.promotions enable row level security;
alter table public.staff_members enable row level security;
alter table public.audit_logs enable row level security;
alter table public.shipments enable row level security;

-- Apenas administradores e equipe ativa autorizada podem consultar/gerenciar.
do $$ declare t text; begin
 foreach t in array array['customers','orders','order_items','inventory_movements','coupons','promotions','staff_members','shipments'] loop
  execute format('drop policy if exists "staff manage %1$s" on public.%1$I',t);
  execute format('create policy "staff manage %1$s" on public.%1$I for all to authenticated using (public.has_admin_access()) with check (public.has_admin_access())',t);
 end loop;
end $$;
drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs for select to authenticated using(public.is_admin());

-- Equipe não pode conceder permissões nem ver/alterar a lista de funcionários.
drop policy if exists "admins manage staff members" on public.staff_members;
create policy "admins manage staff members" on public.staff_members for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Restrição adicional: RLS em products continua com as políticas existentes.
-- Para operações administrativas existentes, admin_users continuam sendo a fonte de superadmin.
