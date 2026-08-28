alter table public.businesses enable row level security;
alter table public.business_capabilities enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.staff_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.faqs enable row level security;
alter table public.gallery_items enable row level security;
alter table public.reviews enable row level security;

create policy "Published businesses are publicly readable"
on public.businesses for select
to anon, authenticated
using (status = 'published');

create policy "Capabilities of published businesses are publicly readable"
on public.business_capabilities for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses
    where businesses.id = business_capabilities.business_id
      and businesses.status = 'published'
  )
);

create policy "Active services of published businesses are publicly readable"
on public.services for select
to anon, authenticated
using (
  active and exists (
    select 1 from public.businesses
    where businesses.id = services.business_id
      and businesses.status = 'published'
  )
);

create policy "Active staff of published businesses are publicly readable"
on public.staff for select
to anon, authenticated
using (
  active and exists (
    select 1 from public.businesses
    where businesses.id = staff.business_id
      and businesses.status = 'published'
  )
);

create policy "Staff services of published businesses are publicly readable"
on public.staff_services for select
to anon, authenticated
using (
  exists (
    select 1
    from public.staff s
    join public.services sv on sv.business_id = s.business_id
    join public.businesses b on b.id = s.business_id
    where s.id = staff_services.staff_id
      and sv.id = staff_services.service_id
      and b.status = 'published'
      and s.active
      and sv.active
  )
);

create policy "Active FAQs of published businesses are publicly readable"
on public.faqs for select
to anon, authenticated
using (
  active and exists (
    select 1 from public.businesses
    where businesses.id = faqs.business_id
      and businesses.status = 'published'
  )
);

create policy "Gallery of published businesses is publicly readable"
on public.gallery_items for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses
    where businesses.id = gallery_items.business_id
      and businesses.status = 'published'
  )
);

create policy "Reviews of published businesses are publicly readable"
on public.reviews for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses
    where businesses.id = reviews.business_id
      and businesses.status = 'published'
  )
);

-- There are deliberately no public policies for availability_rules or bookings.
-- Future feature-layer operations will enforce capabilities and use trusted server access.
