-- RESTART CORPORAL — schema inicial do Supabase
-- Execute no SQL Editor do projeto Supabase.
-- Não insira medicamentos/produtos sujeitos a controle sem verificar registro,
-- autorização, prescrição e publicidade permitida no país de comercialização.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  short_description text not null default '',
  description text not null default '',
  image_url text,
  price numeric(12,2) not null default 0 check (price >= 0),
  show_price boolean not null default false,
  button_label text not null default 'Consultar pelo WhatsApp',
  whatsapp_number text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;

-- Admin pode ler a própria associação; apenas admin pode gerenciar.
create policy "admin reads own membership" on public.admin_users
for select to authenticated using (user_id = auth.uid());
create policy "admins manage memberships" on public.admin_users
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads categories" on public.categories
for select to anon, authenticated using (true);
create policy "admins manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads published products" on public.products
for select to anon, authenticated using (is_published = true or public.is_admin());
create policy "admins manage products" on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads store settings" on public.store_settings
for select to anon, authenticated using (key in ('whatsapp','store_name'));
create policy "admins manage store settings" on public.store_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images','product-images',true)
on conflict (id) do nothing;

create policy "public reads product images" on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');
create policy "admins upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

insert into public.store_settings(key,value)
values ('store_name','Restart Corporal')
on conflict (key) do nothing;

-- Depois de criar seu usuário em Authentication > Users, execute:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'SEU_EMAIL_DE_LOGIN';
