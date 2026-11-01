import Appointment from "../models/Appointment.js";
import { DEFAULT_BUSINESS_HOURS } from "../constants/businessHours.js";

export { DEFAULT_BUSINESS_HOURS };

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ACTIVE_STATUSES = ["requested", "confirmed", "completed"];

function timeToMinutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function normalizeBusinessHours(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Business hours must be an object with one entry per weekday");
  }
  const result = {};
  for (const day of WEEKDAYS) {
    const value = input[day];
    if (!value || typeof value.isOpen !== "boolean") throw new Error(`Business hours for ${day} are incomplete`);
    const open = value.open;
    const close = value.close;
    const openMinutes = timeToMinutes(open);
    const closeMinutes = timeToMinutes(close);
    if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
      throw new Error(`Enter valid opening and closing times for ${day}`);
    }
    result[day] = { isOpen: value.isOpen, open, close };
  }
  return result;
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}

export function clinicDayBounds(now, timeZone = "Asia/Kolkata") {
  const parts = localParts(now, timeZone);
  const dateText = `${parts.year}-${parts.month}-${parts.day}`;
  const [year, month, day] = dateText.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  const start = localDateTimeToUtc(dateText, "00:00", timeZone);
  const nextStart = localDateTimeToUtc(nextDate, "00:00", timeZone);
  return { start, end: new Date(nextStart.getTime() - 1) };
}

export function localDateTimeToUtc(dateText, timeText, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || "") || timeToMinutes(timeText) === null) {
    throw new Error("Choose a valid appointment date and time");
  }
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== dateText) {
    throw new Error("Choose a valid appointment date");
  }
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = localParts(new Date(guess), timeZone);
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess += target - represented;
  }
  const result = new Date(guess);
  const check = localParts(result, timeZone);
  if (`${check.year}-${check.month}-${check.day}` !== dateText || Number(check.hour) !== hour || Number(check.minute) !== minute) {
    throw new Error("That local time does not exist in the clinic timezone");
  }
  return result;
}

export function appointmentWindow(input, timeZone) {
  let start;
  let end;
  if (input.date && input.time && input.durationMinutes !== undefined) {
    const duration = Number(input.durationMinutes);
    if (!Number.isInteger(duration) || duration < 15 || duration > 240 || duration % 15 !== 0) {
      throw new Error("Duration must be between 15 and 240 minutes, in 15-minute increments");
    }
    start = localDateTimeToUtc(input.date, input.time, timeZone);
    const endMinute = timeToMinutes(input.time) + duration;
    if (endMinute >= 1440) throw new Error("Appointment must finish before midnight");
    const endTime = `${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
    end = localDateTimeToUtc(input.date, endTime, timeZone);
  } else {
    start = new Date(input.startsAt);
    end = new Date(input.endsAt);
  }
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid appointment date/time range");
  }
  if (start <= new Date()) throw new Error("Choose a future appointment time");
  return { start, end };
}

export function assertWithinBusinessHours(start, end, clinic) {
  const timeZone = clinic.timezone || "Asia/Kolkata";
  const startLocal = localParts(start, timeZone);
  const endLocal = localParts(end, timeZone);
  const startDate = `${startLocal.year}-${startLocal.month}-${startLocal.day}`;
  const endDate = `${endLocal.year}-${endLocal.month}-${endLocal.day}`;
  if (startDate !== endDate) throw new Error("An appointment must start and finish on the same clinic day");

  const day = WEEKDAYS[new Date(`${startDate}T12:00:00Z`).getUTCDay()];
  const hours = (clinic.businessHours && clinic.businessHours[day]) || DEFAULT_BUSINESS_HOURS[day];
  if (!hours?.isOpen) throw new Error(`The clinic is closed on ${day}`);
  const startMinutes = Number(startLocal.hour) * 60 + Number(startLocal.minute);
  const endMinutes = Number(endLocal.hour) * 60 + Number(endLocal.minute);
  const openMinutes = timeToMinutes(hours.open);
  const closeMinutes = timeToMinutes(hours.close);
  if (openMinutes === null || closeMinutes === null || startMinutes < openMinutes || endMinutes > closeMinutes) {
    throw new Error(`Choose a time within clinic hours (${hours.open}–${hours.close})`);
  }
}

export async function assertNoOverlap(clinicId, start, end, excludeId = null) {
  const filter = {
    clinicId,
    status: { $in: ACTIVE_STATUSES },
    startsAt: { $lt: end },
    endsAt: { $gt: start }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const overlap = await Appointment.findOne(filter).select("_id");
  if (overlap) {
    const error = new Error("This time overlaps another appointment");
    error.status = 409;
    throw error;
  }
}

export async function getAvailableSlots(clinic, dateText, durationMinutes = 30) {
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 15 || duration > 240 || duration % 15 !== 0) {
    throw new Error("Duration must be between 15 and 240 minutes, in 15-minute increments");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || "")) throw new Error("Choose a valid date");
  const [year, month, dayNumber] = dateText.split("-").map(Number);
  const dateCheck = new Date(Date.UTC(year, month - 1, dayNumber));
  if (dateCheck.toISOString().slice(0, 10) !== dateText) throw new Error("Choose a valid date");
  const day = WEEKDAYS[dateCheck.getUTCDay()];
  const hours = (clinic.businessHours && clinic.businessHours[day]) || DEFAULT_BUSINESS_HOURS[day];
  if (!hours?.isOpen) return { date: dateText, durationMinutes: duration, slots: [] };

  const openMinutes = timeToMinutes(hours.open);
  const closeMinutes = timeToMinutes(hours.close);
  const dayStart = localDateTimeToUtc(dateText, hours.open, clinic.timezone || "Asia/Kolkata");
  const dayEnd = localDateTimeToUtc(dateText, hours.close, clinic.timezone || "Asia/Kolkata");
  const existing = await Appointment.find({
    clinicId: clinic._id,
    status: { $in: ACTIVE_STATUSES },
    startsAt: { $lt: dayEnd },
    endsAt: { $gt: dayStart }
  }).select("startsAt endsAt");
  const slots = [];
  for (let minute = openMinutes; minute + duration <= closeMinutes; minute += 15) {
    const hourText = String(Math.floor(minute / 60)).padStart(2, "0");
    const minuteText = String(minute % 60).padStart(2, "0");
    const time = `${hourText}:${minuteText}`;
    const start = localDateTimeToUtc(dateText, time, clinic.timezone || "Asia/Kolkata");
    const endMinute = minute + duration;
    const endTime = `${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
    const end = localDateTimeToUtc(dateText, endTime, clinic.timezone || "Asia/Kolkata");
    if (start <= new Date()) continue;
    const busy = existing.some(item => item.startsAt < end && item.endsAt > start);
    if (!busy) slots.push({ time, startsAt: start.toISOString(), endsAt: end.toISOString() });
  }
  return { date: dateText, durationMinutes: duration, slots };
}
