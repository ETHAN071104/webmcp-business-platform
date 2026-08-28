import { createServer } from "node:http";

const now = "2026-08-27T00:00:00.000Z";

const businesses = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "aria-hair",
    name: "Aria Hair Studio",
    business_type: "service",
    description: "Thoughtful cuts and styling in a calm neighbourhood studio.",
    phone: "+60 3-5555 0148",
    email: "hello@ariahair.example",
    address: "18 Jalan Telawi, Bangsar, Kuala Lumpur",
    timezone: "Asia/Kuala_Lumpur",
    hero_title: "Hair that feels like you",
    hero_subtitle: "Personal cuts and styling, delivered with care.",
    hero_image_url: "/demo/aria/hero.webp",
    theme_preset: "elegant",
    brand_primary: "#23483c",
    brand_accent: "#bf8f88",
    brand_background: null,
    brand_dark: "#17241f",
    status: "published",
    published_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "luna-wellness",
    name: "Luna Wellness Studio",
    business_type: "service",
    description: "Simple restorative treatments for busy city days.",
    phone: "+60 3-5555 0192",
    email: "care@lunawellness.example",
    address: "7 Jalan SS 21/1A, Petaling Jaya",
    timezone: "Asia/Kuala_Lumpur",
    hero_title: "Make space to reset",
    hero_subtitle: "A quiet studio for practical, restorative care.",
    hero_image_url: null,
    theme_preset: "clean",
    brand_primary: null,
    brand_accent: null,
    brand_background: null,
    brand_dark: null,
    status: "published",
    published_at: now,
    created_at: now,
    updated_at: now,
  },
];

const capabilities = [
  {
    business_id: businesses[0].id,
    services_enabled: true,
    staff_enabled: true,
    booking_enabled: true,
    faq_enabled: true,
    gallery_enabled: true,
    reviews_enabled: true,
    updated_at: now,
  },
  {
    business_id: businesses[1].id,
    services_enabled: true,
    staff_enabled: false,
    booking_enabled: false,
    faq_enabled: true,
    gallery_enabled: false,
    reviews_enabled: false,
    updated_at: now,
  },
];

const services = [
  ["Classic Cut", "A polished everyday cut with consultation.", "Cuts", 45, 30],
  ["Executive Cut", "A sharp, professional finish for important days.", "Cuts", 65, 45],
  ["Cut + Styling", "A tailored cut finished with event-ready styling.", "Styling", 75, 60],
  ["Premium Restyle", "A longer consultation and complete change of shape.", "Restyle", 95, 75],
].map(([name, description, category, price, duration_minutes], index) => ({
  id: `20000000-0000-4000-8000-00000000000${index + 1}`,
  business_id: businesses[0].id,
  name,
  description,
  category,
  price,
  duration_minutes,
  tags: [
    ["casual", "everyday"],
    ["professional", "interview", "formal"],
    ["styling", "professional"],
    ["premium", "restyle"],
  ][index],
  active: true,
  sort_order: index + 1,
}));

services.push({
  id: "20000000-0000-4000-8000-000000000005",
  business_id: businesses[1].id,
  name: "Restorative Massage",
  description: "A focused full-body reset.",
  category: "Wellness",
  price: 120,
  duration_minutes: 60,
  tags: [],
  active: true,
  sort_order: 1,
});

const staff = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    business_id: businesses[0].id,
    name: "Alex",
    bio: "Known for precise cuts and relaxed consultations.",
    image_url: "/demo/aria/alex.webp",
    active: true,
    sort_order: 1,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    business_id: businesses[0].id,
    name: "Mia",
    bio: "Specialises in expressive restyles and polished finishes.",
    image_url: "/demo/aria/mia.webp",
    active: true,
    sort_order: 2,
  },
];

const faqs = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    business_id: businesses[0].id,
    question: "Do I need an appointment?",
    answer: "Appointments are recommended. Call or email us while online booking is being prepared.",
    active: true,
    sort_order: 1,
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    business_id: businesses[0].id,
    question: "Where should I park?",
    answer: "Paid street parking is available along Jalan Telawi.",
    active: true,
    sort_order: 2,
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    business_id: businesses[1].id,
    question: "What should I bring?",
    answer: "Just arrive a few minutes early and let us know about any injuries.",
    active: true,
    sort_order: 1,
  },
];

const gallery_items = [
  ["/demo/aria/consultation.webp", "A personal consultation at Aria Hair Studio"],
  ["/demo/aria/craft.webp", "A precise haircut in progress"],
  ["/demo/aria/tools.webp", "Professional tools prepared for a client"],
].map(([image_url, alt_text], index) => ({
  id: `60000000-0000-4000-8000-00000000000${index + 1}`,
  business_id: businesses[0].id,
  image_url,
  alt_text,
  sort_order: index + 1,
}));

