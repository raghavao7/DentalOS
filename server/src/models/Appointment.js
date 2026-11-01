import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
  patientName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  service: { type: String, default: "", maxlength: 160 },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ["requested", "confirmed", "completed", "cancelled", "no_show"], default: "requested", index: true },
  source: { type: String, enum: ["crm", "website", "phone", "whatsapp", "manual"], default: "manual" },
  internalNote: { type: String, default: "", maxlength: 1000 }
}, { timestamps: true });

appointmentSchema.index({ clinicId: 1, startsAt: 1 });
export default mongoose.model("Appointment", appointmentSchema);
