import { Router } from "express";
import AuthRoutes from "./AuthRoutes";

const router = Router();
router.post("auth/token", AuthRoutes.token);

export default router;
