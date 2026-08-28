import { isValidThemeColor } from "@/themes";
import type { AppearancePatch, AvailabilityInput, ServiceInput, StaffInput } from "@/features/admin/types";

export function validateService(input: ServiceInput): void {
  if (!input.name.trim()) throw new Error("Service name is required.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price must be zero or greater.");
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5) throw new Error("Duration must be at least 5 minutes.");
}

export function validateStaff(input: StaffInput): void {
  if (!input.name.trim()) throw new Error("Staff name is required.");
}

export function validateAvailability(input: AvailabilityInput[]): void {
  for (const rule of input) {
    if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6) throw new Error("Availability day is invalid.");
    if (!/^\d{2}:\d{2}$/.test(rule.startTime) || !/^\d{2}:\d{2}$/.test(rule.endTime) || rule.startTime >= rule.endTime) throw new Error("Availability hours are invalid.");
  }
}

export function validateAppearance(input: AppearancePatch): void {
  for (const value of [input.brandPrimary, input.brandAccent, input.brandBackground, input.brandDark]) {
    if (value !== null && !isValidThemeColor(value)) throw new Error("Brand colors must use a valid hex value.");
  }
}
