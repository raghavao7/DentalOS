# Database schema

All clinic-owned records include `clinicId` and must be queried with the authenticated tenant ID.

## Collections

### clinics
- name, slug, phone, email, address
- timezone (default `Asia/Kolkata`)
- languages (`en`, `te`, `hi`)
- businessHours, settings, isActive

### users
- clinicId, name, email, passwordHash
- role: owner | admin | receptionist
- isActive
- Unique compound index: `{ clinicId, email }`

### leads
- clinicId, patientName, phone, email
- source: website | phone | whatsapp | google | walk_in | other
- serviceInterest, status, assignedTo, notes
- consentToContact, lastContactedAt

### appointments
- clinicId, leadId, patientName, phone, service
- startsAt, endsAt, status, source, internalNote
- status: requested | confirmed | completed | cancelled | no_show

## Planned collections
- calls, conversations, messages
- automationRules, integrations
- seoReports, reviews, analyticsEvents
- subscriptions, auditLogs

## Data design notes
- Store timestamps as UTC Date values; render in the clinic's configured timezone.
- Keep clinical records and diagnosis data out of this initial CRM.
- Add retention/deletion workflows before production patient-data use.
