create extension if not exists btree_gist;

alter table public.bookings
add column booking_span tsrange
generated always as (
  tsrange(booking_date + start_time, booking_date + end_time, '[)')
) stored;

alter table public.bookings
add constraint bookings_staff_no_confirmed_overlap
exclude using gist (
  staff_id with =,
  booking_span with &&
)
where (status = 'confirmed');

create index bookings_business_reference_idx
on public.bookings (business_id, booking_reference);

comment on constraint bookings_staff_no_confirmed_overlap on public.bookings is
'Prevents concurrent confirmed bookings for the same staff member from overlapping; cancelled bookings do not block availability.';
