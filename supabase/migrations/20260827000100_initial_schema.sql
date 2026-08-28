create extension if not exists pgcrypto;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  business_type text not null default 'service',
  description text,
  phone text,
  email text,
  address text,
  timezone text,
  hero_title text,
  hero_subtitle text,
  hero_image_url text,
  theme_preset text not null default 'elegant',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_status_check check (status in ('draft', 'published')),
  constraint businesses_theme_preset_check check (theme_preset in ('elegant', 'clean', 'bold'))
);

create table public.business_capabilities (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  services_enabled boolean not null default true,
  staff_enabled boolean not null default true,
  booking_enabled boolean not null default false,
  faq_enabled boolean not null default false,
  gallery_enabled boolean not null default false,
  reviews_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(10, 2) not null,
  duration_minutes integer not null,
  tags text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_price_check check (price >= 0),
  constraint services_duration_check check (duration_minutes > 0)
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  bio text,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  constraint availability_day_check check (day_of_week between 0 and 6),
  constraint availability_time_check check (end_time > start_time)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id),
  staff_id uuid not null references public.staff(id),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed',
  booking_reference text unique not null,
  created_via text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (status in ('confirmed', 'cancelled')),
  constraint bookings_created_via_check check (created_via in ('website', 'agent')),
  constraint bookings_time_check check (end_time > start_time)
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  question text,
  answer text,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url text,
  alt_text text,
  sort_order integer not null default 0
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text,
  rating integer,
  quote text,
  sort_order integer not null default 0,
  constraint reviews_rating_check check (rating between 1 and 5)
);

create index services_business_id_idx on public.services (business_id);
create index staff_business_id_idx on public.staff (business_id);
create index availability_rules_business_id_idx on public.availability_rules (business_id);
create index availability_rules_staff_id_idx on public.availability_rules (staff_id);
create index bookings_business_id_idx on public.bookings (business_id);
create index bookings_service_id_idx on public.bookings (service_id);
create index bookings_staff_id_idx on public.bookings (staff_id);
create index faqs_business_id_idx on public.faqs (business_id);
create index gallery_items_business_id_idx on public.gallery_items (business_id);
create index reviews_business_id_idx on public.reviews (business_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger business_capabilities_set_updated_at
before update on public.business_capabilities
for each row execute function public.set_updated_at();

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger staff_set_updated_at
before update on public.staff
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();
