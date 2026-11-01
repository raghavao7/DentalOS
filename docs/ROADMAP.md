# DentalOS roadmap

## v1 foundation
- [x] Clinic registration and authentication
- [x] Tenant-scoped CRM
- [x] Appointment creation and overlap check
- [x] Dashboard summary

## v1.1 scheduling and conversion
- [x] Clinic timezone and configurable weekly business hours
- [x] Available appointment-slot API
- [x] Enquiry-to-appointment conversion
- [x] Prevent manual conversion without a linked appointment
- [x] Block appointments outside business hours and overlapping active bookings
- [ ] Add receptionist/admin invitations and full role-based access controls
- [ ] Add calendar week/day views and appointment rescheduling UX
- [ ] Add audit logs for status changes, cancellations and appointment creation

## Next product modules
1. WhatsApp provider adapter, consent-aware templates, delivery status and incoming-message routing.
2. Multilingual AI voice receptionist (English, Telugu and Hindi), call summaries and human handoff.
3. Google Business Profile connection, review workflow and local SEO reporting.
4. Analytics events, usage metering, clinic billing and subscriptions.
5. Production security, observability, backups, privacy workflows, load tests and deployment automation.

## Integration rule
Use provider adapters and webhooks. Keep provider-specific code out of core CRM controllers. Configure each integration per clinic and encrypt integration credentials at rest in production.
