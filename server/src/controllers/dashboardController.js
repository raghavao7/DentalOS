import Lead from "../models/Lead.js";
import Appointment from "../models/Appointment.js";
import { clinicDayBounds } from "../services/scheduling.js";

export async function summary(req, res) {
  const clinicId = req.user.clinicId;
  const now = new Date();
  const { start: todayStart, end: todayEnd } = clinicDayBounds(now, req.clinic.timezone || "Asia/Kolkata");
  const [totalLeads, newLeads, todayAppointments, upcomingAppointments] = await Promise.all([
    Lead.countDocuments({ clinicId }),
    Lead.countDocuments({ clinicId, status: "new" }),
    Appointment.countDocuments({ clinicId, startsAt: { $gte: todayStart, $lte: todayEnd }, status: { $ne: "cancelled" } }),
    Appointment.find({ clinicId, startsAt: { $gte: now }, status: { $in: ["requested", "confirmed"] } })
      .sort({ startsAt: 1 }).limit(5)
  ]);
  res.json({ totalLeads, newLeads, todayAppointments, upcomingAppointments });
}
