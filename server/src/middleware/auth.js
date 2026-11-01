import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Clinic from "../models/Clinic.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("+passwordHash");
    if (!user || !user.isActive || user.clinicId.toString() !== payload.clinicId) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic || !clinic.isActive) return res.status(403).json({ message: "Clinic is inactive" });

    req.user = { id: user._id, clinicId: user.clinicId, role: user.role, name: user.name, email: user.email };
    req.clinic = clinic;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
