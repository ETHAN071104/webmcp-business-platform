const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::\d{2})?$/;

export function localDateInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function localTimeInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

export function addDays(date: string, days: number): string {
  if (!DATE_PATTERN.test(date)) throw new Error("Invalid ISO date.");
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
  if (!DATE_PATTERN.test(date)) throw new Error("Invalid ISO date.");
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function timeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new Error("Invalid time.");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error("Invalid time.");
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function normalizeTime(time: string): string {
  return minutesToTime(timeToMinutes(time));
}

export function overlaps(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string,
): boolean {
  return timeToMinutes(newStart) < timeToMinutes(existingEnd) && timeToMinutes(newEnd) > timeToMinutes(existingStart);
}

export function isDateWithinBookingWindow(
  date: string,
  timeZone: string,
  now: Date,
  maximumDays = 30,
): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const today = localDateInTimeZone(now, timeZone);
  return date >= today && date <= addDays(today, maximumDays);
}
