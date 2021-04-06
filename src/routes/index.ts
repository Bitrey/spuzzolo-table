import { Router } from "express";
import authRoutes from "./auth";
import testRoutes from "./test";

const router = Router();

export type AsyncValidation = Promise<string | null>;
export type Validation = string | null;

router.use("/auth", authRoutes);
router.use("/test", testRoutes);

export default router;
