import type { WebMCPToolName } from "@/features/webmcp/types";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";
const TIME_PATTERN = "^(?:[01]\\d|2[0-3]):[0-5]\\d$";

const idSchema = { type: "string", pattern: UUID_PATTERN } as const;
const dateSchema = { type: "string", pattern: DATE_PATTERN, description: "Business-local date in YYYY-MM-DD format." } as const;
const timeSchema = { type: "string", pattern: TIME_PATTERN, description: "Business-local time in 24-hour HH:MM format." } as const;
const contactProperties = {
  customer_email: { type: "string", maxLength: 254 },
  customer_phone: { type: "string", minLength: 7, maxLength: 40 },
} as const;

export const WEBMCP_INPUT_SCHEMAS: Record<WebMCPToolName, Record<string, unknown>> = {
  get_business_info: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  list_services: {
    type: "object",
    properties: {
      category: { type: "string", maxLength: 80 },
      max_price: { type: "number", minimum: 0 },
    },
    additionalProperties: false,
  },
  get_service_details: {
    type: "object",
    properties: { service_id: idSchema },
    required: ["service_id"],
    additionalProperties: false,
  },
  recommend_service: {
    type: "object",
    properties: {
      occasion: { type: "string", maxLength: 120 },
      max_price: { type: "number", minimum: 0 },
      date: dateSchema,
      after_time: timeSchema,
      preferred_staff_id: idSchema,
      preference: { type: "string", maxLength: 200 },
    },
    additionalProperties: false,
  },
  list_staff: {
    type: "object",
    properties: { service_id: idSchema },
    additionalProperties: false,
  },
  get_available_slots: {
    type: "object",
    properties: {
      service_id: idSchema,
      date: dateSchema,
      staff_id: idSchema,
      after_time: timeSchema,
    },
    required: ["service_id", "date"],
    additionalProperties: false,
  },
  create_booking: {
    type: "object",
    properties: {
      service_id: idSchema,
      staff_id: idSchema,
      date: dateSchema,
      start_time: timeSchema,
      customer_name: { type: "string", minLength: 1, maxLength: 120 },
      ...contactProperties,
    },
    required: ["service_id", "staff_id", "date", "start_time", "customer_name"],
    anyOf: [{ required: ["customer_email"] }, { required: ["customer_phone"] }],
    additionalProperties: false,
  },
  update_booking: {
    type: "object",
    properties: {
      booking_reference: { type: "string", minLength: 5, maxLength: 40 },
      ...contactProperties,
      new_date: dateSchema,
      new_start_time: timeSchema,
      new_staff_id: idSchema,
    },
    required: ["booking_reference"],
    allOf: [
      { anyOf: [{ required: ["customer_email"] }, { required: ["customer_phone"] }] },
      { anyOf: [{ required: ["new_date"] }, { required: ["new_start_time"] }, { required: ["new_staff_id"] }] },
    ],
    additionalProperties: false,
  },
  cancel_booking: {
    type: "object",
    properties: {
      booking_reference: { type: "string", minLength: 5, maxLength: 40 },
      ...contactProperties,
    },
    required: ["booking_reference"],
    anyOf: [{ required: ["customer_email"] }, { required: ["customer_phone"] }],
    additionalProperties: false,
  },
};

export class AgentInputError extends Error {
  readonly code = "invalid_input";

  constructor(message: string) {
    super(message);
    this.name = "AgentInputError";
  }
}

export type AgentToolInputs = {
  get_business_info: Record<string, never>;
  list_services: { category?: string; maxPrice?: number };
  get_service_details: { serviceId: string };
  recommend_service: {
    occasion?: string;
    maxPrice?: number;
    date?: string;
    afterTime?: string;
    preferredStaffId?: string;
    preference?: string;
  };
  list_staff: { serviceId?: string };
  get_available_slots: { serviceId: string; date: string; staffId?: string; afterTime?: string };
  create_booking: {
    serviceId: string;
    staffId: string;
    date: string;
    startTime: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
  };
  update_booking: {
    bookingReference: string;
    customerEmail?: string;
    customerPhone?: string;
    newDate?: string;
    newStartTime?: string;
    newStaffId?: string;
  };
  cancel_booking: {
    bookingReference: string;
    customerEmail?: string;
    customerPhone?: string;
  };
};

const UUID = new RegExp(UUID_PATTERN);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentInputError("Tool input must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

function only(data: Record<string, unknown>, allowed: readonly string[]) {
  const unexpected = Object.keys(data).find((key) => !allowed.includes(key));
  if (unexpected) throw new AgentInputError(`Unexpected input field: ${unexpected}.`);
}

function stringValue(data: Record<string, unknown>, field: string, required = false, maxLength = 254): string | undefined {
  const value = data[field];
  if (value === undefined || value === null) {
    if (required) throw new AgentInputError(`Missing ${field}.`);
    return undefined;
  }
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new AgentInputError(`Invalid ${field}.`);
  }
  return value.trim();
}

