import Appointment from "../models/Appointment.js";
import Lead from "../models/Lead.js";
import {
  appointmentWindow, assertWithinBusinessHours, assertNoOverlap, getAvailableSlots
} from "../services/scheduling.js";

const statuses = ["requested", "confirmed", "completed", "cancelled", "no_show"];

export async function listAppointments(req, res) {
  const filter = { clinicId: req.user.clinicId };
  if (req.query.status && statuses.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.startsAt = {};
    if (req.query.from) filter.startsAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.startsAt.$lte = new Date(req.query.to);
  }
  const items = await Appointment.find(filter).sort({ startsAt: 1 }).limit(250);
  res.json({ items });
}

export async function availableSlots(req, res) {
  try {
    const result = await getAvailableSlots(req.clinic, req.query.date, req.query.durationMinutes || 30);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function createAppointment(req, res) {
  const { patientName, phone, leadId } = req.body;
  if (!patientName?.trim() || !phone?.trim()) {
    return res.status(400).json({ message: "Patient name and phone are required" });
  }
  if (leadId) {
    const lead = await Lead.findOne({ _id: leadId, clinicId: req.user.clinicId });
    if (!lead) return res.status(404).json({ message: "Linked enquiry not found" });
  }

  let window;
  try {
    window = appointmentWindow(req.body, req.clinic.timezone || "Asia/Kolkata");
    assertWithinBusinessHours(window.start, window.end, req.clinic);
    await assertNoOverlap(req.user.clinicId, window.start, window.end);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const appointment = await Appointment.create({
    clinicId: req.user.clinicId,
    leadId: leadId || null,
    patientName: patientName.trim(),
    phone: phone.trim(),
    service: req.body.service || "",
    startsAt: window.start,
    endsAt: window.end,
    source: req.body.source && ["crm", "website", "phone", "whatsapp", "manual"].includes(req.body.source) ? req.body.source : "manual",
    internalNote: req.body.internalNote || ""
  });
  res.status(201).json({ appointment });
}

export async function updateAppointment(req, res) {
  const allowed = ["patientName", "phone", "service", "startsAt", "endsAt", "status", "internalNote"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (update.status && !statuses.includes(update.status)) return res.status(400).json({ message: "Invalid status" });

  const existing = await Appointment.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
  if (!existing) return res.status(404).json({ message: "Appointment not found" });

  if (update.startsAt || update.endsAt) {
    const start = new Date(update.startsAt || existing.startsAt);
    const end = new Date(update.endsAt || existing.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: "Invalid appointment date/time range" });
    }
    update.startsAt = start;
    update.endsAt = end;
  }
  const resultingStatus = update.status || existing.status;
  if (["requested", "confirmed"].includes(resultingStatus) && (update.startsAt || update.endsAt || update.status)) {
    const start = update.startsAt || existing.startsAt;
    const end = update.endsAt || existing.endsAt;
    try {
      assertWithinBusinessHours(start, end, req.clinic);
      await assertNoOverlap(req.user.clinicId, start, end, existing._id);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
  }

  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, clinicId: req.user.clinicId },
    { $set: update }, { new: true, runValidators: true }
  );
  res.json({ appointment });
}
