# v1.1 manual verification checklist

Run the server and client as described in the root README, then verify with two test clinics.

## Scheduling
1. Create a clinic and open **Clinic settings**.
2. Confirm the default hours are Monday–Friday 09:00–18:00, Saturday 09:00–14:00 and Sunday closed.
3. Change one weekday's hours, save, reload the page and confirm the values persist.
4. For an open day, request `/api/appointments/availability?date=YYYY-MM-DD&durationMinutes=30`; verify slots use clinic-local time.
5. Try a date when the clinic is closed; the API should return an empty slot list.
6. Book one offered slot, then request availability again; the overlapping slot range should disappear.
7. Try a past time, a time outside opening hours, and an overlapping appointment; each should be rejected.

## Enquiry conversion
1. Add an enquiry with a patient name and phone number.
2. Click **Book** on that enquiry, select a future date, duration and available time.
3. Confirm one linked appointment is created and the enquiry status becomes `converted`.
4. Try to convert the same enquiry again; the API should return HTTP 409.
5. Try `PATCH /api/leads/:id` with `status: "converted"`; the API should reject it.

## Tenant isolation
1. Create two clinics with different owner accounts.
2. Add an enquiry and appointment to each clinic.
3. Authenticate as Clinic A and verify that list, search, availability and update operations cannot read or modify Clinic B's records.
4. Repeat in reverse.

## Notes
The source includes syntax checks and pure scheduling-logic checks, but the complete app still needs a real MongoDB integration test and a dependency-installed Vite production build before deployment. Simultaneous double-booking must be protected with a database transaction/slot-lock strategy before real clinics rely on it.
