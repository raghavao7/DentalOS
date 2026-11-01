import mongoose from "mongoose";
import { DEFAULT_BUSINESS_HOURS } from "../constants/businessHours.js";

const clinicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  address: { type: String, default: "" },
  timezone: { type: String, default: "Asia/Kolkata" },
  languages: { type: [String], default: ["en", "te", "hi"] },
  businessHours: { type: mongoose.Schema.Types.Mixed, default: () => DEFAULT_BUSINESS_HOURS },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Clinic", clinicSchema);
