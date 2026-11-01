import { Router } from "express";
import { getClinicSettings, updateClinicSettings } from "../controllers/clinicController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);
router.get("/settings", asyncHandler(getClinicSettings));
router.patch("/settings", asyncHandler(updateClinicSettings));
export default router;
