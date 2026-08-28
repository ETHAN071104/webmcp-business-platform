# Relay — Agent-ready Business Platform

Relay is an open-source, multi-tenant Service Business platform that turns one merchant
configuration into a customer website and a structured WebMCP surface. Its core idea is:

> Configure once. Serve humans and agents.

> One business. One state. Two interfaces.

The implemented MVP is the reusable **Service Business** engine. Aria Hair Studio is the
polished Hair Salon reference implementation, not a salon-specific product architecture.
The same capability registry governs the human website, shared backend permissions, and
the tools available to AI agents.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start local Supabase and apply the migrations plus seed, or use an existing cloud
   Supabase project with the same schema:

   ```bash
   npx supabase start
   npx supabase db reset
   ```

3. Copy `.env.example` to `.env.local` and configure these variables without committing
   their values:

   ```text
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

   The service-role value is used only by server-side booking and Admin data access.

4. Start the app:

   ```bash
   npm run dev
   ```

   To use the bundled local data service explicitly, run `npm run dev:mock`.

## Routes

- `/` - platform explanation
- `/templates` - template availability
- `/business/aria-hair` - polished Elegant-theme reference business
- `/business/aria-hair/booking` - public service, staff, date, slot, and confirmation flow
- `/business/aria-hair/my-booking` - reference/contact lookup, rescheduling, and cancellation
- `/business/luna-wellness` - Clean-theme business rendered by the same engine
- `/business/hidden-draft` - intentionally returns 404

## Theme resolution

The `elegant`, `clean`, and `bold` presets provide complete token defaults. A business
may override only four validated hexadecimal colors:

- `brand_primary`
- `brand_accent`
- `brand_background`
- `brand_dark`

Invalid or null values fall back to the selected preset. The database migration also
enforces valid three- or six-digit hex values.

## Booking architecture

`src/features/bookings` is the shared feature layer for the website and WebMCP
tools. It owns capability checks, public/draft access rules, staff-service eligibility,
Malaysia-aware date boundaries, 15-minute slot generation, customer verification, and
create/update/cancel operations. Route handlers are deliberately thin and never expose
the Supabase service-role key or raw booking rows to the browser.

Migration `20260827000400_booking_integrity.sql` adds a partial GiST exclusion
constraint over each confirmed staff booking range. This is the final concurrency guard:
overlapping confirmed inserts or updates cannot both commit, while cancelled bookings do
not block the slot.

## Capability contract

`src/features/capabilities/capabilities.ts` is the canonical registry for optional
website sections, backend operations, operation dependencies, and future agent-tool
groups. Website composition uses `canRenderCapabilitySection`, feature operations use
`requireOperation`, and future tool/Agent Preview code can use
`getEnabledAgentToolNames` or `getAgentCapabilityPreview`. The WebMCP definition selector
uses that projection directly, so a disabled capability removes tools from registration
instead of exposing callable-but-disabled tools.

Configured state is not rewritten when dependencies are inconsistent. Effective
availability is derived instead. For example, `booking = true` with `services = false`
hides the booking CTA and disables availability, creation, and rescheduling. Cancellation
requires only `booking`, allowing an existing appointment to be cancelled without
re-enabling discovery capabilities.

The public `/booking` page requires effective `create_booking` availability. The public
`/my-booking` page becomes unavailable when `booking` itself is disabled. If booking is
enabled but a supporting discovery capability is disabled, lookup and cancellation stay
available while rescheduling is hidden and rejected by the feature layer.

## WebMCP architecture

Published business pages mount a small client-only provider. It feature-detects
`document.modelContext`, selects definitions from `getEnabledAgentToolNames`, and calls
`document.modelContext.registerTool()` with one shared `AbortController`. Aborting the
signal unregisters every tool when the page unmounts or its capability projection changes.
Browsers without WebMCP receive no warning or UI change.

Tool callbacks send structured JSON to the same-origin route:

```text
/api/business/[slug]/agent/tools/[tool]
```

The route validates untrusted arguments again and delegates to existing business and
booking operations. It never sends Supabase credentials or raw rows to the browser.
Agent creation fixes `created_via` to `agent`; callers cannot override it.

The locked page-scoped tool set is:

- `get_business_info`
- `list_services`
- `get_service_details`
- `recommend_service`
- `list_staff`
- `get_available_slots`
- `create_booking`
- `update_booking`
- `cancel_booking`

`recommend_service` is deterministic. It applies business ownership, active-service,
budget, eligible-staff, preferred-staff, and optional availability constraints before
ranking exact tag matches, name/category/description matches, price fit, availability,
and stable price/sort/name tie-breakers. It does not call an LLM.

## WebMCP local browser setup

Current Chrome documentation exposes local WebMCP testing behind a flag:

1. Open `chrome://flags/#enable-webmcp-testing`.
2. Enable the flag and relaunch Chrome.
3. Open `/business/aria-hair` and inspect the registered tools with a WebMCP-capable
   browser agent or Chrome's Model Context Tool Inspector.

Production verification should use an HTTPS deployment or the Chrome origin trial.

## Capability verification

The public page receives one normalized runtime from
`getPublishedBusinessRuntimeBySlug`. Sections never query Supabase themselves.

To verify database-driven gating, run this in the Supabase SQL editor:

```sql
update public.business_capabilities
set services_enabled = false,
    staff_enabled = false
where business_id = (
  select id from public.businesses where slug = 'aria-hair'
);
```

Refresh `/business/aria-hair`: Services and Staff disappear. Set both values back to
`true` and refresh to restore them. The same central capability map is used by the
website section selector and the future-facing `requireCapability` backend guard.

## Validation

```bash
npm test
npm run lint
npm run build
```

## Deployment architecture

Production uses one GitHub repository, one Vercel project, and one Supabase project.
Vercel builds the Next.js application with `npm run build`. Public business reads use the
anon client under RLS, while booking and Admin mutations cross a same-origin server route
before reaching service-role repositories. Mock mode is never used in production.

The Admin Console includes business, capability, service, staff, availability, content,
appearance, Human View, Agent View, and publish-readiness surfaces. Authentication,
payments, messaging, analytics, custom domains, final publishing, and additional business
engines remain intentionally deferred.

## License

Released under the [MIT License](LICENSE).
