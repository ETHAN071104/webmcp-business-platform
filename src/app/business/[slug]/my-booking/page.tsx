import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingShell } from "@/components/booking/booking-shell";
import { ManageBookingFlow } from "@/components/booking/manage-booking-flow";
import { bookingDateBounds } from "@/features/bookings/service";
import { canUseOperation } from "@/features/capabilities/capabilities";
import { getPublishedBusinessRuntimeBySlug } from "@/lib/runtime/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const runtime = await getPublishedBusinessRuntimeBySlug(slug);
  return runtime && canUseOperation(runtime.capabilities, "get_booking") ? { title: `My booking | ${runtime.business.name}` } : {};
}

export default async function MyBookingPage({ params }: Props) {
  const { slug } = await params;
  const runtime = await getPublishedBusinessRuntimeBySlug(slug);
  if (!runtime || !canUseOperation(runtime.capabilities, "get_booking")) notFound();
  const bounds = bookingDateBounds(runtime.business.timezone);

  return (
    <BookingShell business={runtime.business} eyebrow="Manage appointment" title="Your booking." introduction="Enter your booking reference and the email address or phone number used when you booked.">
      <ManageBookingFlow
        slug={slug}
        minimumDate={bounds.minimum}
        maximumDate={bounds.maximum}
        canReschedule={canUseOperation(runtime.capabilities, "update_booking")}
      />
    </BookingShell>
  );
}
