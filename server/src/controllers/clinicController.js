import { DEFAULT_BUSINESS_HOURS } from "../constants/businessHours.js";
import { normalizeBusinessHours } from "../services/scheduling.js";

export async function getClinicSettings(req, res) {
  const clinic = req.clinic;
  res.json({
    clinic: {
      id: clinic._id,
      name: clinic.name,
      phone: clinic.phone,
      email: clinic.email,
      address: clinic.address,
      timezone: clinic.timezone,
      languages: clinic.languages,
      businessHours: Object.fromEntries(Object.entries(DEFAULT_BUSINESS_HOURS).map(([day, defaults]) => [day, { ...defaults, ...(clinic.businessHours?.[day] || {}) }]))
    }
  });
}

export async function updateClinicSettings(req, res) {
  if (!["owner", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only clinic owners and admins can update clinic settings" });
  }

  const { name, phone, address, timezone, businessHours } = req.body;
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
      return res.status(400).json({ message: "Clinic name must be between 1 and 120 characters" });
    }
    req.clinic.name = name.trim();
  }
  if (phone !== undefined) req.clinic.phone = String(phone).trim().slice(0, 30);
  if (address !== undefined) req.clinic.address = String(address).trim().slice(0, 300);
  if (timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
      req.clinic.timezone = timezone;
    } catch {
      return res.status(400).json({ message: "Enter a valid IANA timezone, such as Asia/Kolkata" });
    }
  }
  if (businessHours !== undefined) {
    try {
      req.clinic.businessHours = normalizeBusinessHours(businessHours);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  await req.clinic.save();
  return getClinicSettings(req, res);
}
