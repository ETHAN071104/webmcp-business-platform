alter table public.businesses
  add column brand_primary text,
  add column brand_accent text,
  add column brand_background text,
  add column brand_dark text;

alter table public.businesses
  add constraint businesses_brand_primary_hex_check
    check (brand_primary is null or brand_primary ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  add constraint businesses_brand_accent_hex_check
    check (brand_accent is null or brand_accent ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  add constraint businesses_brand_background_hex_check
    check (brand_background is null or brand_background ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  add constraint businesses_brand_dark_hex_check
    check (brand_dark is null or brand_dark ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');
