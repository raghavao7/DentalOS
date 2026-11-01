# API reference

Base URL: `/api`.

All routes except registration, login and health require `Authorization: Bearer <JWT>`.

## Health
- `GET /health`

## Authentication
- `POST /auth/register`
  - `{ clinicName, name, email, password, phone? }`
  - Creates a clinic and its owner.
- `POST /auth/login`
  - `{ email, password }`
- `GET /auth/me`

## Enquiries
- `GET /leads?q=&status=&page=&limit=`
- `POST /leads`
  - `{ patientName, phone, email?, source?, serviceInterest?, notes?, consentToContact? }`
- `PATCH /leads/:id`
  - Updates enquiry information and non-converted statuses. The generic endpoint deliberately cannot set `status: "converted"`.
- `POST /leads/:id/convert`
  - `{ date, time, durationMinutes }`, where `date` and `time` are in the clinic's configured timezone.
  - Creates an appointment linked to the enquiry, then marks the enquiry converted. If the enquiry update fails, the new appointment is removed.
- `DELETE /leads/:id`
  - An enquiry with a requested or confirmed appointment cannot be deleted until that appointment is cancelled.

## Appointments
- `GET /appointments?from=&to=&status=`
- `GET /appointments/availability?date=YYYY-MM-DD&durationMinutes=30`
  - Returns available start times for the requested clinic-local date. Duration must be 15–240 minutes in 15-minute increments.
- `POST /appointments`
  - `{ patientName, phone, date, time, durationMinutes, service?, leadId?, source? }`
  - `date` and `time` are interpreted in the clinic's configured timezone. Legacy `{ startsAt, endsAt }` UTC timestamps are also accepted.
- `PATCH /appointments/:id`
  - Supports status, patientName, phone, service, startsAt, endsAt and internalNote.
- Appointments outside configured business hours, in the past, or overlapping another active appointment are rejected. Overlap conflicts return HTTP 409.

## Clinic settings
- `GET /clinic/settings`
- `PATCH /clinic/settings`
  - `{ name?, phone?, address?, timezone?, businessHours? }`
  - Only clinic owners and admins can update settings.
  - `businessHours` must contain all seven weekdays. Each value has `{ isOpen, open, close }`, with times in `HH:mm` format.
  - Example:
    ```json
    {
      "monday": { "isOpen": true, "open": "09:00", "close": "18:00" },
      "tuesday": { "isOpen": true, "open": "09:00", "close": "18:00" },
      "wednesday": { "isOpen": true, "open": "09:00", "close": "18:00" },
      "thursday": { "isOpen": true, "open": "09:00", "close": "18:00" },
      "friday": { "isOpen": true, "open": "09:00", "close": "18:00" },
      "saturday": { "isOpen": true, "open": "09:00", "close": "14:00" },
      "sunday": { "isOpen": false, "open": "09:00", "close": "18:00" }
    }
    ```

## Dashboard
- `GET /dashboard/summary`
  - Today's appointment count is calculated using the clinic timezone.

## Tenant isolation
The server derives `clinicId` from the authenticated user. Never accept a client-provided clinicId for tenant ownership.
