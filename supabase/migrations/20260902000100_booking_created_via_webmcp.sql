alter table public.bookings
drop constraint if exists bookings_created_via_check;

update public.bookings
set created_via = 'webmcp'
where created_via = 'agent';

alter table public.bookings
add constraint bookings_created_via_check
check (created_via in ('website', 'webmcp'));
