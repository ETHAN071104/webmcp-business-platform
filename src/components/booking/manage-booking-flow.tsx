"use client";

import { useState } from "react";

import type { BookingPublicDetails, BookingSlot } from "@/features/bookings/types";

type StaffOption = { id: string; name: string; imageUrl: string | null };
type ApiError = { error?: { message?: string } };

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(data.error?.message ?? "Something went wrong. Please try again.");
  return data;
}

export function ManageBookingFlow({ slug, minimumDate, maximumDate, canReschedule }: { slug: string; minimumDate: string; maximumDate: string; canReschedule: boolean }) {
  const [reference, setReference] = useState("");
  const [verification, setVerification] = useState("");
  const [booking, setBooking] = useState<BookingPublicDetails | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await responseJson<{ booking: BookingPublicDetails }>(await fetch(`/api/business/${slug}/booking/manage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, verification }),
      }));
      setBooking(data.booking);
      setRescheduling(false);
    } catch (reason) {
      setBooking(null);
      setError(reason instanceof Error ? reason.message : "Could not find that booking.");
    } finally {
      setBusy(false);
    }
  }

  async function beginReschedule() {
    if (!booking) return;
    setBusy(true);
    setError("");
    try {
      const data = await responseJson<{ staff: StaffOption[] }>(await fetch(`/api/business/${slug}/booking?serviceId=${encodeURIComponent(booking.service.id)}`));
      setStaff(data.staff);
      setStaffId(booking.staff.id);
      setDate(booking.date);
      setSlots([]);
      setStartTime("");
      setRescheduling(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load rescheduling options.");
    } finally {
      setBusy(false);
    }
  }

  async function loadSlots(nextStaffId: string, nextDate: string) {
    if (!booking || !nextStaffId || !nextDate) return;
    setBusy(true);
    setError("");
    setSlots([]);
    setStartTime("");
    try {
      const data = await responseJson<{ slots: BookingSlot[] }>(await fetch(`/api/business/${slug}/booking/manage`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, verification, staffId: nextStaffId, date: nextDate }),
      }));
      setSlots(data.slots);
      if (!data.slots.length) setError("No times are open on this date. Try another day or stylist.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load available times.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReschedule() {
    if (!booking) return;
    setBusy(true);
    setError("");
    try {
      const data = await responseJson<{ booking: BookingPublicDetails }>(await fetch(`/api/business/${slug}/booking/manage`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, verification, staffId, date, startTime }),
      }));
      setBooking(data.booking);
      setRescheduling(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reschedule your booking.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!booking || !window.confirm("Cancel this booking? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const data = await responseJson<{ booking: BookingPublicDetails }>(await fetch(`/api/business/${slug}/booking/manage`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, verification }),
      }));
      setBooking(data.booking);
      setRescheduling(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel your booking.");
    } finally {
      setBusy(false);
    }
  }

  if (!booking) {
    return (
      <form className="booking-lookup" onSubmit={lookup}>
        <label className="booking-field"><span>Booking reference</span><input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="ARIA-ABC234" autoCapitalize="characters" required /></label>
        <label className="booking-field"><span>Email or phone</span><input value={verification} onChange={(event) => setVerification(event.target.value)} placeholder="The one used when booking" required /></label>
        <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Looking up…" : "Find booking"}</button>
        {error ? <p className="booking-error" role="alert">{error}</p> : null}
      </form>
    );
  }

  return (
    <section className="manage-booking-card" aria-live="polite">
      <div className={`booking-state ${booking.status}`}>{booking.status}</div>
      <p className="section-kicker">{booking.reference}</p>
      <h2>{booking.service.name}</h2>
      <dl>
        <div><dt>Date</dt><dd>{booking.date}</dd></div>
        <div><dt>Time</dt><dd>{formatTime(booking.startTime)}</dd></div>
        <div><dt>Stylist</dt><dd>{booking.staff.name}</dd></div>
        <div><dt>For</dt><dd>{booking.customerName}</dd></div>
      </dl>

      {rescheduling ? (
        <div className="reschedule-panel">
          <h3>Choose a new time</h3>
          <div className="booking-pills">{staff.map((person) => <button className={staffId === person.id ? "selected" : ""} type="button" key={person.id} onClick={() => { setStaffId(person.id); void loadSlots(person.id, date); }}>{person.name}</button>)}</div>
          <label className="booking-field compact"><span>Date</span><input type="date" min={minimumDate} max={maximumDate} value={date} onInput={(event) => { const nextDate = event.currentTarget.value; setDate(nextDate); void loadSlots(staffId, nextDate); }} /></label>
          <div className="slot-grid">{slots.map((slot) => <button className={startTime === slot.startTime ? "selected" : ""} type="button" key={slot.startTime} onClick={() => setStartTime(slot.startTime)}>{formatTime(slot.startTime)}</button>)}</div>
          <div className="manage-actions"><button className="button button-dark" type="button" disabled={!startTime || busy} onClick={saveReschedule}>{busy ? "Saving…" : "Save new time"}</button><button className="button button-quiet" type="button" onClick={() => setRescheduling(false)}>Keep current time</button></div>
        </div>
      ) : booking.status === "confirmed" ? (
        <div className="manage-actions">{canReschedule ? <button className="button button-dark" type="button" onClick={beginReschedule} disabled={busy}>Reschedule</button> : null}<button className="button button-danger" type="button" onClick={cancel} disabled={busy}>Cancel booking</button></div>
      ) : <p className="booking-hint">This booking is cancelled. Its former time is available to book again.</p>}
      {error ? <p className="booking-error" role="alert">{error}</p> : null}
      <button className="booking-text-button" type="button" onClick={() => { setBooking(null); setError(""); }}>Look up another booking</button>
    </section>
  );
}
