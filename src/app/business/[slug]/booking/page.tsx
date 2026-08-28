import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingFlow } from "@/components/booking/booking-flow";
import { BookingShell } from "@/components/booking/booking-shell";
import { bookingDateBounds } from "@/features/bookings/service";
import { canUseOperation } from "@/features/capabilities/capabilities";
import { getPublishedBusinessRuntimeBySlug } from "@/lib/runtime/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const runtime = await getPublishedBusinessRuntimeBySlug(slug);
  return runtime && canUseOperation(runtime.capabilities, "create_booking") ? { title: `Book | ${runtime.business.name}` } : {};
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const runtime = await getPublishedBusinessRuntimeBySlug(slug);
  if (!runtime || !canUseOperation(runtime.capabilities, "create_booking")) notFound();
  const bounds = bookingDateBounds(runtime.business.timezone);

  return (
    <BookingShell business={runtime.business} eyebrow="Online booking" title="Find your time." introduction="Choose a service, stylist, and a time that suits you. Your appointment is held only after confirmation.">
      <BookingFlow slug={slug} services={runtime.services} minimumDate={bounds.minimum} maximumDate={bounds.maximum} />
    </BookingShell>
  );
}
