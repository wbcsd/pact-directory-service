import { Router, Request, Response, NextFunction } from "express";
import { Services } from "../services";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../common/errors";
import logger from "../common/logger";

/**
 * Authentication middleware for internal node PACT API
 * Verifies Bearer token and injects connection context
 */
export const authenticateInternalNode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const services = req.app.locals.services as Services;
    const nodeId = parseInt(req.params.nodeId, 10);

    if (isNaN(nodeId)) {
      throw new BadRequestError("Invalid node ID");
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = await services.internalNodeAuth.verifyToken(token, nodeId);

    // Attach payload to request for use in route handlers
    res.locals.nodeAuth = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Create router for internal node PACT API endpoints
 * Routes: /api/internal/:nodeId/*
 */
export function createInternalNodeRoutes(): Router {
  const router = Router({ mergeParams: true });

  /**
   * POST /api/internal/:nodeId/auth/token
   * OAuth2 Client Credentials flow - Generate access token
   */
  router.post("/:nodeId/auth/token", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const services = req.app.locals.services as Services;
      const nodeId = parseInt(req.params.nodeId, 10);

      if (isNaN(nodeId)) {
        throw new BadRequestError("Invalid node ID");
      }

      // Verify node exists and is internal type
      // We query directly to avoid needing UserContext for this public endpoint
      const node = await services.internalNodeAuth["db"]
        .selectFrom("nodes")
        .select(["id", "type"])
        .where("id", "=", nodeId)
        .executeTakeFirst();

      if (!node) {
        throw new NotFoundError("Node not found");
      }

      if (node.type !== "internal") {
        throw new BadRequestError("Authentication only available for internal nodes");
      }

      // Extract client credentials from request body (application/x-www-form-urlencoded or JSON)
      const grantType = req.body.grant_type;
      const clientId = req.body.client_id;
      const clientSecret = req.body.client_secret;

      if (grantType !== "client_credentials") {
        throw new BadRequestError("Unsupported grant_type. Only 'client_credentials' is supported");
      }

      if (!clientId || !clientSecret) {
        throw new BadRequestError("client_id and client_secret are required");
      }

      // Generate token
      const tokenResponse = await services.internalNodeAuth.generateToken(
        nodeId,
        clientId,
        clientSecret
      );

      logger.info({ nodeId, clientId }, "Generated access token for internal node");

      res.json(tokenResponse);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/internal/:nodeId/3/footprints
   * List product footprints (PACT v3)
   */
  router.get(
    "/:nodeId/3/footprints",
    authenticateInternalNode,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const services = req.app.locals.services as Services;

        // Parse query parameters
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
        const productId = req.query.productId as string | undefined;
        const companyId = req.query.companyId as string | undefined;
        const geography = req.query.geography as string | undefined;
        const classification = req.query.classification as string | undefined;
        const status = req.query.status as string | undefined;
        const validOn = req.query.validOn as string | undefined;
        const validAfter = req.query.validAfter as string | undefined;
        const validBefore = req.query.validBefore as string | undefined;

        // Get footprints
        const result = services.internalNodePact.getFootprints(
          { productId, companyId, geography, classification, status, validOn, validAfter, validBefore },
          { limit, offset }
        );

        // Build Link header
        const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
        const linkHeader = services.internalNodePact.buildLinkHeader(result.links, baseUrl);

        if (linkHeader) {
          res.set("Link", linkHeader);
        }

        res.json({ data: result.data });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/internal/:nodeId/3/footprints/:id
   * Get single product footprint by ID (PACT v3)
   */
  router.get(
    "/:nodeId/3/footprints/:id",
    authenticateInternalNode,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const services = req.app.locals.services as Services;
        const footprintId = req.params.id;

        const footprint = services.internalNodePact.getFootprintById(footprintId);

        if (!footprint) {
          throw new NotFoundError("Product footprint not found");
        }

        res.json({ data: footprint });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/internal/:nodeId/3/events
   * Handle PACT v3 events (Published, RequestCreated, RequestFulfilled, RequestRejected)
   */
  router.post(
    "/:nodeId/3/events",
    authenticateInternalNode,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const nodeId = parseInt(req.params.nodeId, 10);
        
        // Validate CloudEvents format
        if (!req.body.type || !req.body.specversion || !req.body.id || !req.body.source) {
          throw new BadRequestError("Invalid CloudEvents format. Missing required fields: type, specversion, id, or source");
        }

        // Log the event (in production, process it)
        logger.info({
          nodeId,
          eventType: req.body.type,
          eventId: req.body.id,
          eventSource: req.body.source,
        }, "Received PACT event for internal node");

        // For now, just acknowledge receipt
        // In a full implementation, this would trigger workflows based on event type
        res.status(200).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