const reviews = [
  {
    id: "70000000-0000-4000-8000-000000000001",
    business_id: businesses[0].id,
    customer_name: "Nadia",
    rating: 5,
    quote: "Alex listened carefully and gave me exactly the low-maintenance cut I needed.",
    sort_order: 1,
  },
  {
    id: "70000000-0000-4000-8000-000000000002",
    business_id: businesses[0].id,
    customer_name: "Daniel",
    rating: 5,
    quote: "Calm studio, clear advice, and a consistently excellent finish.",
    sort_order: 2,
  },
];

const staff_services = [
  { staff_id: staff[0].id, service_id: services[0].id },
  { staff_id: staff[0].id, service_id: services[1].id },
  { staff_id: staff[0].id, service_id: services[2].id },
  { staff_id: staff[1].id, service_id: services[0].id },
  { staff_id: staff[1].id, service_id: services[2].id },
  { staff_id: staff[1].id, service_id: services[3].id },
];

const availability_rules = staff.flatMap((person, staffIndex) =>
  [1, 2, 3, 4, 5, 6].map((day_of_week, dayIndex) => ({
    id: `40000000-0000-4000-8000-${String(staffIndex * 6 + dayIndex + 1).padStart(12, "0")}`,
    business_id: businesses[0].id,
    staff_id: person.id,
    day_of_week,
    start_time: "10:00:00",
    end_time: "19:00:00",
    active: true,
  })),
);

const bookings = [];
const tables = { businesses, business_capabilities: capabilities, services, staff, staff_services, availability_rules, bookings, faqs, gallery_items, reviews };

function filteredRows(source, url) {
  let rows = source;
  for (const [key, value] of url.searchParams.entries()) {
    if (key === "select" || key === "order") continue;
    if (value.startsWith("eq.")) {
      const expected = value.slice(3);
      rows = rows.filter((row) => String(row[key]) === expected);
    } else if (value.startsWith("neq.")) {
      const expected = value.slice(4);
      rows = rows.filter((row) => String(row[key]) !== expected);
    } else if (value.startsWith("in.(")) {
      const expected = value.slice(4, -1).split(",");
      rows = rows.filter((row) => expected.includes(String(row[key])));
    }
  }
  return rows;
}

function writeJson(request, response, payload, status = 200) {
  const single = request.headers.accept?.includes("application/vnd.pgrst.object+json");
  const body = single && Array.isArray(payload) ? (payload[0] ?? null) : payload;
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:54321");
  const table = url.pathname.split("/").at(-1);
  const source = tables[table] ?? [];

  if (request.method === "OPTIONS") {
    response.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE" });
    response.end();
    return;
  }

  if (request.method === "POST" && table === "bookings") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const record = JSON.parse(raw);
    const created = {
      ...record,
      id: `80000000-0000-4000-8000-${String(bookings.length + 1).padStart(12, "0")}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    bookings.push(created);
    writeJson(request, response, [created], 201);
    return;
  }

  if (request.method === "POST" && Object.hasOwn(tables, table)) {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const payload = JSON.parse(raw);
    const records = Array.isArray(payload) ? payload : [payload];
    const now = new Date().toISOString();
    const created = records.map((record, index) => ({
      ...record,
      ...(!record.id && table !== "staff_services" && table !== "business_capabilities" ? {
        id: `90000000-0000-4000-9000-${String(source.length + index + 1).padStart(12, "0")}`,
      } : {}),
      ...(["businesses", "business_capabilities"].includes(table) ? { updated_at: now } : {}),
    }));
    source.push(...created);
    writeJson(request, response, created, 201);
    return;
  }

  if (request.method === "PATCH" && Object.hasOwn(tables, table)) {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const patch = JSON.parse(raw);
    const matches = filteredRows(source, url);
    matches.forEach((row) => Object.assign(row, patch, { updated_at: new Date().toISOString() }));
    writeJson(request, response, matches);
    return;
  }

  if (request.method === "DELETE" && Object.hasOwn(tables, table)) {
    const matches = filteredRows(source, url);
    for (const row of matches) {
      const index = source.indexOf(row);
      if (index >= 0) source.splice(index, 1);
    }
    writeJson(request, response, matches);
    return;
  }

  writeJson(request, response, filteredRows(source, url));
}).listen(54321, "127.0.0.1", () => {
  console.log("Mock Supabase listening on http://127.0.0.1:54321");
});
