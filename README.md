# DentalOS

Multi-tenant dental clinic CRM and appointment SaaS starter.

## Included in v1.1
- Clinic registration and JWT authentication
- Clinic-scoped patient enquiry CRM
- Enquiry-to-appointment conversion
- Appointment availability and slot generation
- Clinic-specific timezone and weekly business hours
- Appointment overlap and opening-hour checks
- Dashboard metrics calculated in the clinic timezone
- Responsive React + Vite dashboard

## Requirements
- Node.js 20+
- MongoDB (local or Atlas)

## Run locally

### 1. Configure backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Set the values in `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dentalos
JWT_SECRET=replace-with-a-long-random-secret-of-at-least-32-characters
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Configure frontend (new terminal)
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5000.

## First use
Register a clinic from the login screen. Registration creates the clinic and its owner account. Open **Clinic settings** to configure the clinic timezone and opening hours. The starter defaults to Monday–Friday 09:00–18:00, Saturday 09:00–14:00 and Sunday closed.

## Key API routes
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/leads`, `POST /api/leads`, `PATCH /api/leads/:id`
- `POST /api/leads/:id/convert` — creates a linked appointment and marks the enquiry converted
- `GET /api/appointments/availability?date=YYYY-MM-DD&durationMinutes=30`
- `GET /api/appointments`, `POST /api/appointments`, `PATCH /api/appointments/:id`
- `GET /api/clinic/settings`, `PATCH /api/clinic/settings`
- `GET /api/dashboard/summary`

See [docs/API.md](docs/API.md), [docs/DATABASE.md](docs/DATABASE.md), [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/TESTING.md](docs/TESTING.md) for details.

## Important production checklist
This is an MVP starter, not a production-certified healthcare system. Before handling real patient information:
- Add HTTPS, managed secrets, backups, monitoring and alerting.
- Add email/phone verification, password reset and complete role-based access control.
- Add audit logs, retention/deletion workflows and tenant-isolation tests.
- Add database transactions or slot-locking to prevent simultaneous double-booking.
- Review applicable privacy, consent, retention and processor requirements in each operating jurisdiction.
- Do not store clinical notes, diagnoses or treatment records in this initial CRM.
- Do not enable call recording without appropriate notice and consent.

## Multi-tenant rule
All tenant-owned records contain `clinicId`. Auth middleware derives the clinic from the authenticated user. Controllers scope reads, updates and deletes using that tenant ID; never accept a client-provided `clinicId` as authority.
