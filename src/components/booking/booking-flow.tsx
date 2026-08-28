"use client";

import { useState } from "react";

import type { BookingPublicDetails, BookingSlot } from "@/features/bookings/types";
import type { Service } from "@/types/business";

type StaffOption = { id: string; name: string; imageUrl: string | null };
type ApiError = { error?: { message?: string } };

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value);
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(data.error?.message ?? "Something went wrong. Please try again.");
  return data;
}

export function BookingFlow({
  slug,
  services,
  minimumDate,
  maximumDate,
}: {
  slug: string;
  services: Service[];
  minimumDate: string;
  maximumDate: string;
}) {
  const [serviceId, setServiceId] = useState("");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingPublicDetails | null>(null);

  async function loadStaff(nextServiceId: string) {
    setServiceId(nextServiceId);
    setStaff([]);
    setStaffId("");
    setSlots([]);
    setStartTime("");
    setError("");
    if (!nextServiceId) return;
    setBusy(true);
    try {
      const data = await responseJson<{ staff: StaffOption[] }>(
        await fetch(`/api/business/${slug}/booking?serviceId=${encodeURIComponent(nextServiceId)}`),
      );
      setStaff(data.staff);
      if (data.staff.length === 0) setError("No team members are available for this service.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the team.");
    } finally {
      setBusy(false);
    }
  }

  async function loadSlots(nextStaffId: string, nextDate: string) {
    setSlots([]);
    setStartTime("");
    setError("");
    if (!serviceId || !nextStaffId || !nextDate) return;
    setBusy(true);
    try {
      const search = new URLSearchParams({ serviceId, staffId: nextStaffId, date: nextDate });
      const data = await responseJson<{ slots: BookingSlot[] }>(
        await fetch(`/api/business/${slug}/booking?${search}`),
      );
      setSlots(data.slots);
      if (data.slots.length === 0) setError("No times are open on this date. Try another day or team member.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load available times.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const data = await responseJson<{ booking: BookingPublicDetails }>(
        await fetch(`/api/business/${slug}/booking`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            serviceId,
            staffId,
            date,
            startTime,
            customerName: form.get("customerName"),
            customerEmail: form.get("customerEmail"),
            customerPhone: form.get("customerPhone"),
          }),
        }),
      );
      setConfirmation(data.booking);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete your booking.");
      if (staffId && date) await loadSlots(staffId, date);
    } finally {
      setBusy(false);
    }
  }

  if (confirmation) {
    return (
      <section className="booking-confirmation" aria-live="polite">
        <span className="confirmation-mark" aria-hidden="true">✓</span>
        <p className="section-kicker">Booking confirmed</p>
        <h2>We’ll see you then.</h2>
        <dl>
          <div><dt>Reference</dt><dd>{confirmation.reference}</dd></div>
          <div><dt>Service</dt><dd>{confirmation.service.name}</dd></div>
          <div><dt>With</dt><dd>{confirmation.staff.name}</dd></div>
          <div><dt>Date</dt><dd>{confirmation.date}</dd></div>
          <div><dt>Time</dt><dd>{formatTime(confirmation.startTime)}</dd></div>
        </dl>
        <p>Keep your reference and the email or phone you used. You’ll need both to change or cancel.</p>
        <a className="button button-dark" href={`/business/${slug}/my-booking`}>Manage booking</a>
      </section>
    );
  }

  return (
    <form className="booking-form" onSubmit={submit}>
      <ol className="booking-progress" aria-label="Booking steps">
        <li className={serviceId ? "complete" : "active"}>Service</li>
        <li className={staffId ? "complete" : serviceId ? "active" : ""}>Stylist</li>
        <li className={startTime ? "complete" : staffId ? "active" : ""}>Time</li>
        <li className={startTime ? "active" : ""}>Details</li>
      </ol>

      <fieldset className="booking-step">
        <legend><span>01</span> Choose a service</legend>
        <div className="booking-choice-list">
          {services.map((service) => (
            <label className={serviceId === service.id ? "booking-choice selected" : "booking-choice"} key={service.id}>
              <input type="radio" name="service" value={service.id} checked={serviceId === service.id} onChange={() => loadStaff(service.id)} />
              <span><strong>{service.name}</strong><small>{service.description}</small></span>
              <span className="choice-meta"><strong>{formatMoney(service.price)}</strong><small>{service.durationMinutes} min</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      {serviceId ? (
        <fieldset className="booking-step">
          <legend><span>02</span> Choose your stylist</legend>
          <div className="booking-pills">
            {staff.map((person) => (
              <button className={staffId === person.id ? "selected" : ""} type="button" key={person.id} onClick={() => { setStaffId(person.id); void loadSlots(person.id, date); }}>
                {person.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {staffId ? (
        <fieldset className="booking-step">
          <legend><span>03</span> Choose a date and time</legend>
          <label className="booking-field compact"><span>Date</span><input type="date" min={minimumDate} max={maximumDate} value={date} onInput={(event) => { const nextDate = event.currentTarget.value; setDate(nextDate); void loadSlots(staffId, nextDate); }} required /></label>
          {date ? <div className="slot-grid" aria-live="polite">{slots.map((slot) => <button className={startTime === slot.startTime ? "selected" : ""} type="button" key={slot.startTime} onClick={() => setStartTime(slot.startTime)}>{formatTime(slot.startTime)}</button>)}</div> : null}
        </fieldset>
      ) : null}

      {startTime ? (
        <fieldset className="booking-step">
          <legend><span>04</span> Your details</legend>
          <div className="booking-fields">
            <label className="booking-field"><span>Name</span><input name="customerName" autoComplete="name" maxLength={120} required /></label>
            <label className="booking-field"><span>Email</span><input name="customerEmail" type="email" autoComplete="email" /></label>
            <label className="booking-field"><span>Phone</span><input name="customerPhone" type="tel" autoComplete="tel" /></label>
          </div>
          <p className="booking-hint">Please provide at least an email address or phone number.</p>
          <button className="button button-dark booking-submit" type="submit" disabled={busy}>{busy ? "Confirming…" : "Confirm booking"}</button>
        </fieldset>
      ) : null}

      {busy && !startTime ? <p className="booking-status" role="status">Loading availability…</p> : null}
      {error ? <p className="booking-error" role="alert">{error}</p> : null}
    </form>
  );
}
