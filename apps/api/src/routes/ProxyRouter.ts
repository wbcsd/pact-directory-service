import { Router } from "express";
import authenticate from "../middleware/jwt-auth-middleware";
import ProxyRoutes from "./ProxyRoutes";

const router = Router();

router.post("/proxy/test", authenticate, ProxyRoutes.runTestCases);
router.get("/proxy/test-results", authenticate, ProxyRoutes.getTestResults);
router.get("/proxy/test-runs", authenticate, ProxyRoutes.getOrSearchTestRuns);

export default router;