function numberValue(data: Record<string, unknown>, field: string): number | undefined {
  const value = data[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AgentInputError(`Invalid ${field}.`);
  }
  return value;
}

function uuidValue(data: Record<string, unknown>, field: string, required = false): string | undefined {
  const value = stringValue(data, field, required, 36);
  if (value && !UUID.test(value)) throw new AgentInputError(`Invalid ${field}.`);
  return value;
}

function dateValue(data: Record<string, unknown>, field: string, required = false): string | undefined {
  const value = stringValue(data, field, required, 10);
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!DATE.test(value) || date.toISOString().slice(0, 10) !== value) {
    throw new AgentInputError(`Invalid ${field}; use YYYY-MM-DD.`);
  }
  return value;
}

function timeValue(data: Record<string, unknown>, field: string, required = false): string | undefined {
  const value = stringValue(data, field, required, 5);
  if (value && !TIME.test(value)) throw new AgentInputError(`Invalid ${field}; use HH:MM.`);
  return value;
}

function contact(data: Record<string, unknown>) {
  const customerEmail = stringValue(data, "customer_email", false, 254);
  const customerPhone = stringValue(data, "customer_phone", false, 40);
  if (!customerEmail && !customerPhone) {
    throw new AgentInputError("Provide customer_email or customer_phone for verification.");
  }
  return { customerEmail, customerPhone };
}

export function parseAgentToolInput<Name extends WebMCPToolName>(
  name: Name,
  value: unknown,
): AgentToolInputs[Name] {
  const data = objectInput(value);
  switch (name) {
    case "get_business_info":
      only(data, []);
      return {} as AgentToolInputs[Name];
    case "list_services":
      only(data, ["category", "max_price"]);
      return { category: stringValue(data, "category", false, 80), maxPrice: numberValue(data, "max_price") } as AgentToolInputs[Name];
    case "get_service_details":
      only(data, ["service_id"]);
      return { serviceId: uuidValue(data, "service_id", true)! } as AgentToolInputs[Name];
    case "recommend_service": {
      only(data, ["occasion", "max_price", "date", "after_time", "preferred_staff_id", "preference"]);
      const date = dateValue(data, "date");
      const afterTime = timeValue(data, "after_time");
      if (afterTime && !date) throw new AgentInputError("after_time requires date.");
      return {
        occasion: stringValue(data, "occasion", false, 120),
        maxPrice: numberValue(data, "max_price"),
        date,
        afterTime,
        preferredStaffId: uuidValue(data, "preferred_staff_id"),
        preference: stringValue(data, "preference", false, 200),
      } as AgentToolInputs[Name];
    }
    case "list_staff":
      only(data, ["service_id"]);
      return { serviceId: uuidValue(data, "service_id") } as AgentToolInputs[Name];
    case "get_available_slots":
      only(data, ["service_id", "date", "staff_id", "after_time"]);
      return {
        serviceId: uuidValue(data, "service_id", true)!,
        date: dateValue(data, "date", true)!,
        staffId: uuidValue(data, "staff_id"),
        afterTime: timeValue(data, "after_time"),
      } as AgentToolInputs[Name];
    case "create_booking": {
      only(data, ["service_id", "staff_id", "date", "start_time", "customer_name", "customer_email", "customer_phone"]);
      const verified = contact(data);
      return {
        serviceId: uuidValue(data, "service_id", true)!,
        staffId: uuidValue(data, "staff_id", true)!,
        date: dateValue(data, "date", true)!,
        startTime: timeValue(data, "start_time", true)!,
        customerName: stringValue(data, "customer_name", true, 120)!,
        ...verified,
      } as AgentToolInputs[Name];
    }
    case "update_booking": {
      only(data, ["booking_reference", "customer_email", "customer_phone", "new_date", "new_start_time", "new_staff_id"]);
      const verified = contact(data);
      const newDate = dateValue(data, "new_date");
      const newStartTime = timeValue(data, "new_start_time");
      const newStaffId = uuidValue(data, "new_staff_id");
      if (!newDate && !newStartTime && !newStaffId) throw new AgentInputError("Provide at least one booking change.");
      return {
        bookingReference: stringValue(data, "booking_reference", true, 40)!,
        ...verified,
        newDate,
        newStartTime,
        newStaffId,
      } as AgentToolInputs[Name];
    }
    case "cancel_booking": {
      only(data, ["booking_reference", "customer_email", "customer_phone"]);
      return {
        bookingReference: stringValue(data, "booking_reference", true, 40)!,
        ...contact(data),
      } as AgentToolInputs[Name];
    }
  }
}
