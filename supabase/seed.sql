insert into public.businesses (
  id, slug, name, business_type, description, phone, email, address, timezone,
  hero_title, hero_subtitle, hero_image_url, theme_preset,
  brand_primary, brand_accent, brand_background, brand_dark,
  status, published_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'aria-hair',
    'Aria Hair Studio',
    'service',
    'Thoughtful cuts and styling in a calm neighbourhood studio.',
    '+60 3-5555 0148',
    'hello@ariahair.example',
    '18 Jalan Telawi, Bangsar, Kuala Lumpur',
    'Asia/Kuala_Lumpur',
    'Hair that feels like you',
    'Personal cuts and styling, delivered with care.',
    '/demo/aria/hero.webp',
    'elegant',
    '#23483c',
    '#bf8f88',
    null,
    '#17241f',
    'published',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'luna-wellness',
    'Luna Wellness Studio',
    'service',
    'Simple restorative treatments for busy city days.',
    '+60 3-5555 0192',
    'care@lunawellness.example',
    '7 Jalan SS 21/1A, Petaling Jaya',
    'Asia/Kuala_Lumpur',
    'Make space to reset',
    'A quiet studio for practical, restorative care.',
    null,
    'clean',
    null,
    null,
    null,
    null,
    'published',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'hidden-draft',
    'Hidden Draft Studio',
    'service',
    'This record proves that draft businesses stay private.',
    null,
    null,
    null,
    'Asia/Kuala_Lumpur',
    'Draft content',
    'This must never render on a public route.',
    null,
    'bold',
    null,
    null,
    null,
    null,
    'draft',
    null
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  business_type = excluded.business_type,
  description = excluded.description,
  phone = excluded.phone,
  email = excluded.email,
  address = excluded.address,
  timezone = excluded.timezone,
  hero_title = excluded.hero_title,
  hero_subtitle = excluded.hero_subtitle,
  hero_image_url = excluded.hero_image_url,
  theme_preset = excluded.theme_preset,
  brand_primary = excluded.brand_primary,
  brand_accent = excluded.brand_accent,
  brand_background = excluded.brand_background,
  brand_dark = excluded.brand_dark,
  status = excluded.status,
  published_at = excluded.published_at;

insert into public.business_capabilities (
  business_id, services_enabled, staff_enabled, booking_enabled,
  faq_enabled, gallery_enabled, reviews_enabled
)
values
  ('10000000-0000-4000-8000-000000000001', true, true, true, true, true, true),
  ('10000000-0000-4000-8000-000000000002', true, false, false, true, false, false),
  ('10000000-0000-4000-8000-000000000003', true, true, false, true, false, false)
on conflict (business_id) do update set
  services_enabled = excluded.services_enabled,
  staff_enabled = excluded.staff_enabled,
  booking_enabled = excluded.booking_enabled,
  faq_enabled = excluded.faq_enabled,
  gallery_enabled = excluded.gallery_enabled,
  reviews_enabled = excluded.reviews_enabled;

insert into public.services (
  id, business_id, name, description, category, price, duration_minutes, tags, active, sort_order
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Classic Cut', 'A polished everyday cut with consultation.', 'Cuts', 45.00, 30, array['casual', 'everyday'], true, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Executive Cut', 'A sharp, professional finish for important days.', 'Cuts', 65.00, 45, array['professional', 'interview', 'formal'], true, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Cut + Styling', 'A tailored cut finished with event-ready styling.', 'Styling', 75.00, 60, array['styling', 'professional'], true, 3),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Premium Restyle', 'A longer consultation and complete change of shape.', 'Restyle', 95.00, 75, array['premium', 'restyle'], true, 4),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Restorative Massage', 'A focused full-body reset.', 'Wellness', 120.00, 60, array['restorative', 'massage'], true, 1)
on conflict (id) do update set
  business_id = excluded.business_id,
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  price = excluded.price,
  duration_minutes = excluded.duration_minutes,
  tags = excluded.tags,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.staff (id, business_id, name, bio, image_url, active, sort_order)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Alex', 'Known for precise cuts and relaxed consultations.', '/demo/aria/alex.webp', true, 1),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Mia', 'Specialises in expressive restyles and polished finishes.', '/demo/aria/mia.webp', true, 2)
on conflict (id) do update set
  business_id = excluded.business_id,
  name = excluded.name,
  bio = excluded.bio,
  image_url = excluded.image_url,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.staff_services (staff_id, service_id)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004')
on conflict (staff_id, service_id) do nothing;

insert into public.availability_rules (id, business_id, staff_id, day_of_week, start_time, end_time, active)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 3, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 4, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 6, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 1, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 2, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 3, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 4, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 5, '10:00', '19:00', true),
  ('40000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 6, '10:00', '19:00', true)
on conflict (id) do update set
  business_id = excluded.business_id,
  staff_id = excluded.staff_id,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  active = excluded.active;

insert into public.faqs (id, business_id, question, answer, active, sort_order)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Do I need an appointment?', 'Appointments are recommended. You can book, reschedule, or cancel online.', true, 1),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Where should I park?', 'Paid street parking is available along Jalan Telawi.', true, 2),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'What should I bring?', 'Just arrive a few minutes early and let us know about any injuries.', true, 1)
on conflict (id) do update set
  business_id = excluded.business_id,
  question = excluded.question,
  answer = excluded.answer,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.gallery_items (id, business_id, image_url, alt_text, sort_order)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '/demo/aria/consultation.webp', 'A personal consultation at Aria Hair Studio', 1),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '/demo/aria/craft.webp', 'A precise haircut in progress', 2),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '/demo/aria/tools.webp', 'Professional tools prepared for a client', 3)
on conflict (id) do update set
  business_id = excluded.business_id,
  image_url = excluded.image_url,
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order;

insert into public.reviews (id, business_id, customer_name, rating, quote, sort_order)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Nadia', 5, 'Alex listened carefully and gave me exactly the low-maintenance cut I needed.', 1),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Daniel', 5, 'Calm studio, clear advice, and a consistently excellent finish.', 2)
on conflict (id) do update set
  business_id = excluded.business_id,
  customer_name = excluded.customer_name,
  rating = excluded.rating,
  quote = excluded.quote,
  sort_order = excluded.sort_order;
