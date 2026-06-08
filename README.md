# Fleetbase Fuhrpark Manager

Production-shaped B2B SaaS for fleet management in DACH markets. The app covers public marketing pages, multi-tenant onboarding, role-based operations, vehicle QR workflows, bookings, approvals, digital Fahrtenbuch, maintenance, damage reports, handovers, driver permissions, usage limits, analytics and CSV exports.

## Tech Stack

- Next.js App Router + TypeScript
- PostgreSQL with Prisma ORM
- Tailwind CSS with shadcn-style UI primitives
- JWT sessions in secure HTTP-only cookies
- Zod validation and React Hook Form for auth forms
- Recharts for analytics
- Docker Compose for local PostgreSQL
- Vitest for pure domain rule tests

## Quick Start

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

When running the app in a VM/WSL environment, the dev and production scripts bind
Next.js to `0.0.0.0:3000`. If the browser runs outside that VM, either forward
guest port `3000` to host port `3000` and open `http://localhost:3000`, or open
the app through the VM IP, for example `http://192.168.x.x:3000`.

If you use a VM IP or a different public hostname, set:

```bash
NEXT_PUBLIC_APP_URL="http://<host-or-vm-ip>:3000"
NEXT_ALLOWED_ORIGINS="<host-or-vm-ip>:3000,localhost:3000,127.0.0.1:3000"
```

This workspace currently has no `node` or `npm` executable available, so commands could not be run locally here.

## Environment Variables

```bash
DATABASE_URL="postgresql://fleetbase:fleetbase@localhost:5432/fleetbase?schema=public"
JWT_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_ALLOWED_ORIGINS="localhost:3000,127.0.0.1:3000"
UPLOAD_STORAGE_DRIVER="local"
```

Use a strong `JWT_SECRET` in production. Never commit `.env`.

## Demo Credentials

All seeded users use:

```text
Password: FleetbaseDemo123!
```

Accounts:

- `admin@fleetbase.example` - PLATFORM_ADMIN
- `owner@musterlogistik.example` - OWNER, Professional tenant
- `manager@musterlogistik.example` - FLEET_MANAGER
- `lisa@musterlogistik.example` - USER
- `tom@musterlogistik.example` - blocked USER
- `owner@alpina-service.example` - OWNER, Basic tenant
- `manager@alpina-service.example` - FLEET_MANAGER
- `julia@alpina-service.example` - USER

## Public Pages

- `/`
- `/features`
- `/pricing`
- `/contact`
- `/book-demo`
- `/login`
- `/register`
- `/impressum`
- `/datenschutz`
- `/agb`

Legal pages are placeholders. Replace all placeholder data and have them reviewed by qualified legal counsel before publishing.

## App Modules

- Dashboard with vehicle, booking, trip, maintenance, damage and driver-permission metrics
- Vehicles with CRUD, archive, status/category badges, QR token management and QR PNG/SVG downloads
- QR vehicle page at `/v/[vehicleQrToken]`
- Bookings with server-side approval, rejection, cancellation and conflict checks
- Digital Fahrtenbuch with start/end flow, mileage validation, correction notes and CSV export
- Maintenance and downtime blocking
- Damage reports with photo URL abstraction for future S3-compatible storage
- Vehicle handover and return records
- Users, roles, departments and driver permission checks
- Subscription usage bars and plan limit enforcement
- Analytics and CSV exports for eligible plans
- Platform admin view for all companies

## Multi-Tenant Security Model

Every tenant-owned model has `companyId`. Server actions and API routes use centralized helpers:

- `getCurrentUser()`
- `getCurrentCompanyId()`
- `requireAuth()`
- `requireRole()`
- `requireCompanyScope()`
- `assertTenantAccess()`

Frontend navigation is role-aware, but all sensitive reads and writes are enforced server-side. Users from Company A cannot query or mutate Company B data unless they are `PLATFORM_ADMIN`.

## RBAC

- `USER`: own bookings, own trips, own damage reports, own handovers, QR actions after driver checks
- `FLEET_MANAGER`: vehicles, bookings, maintenance, damages, handovers, users, departments and reports in the tenant
- `OWNER`: company settings, subscription, branding, users and all tenant data
- `PLATFORM_ADMIN`: cross-company platform area

## Plan Limits

Plans are defined in `src/lib/plans.ts` and seeded into `SubscriptionPlanConfig`.

Tiers:

- `TRIAL`
- `BASIC`
- `PROFESSIONAL`
- `ENTERPRISE`

Server actions enforce limits for vehicles, users, departments, active bookings, monthly trip logs and monthly damage reports. Feature flags gate analytics, CSV exports, branding, QR, maintenance and driver permission modules.

Payment is intentionally not integrated. The app is structured for future Stripe Checkout, Customer Portal and webhook sync.

## QR Workflow

Vehicle QR codes contain only a random unguessable token and resolve to `/v/[token]`. They do not expose vehicle IDs, company IDs or sensitive data. Users must authenticate before creating trips, damage reports or handover records. The server verifies tenant access and audits QR opens and write actions.

## Fahrtenbuch / GDPR Notes

The trip log module is GDPR-conscious, not a legal guarantee:

- data minimization for trip and driver records
- purpose, trip type, mileage and distance capture
- role-based access
- tenant isolation
- audit logging
- correction notes instead of silent mutation
- CSV export
- retention period placeholder on company settings
- future deletion/anonymization process should be added before production

Have the Fahrtenbuch and privacy flows reviewed for your jurisdiction before live use.

## Security Notes

- Passwords are hashed with bcrypt
- JWT sessions are stored in HTTP-only cookies
- Inputs are validated with Zod
- Server actions enforce RBAC, tenant scope and plan limits
- Password hashes are never exported
- QR token internals are not exposed in data tables except workflow URLs for managers
- Auth endpoints include a local in-memory rate limiter
- File uploads are represented through a validation/storage abstraction; production should add S3-compatible storage, MIME sniffing, virus scanning and signed URLs

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Tests

`tests/domain-rules.test.ts` covers:

- tenant isolation
- role authorization
- booking overlap logic
- maintenance conflict logic
- active trip conflict logic
- plan limit boundaries
- QR token access rules
- blocked/expired/unapproved driver checks
- trip mileage validation

## Known Limitations

- No real payment integration yet
- Contact and demo forms are placeholders
- Uploads are URL/path based, not real multipart storage
- Legal pages are placeholders and not legal advice
- In-memory rate limiting is not distributed
- Report filters apply to chart data, but deeper saved report presets are not implemented
- No email notifications yet

## Future Stripe Integration Plan

1. Add Stripe customer ID to `Company`.
2. Create Checkout sessions from `/subscription`.
3. Add Customer Portal.
4. Process `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted` webhooks.
5. Sync Stripe price IDs to `SubscriptionTier`.
6. Keep server-side plan limits as the source of product enforcement.

## Next Steps

- Run the setup commands on a machine with Node.js installed.
- Apply and verify the Prisma migration against PostgreSQL.
- Run `npm run typecheck`, `npm run lint` and `npm run test`.
- Add production upload storage and distributed rate limiting.
- Replace legal placeholders and connect contact/demo forms.
