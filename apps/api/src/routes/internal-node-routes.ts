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
    const nodeId = parseInt(req.params.nodeId as string);

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
 * Routes: /:nodeId/*
 * 
 * Note: These routes are namespaced under /api/nodes in the main router
 */
export function createInternalNodeRoutes(): Router {
  const router = Router({ mergeParams: true });

  /**
   * POST /api/internal/:nodeId/auth/token
   * OAuth2 Client Credentials flow - Generate access token
   */
  router.post("/:nodeId/auth/token", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const services = req.app.locals.services as Services;
      const nodeId = parseInt(req.params.nodeId as string, 10);

      if (isNaN(nodeId)) {
        throw new BadRequestError("Invalid node ID");
      }

      // Authentication for token endpoint MUST use Basic auth with client credentials, 
      // https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1
      // Check for Basic auth header
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authorization header missing or invalid" });
        return;
      }

      // Extract client credentials from request body (application/x-www-form-urlencoded or JSON)
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "ascii"
      );
      const [clientId, clientSecret] = credentials.split(":");

      if (!clientId || !clientSecret) {
        res.status(400).json({
          error: "Missing client_id or client_secret in Basic auth header",
        });
        return;
      }
      const grantType = req.body.grant_type;
      if (grantType !== "client_credentials") {
        throw new BadRequestError("Unsupported grant_type. Only 'client_credentials' is supported");
      }

      if (!clientId || !clientSecret) {
        throw new BadRequestError("client_id and client_secret are required");
      }

      // Generate token (service validates node and credentials)
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
        const nodeId = parseInt(req.params.nodeId as string, 10);

        // Parse query parameters
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
        
        // Array parameters - can be passed multiple times or as comma-separated
        const parseArrayParam = (param: string | string[] | undefined): string[] | undefined => {
          if (!param) return undefined;
          if (Array.isArray(param)) return param;
          return param.split(',').map(s => s.trim());
        };
        
        const productId = parseArrayParam(req.query.productId as string | string[] | undefined);
        const companyId = parseArrayParam(req.query.companyId as string | string[] | undefined);
        const geography = parseArrayParam(req.query.geography as string | string[] | undefined);
        const classification = parseArrayParam(req.query.classification as string | string[] | undefined);
        const status = req.query.status as string | undefined;
        const validOn = req.query.validOn as string | undefined;
        const validAfter = req.query.validAfter as string | undefined;
        const validBefore = req.query.validBefore as string | undefined;

        // Get footprints
        const result = services.internalNodePact.getFootprints(
          nodeId,
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
        const nodeId = parseInt(req.params.nodeId as string);
        const footprintId = req.params.id;

        const footprint = services.internalNodePact.getFootprintById(nodeId, footprintId as string);

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
        const nodeId = parseInt(req.params.nodeId as string);
        
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
