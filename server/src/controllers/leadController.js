import Lead from "../models/Lead.js";
import Appointment from "../models/Appointment.js";
import { appointmentWindow, assertWithinBusinessHours, assertNoOverlap } from "../services/scheduling.js";

const allowedStatuses = ["new", "contacted", "appointment_requested", "converted", "lost"];

export async function listLeads(req, res) {
  const { status, q, page = 1, limit = 20 } = req.query;
  const filter = { clinicId: req.user.clinicId };
  if (status && allowedStatuses.includes(status)) filter.status = status;
  if (q) filter.$or = [
    { patientName: { $regex: q, $options: "i" } },
    { phone: { $regex: q, $options: "i" } }
  ];
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((currentPage - 1) * safeLimit).limit(safeLimit),
    Lead.countDocuments(filter)
  ]);
  res.json({ items, total, page: currentPage, pages: Math.ceil(total / safeLimit) });
}

export async function createLead(req, res) {
  const { patientName, phone } = req.body;
  if (!patientName?.trim() || !phone?.trim()) return res.status(400).json({ message: "Patient name and phone are required" });
  const lead = await Lead.create({
    patientName: patientName.trim(), phone: phone.trim(), email: req.body.email || "",
    source: req.body.source || "other", serviceInterest: req.body.serviceInterest || "",
    notes: req.body.notes || "", consentToContact: Boolean(req.body.consentToContact),
    clinicId: req.user.clinicId
  });
  res.status(201).json({ lead });
}

export async function updateLead(req, res) {
  const allowed = ["patientName", "phone", "email", "source", "serviceInterest", "status", "notes", "consentToContact"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (update.status === "converted") return res.status(400).json({ message: "Use the convert-to-appointment action to mark an enquiry as converted" });
  if (update.status && !allowedStatuses.includes(update.status)) return res.status(400).json({ message: "Invalid status" });
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, clinicId: req.user.clinicId },
    { $set: update }, { new: true, runValidators: true }
  );
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  res.json({ lead });
}

export async function convertLeadToAppointment(req, res) {
  const lead = await Lead.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
  if (!lead) return res.status(404).json({ message: "Enquiry not found" });
  if (lead.status === "converted") return res.status(409).json({ message: "This enquiry has already been converted" });

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
    leadId: lead._id,
    patientName: lead.patientName,
    phone: lead.phone,
    service: lead.serviceInterest || req.body.service || "",
    startsAt: window.start,
    endsAt: window.end,
    source: "crm"
  });

  let convertedLead;
  try {
    convertedLead = await Lead.findOneAndUpdate(
      { _id: lead._id, clinicId: req.user.clinicId, status: { $ne: "converted" } },
      { $set: { status: "converted" } },
      { new: true, runValidators: true }
    );
  } catch (error) {
    await Appointment.deleteOne({ _id: appointment._id, clinicId: req.user.clinicId });
    throw error;
  }
  if (!convertedLead) {
    await Appointment.deleteOne({ _id: appointment._id, clinicId: req.user.clinicId });
    return res.status(409).json({ message: "This enquiry has already been converted" });
  }
  res.status(201).json({ lead: convertedLead, appointment });
}

export async function deleteLead(req, res) {
  const linkedAppointment = await Appointment.exists({ clinicId: req.user.clinicId, leadId: req.params.id, status: { $in: ["requested", "confirmed"] } });
  if (linkedAppointment) return res.status(409).json({ message: "This enquiry has an active appointment. Cancel the appointment before deleting the enquiry." });
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, clinicId: req.user.clinicId });
  if (!lead) return res.status(404).json({ message: "Enquiry not found" });
  res.json({ message: "Enquiry deleted" });
}
