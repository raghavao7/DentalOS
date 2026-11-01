import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
  patientName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true, default: "" },
  source: { type: String, enum: ["website", "phone", "whatsapp", "google", "walk_in", "other"], default: "other" },
  serviceInterest: { type: String, default: "", maxlength: 160 },
  status: { type: String, enum: ["new", "contacted", "appointment_requested", "converted", "lost"], default: "new", index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  notes: { type: String, default: "", maxlength: 2000 },
  consentToContact: { type: Boolean, default: false },
  lastContactedAt: { type: Date, default: null }
}, { timestamps: true });

leadSchema.index({ clinicId: 1, createdAt: -1 });
export default mongoose.model("Lead", leadSchema);
