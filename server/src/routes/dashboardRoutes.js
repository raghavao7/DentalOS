import { Router } from "express";
import { summary } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();
router.use(requireAuth);
router.get("/summary", asyncHandler(summary));
export default router;
