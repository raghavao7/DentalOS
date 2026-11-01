import bcrypt from "bcryptjs";
import Clinic from "../models/Clinic.js";
import User from "../models/User.js";
import { signToken } from "../utils/token.js";

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, clinicId: user.clinicId };
}

export async function register(req, res) {
  const { clinicName, name, email, password, phone = "" } = req.body;
  if (!clinicName || !name || !email || !password) {
    return res.status(400).json({ message: "clinicName, name, email and password are required" });
  }
  if (password.length < 10) return res.status(400).json({ message: "Password must be at least 10 characters" });

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return res.status(409).json({ message: "Email is already registered" });

  const baseSlug = clinicName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clinic";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const clinic = await Clinic.create({ name: clinicName, slug, phone });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      clinicId: clinic._id, name, email: normalizedEmail, passwordHash, role: "owner"
    });
    return res.status(201).json({ token: signToken(user), user: safeUser(user), clinic });
  } catch (error) {
    await Clinic.findByIdAndDelete(clinic._id);
    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  return res.json({ token: signToken(user), user: safeUser(user) });
}

export async function me(req, res) {
  res.json({ user: req.user, clinic: req.clinic });
}
