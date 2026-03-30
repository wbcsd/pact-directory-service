import { Router, Request, Response, NextFunction } from "express";
import { Services } from "../services";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../common/errors";
import logger from "../common/logger";

type NodeContextRequest = Request & { services: Services; nodeId: number };
type NodeHandler = (req: NodeContextRequest, res: Response) => Promise<any>;

/**
 * Middleware wrapper that injects services and parsed nodeId into the request object,
 * then executes the provided handler function. If the handler returns a result and the response
 * headers have not been sent, the result is sent as a JSON response.
 */
const nodeContext =
  (handler: NodeHandler) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const nodeReq = req as NodeContextRequest;
      nodeReq.services = req.app.locals.services;
      nodeReq.nodeId = parseInt(req.params.nodeId, 10);
      if (isNaN(nodeReq.nodeId)) {
        throw new BadRequestError("Invalid node ID");
      }
      const result = await handler(nodeReq, res);
      if (result && !res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  };

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

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const token = authHeader.substring(7);
    const payload = await services.internalNodeAuth.verifyToken(token, nodeId);
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
   * POST /api/nodes/:nodeId/auth/token
   * OAuth2 Client Credentials flow - Generate access token
   */
  router.post("/:nodeId/auth/token", nodeContext(async (req, res) => {
    const authHeader = req.headers.authorization;

    // Authentication for token endpoint MUST use Basic auth with client credentials,
    // https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      res.status(401).json({ error: "Authorization header missing or invalid" });
      return;
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
    const [clientId, clientSecret] = credentials.split(":");

    if (!clientId || !clientSecret) {
      throw new BadRequestError("Missing client_id or client_secret in Basic auth header");
    }
    if (req.body.grant_type !== "client_credentials") {
      throw new BadRequestError("Unsupported grant_type. Only 'client_credentials' is supported");
    }

    const tokenResponse = await req.services.internalNodeAuth.generateToken(
      req.nodeId, clientId, clientSecret
    );
    logger.info({ nodeId: req.nodeId, clientId }, "Generated access token for internal node");
    return tokenResponse;
  }));

  /**
   * GET /api/nodes/:nodeId/3/footprints
   * List product footprints (PACT v3)
   */
  router.get("/:nodeId/3/footprints", authenticateInternalNode, nodeContext(async (req, res) => {
    // Test Case #40: Reject legacy V2 $filter syntax
    if (req.query.$filter) {
      throw new BadRequestError("The $filter parameter is not supported. Use PACT v3 query parameters instead.");
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const parseArrayParam = (param: string | string[] | undefined): string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param;
      return param.split(',').map(s => s.trim());
    };

    const result = await req.services.internalNodePact.getFootprints(
      req.nodeId,
      {
        productId: parseArrayParam(req.query.productId as string | string[] | undefined),
        companyId: parseArrayParam(req.query.companyId as string | string[] | undefined),
        geography: parseArrayParam(req.query.geography as string | string[] | undefined),
        classification: parseArrayParam(req.query.classification as string | string[] | undefined),
        status: req.query.status as string | undefined,
        validOn: req.query.validOn as string | undefined,
        validAfter: req.query.validAfter as string | undefined,
        validBefore: req.query.validBefore as string | undefined,
      },
      { limit, offset }
    );

    const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
    const linkHeader = req.services.internalNodePact.buildLinkHeader(result.links, baseUrl);
    if (linkHeader) {
      res.set("Link", linkHeader);
    }

    return { data: result.data };
  }));

  /**
   * GET /api/nodes/:nodeId/3/footprints/:id
   * Get single product footprint by ID (PACT v3)
   */
  router.get("/:nodeId/3/footprints/:id", authenticateInternalNode, nodeContext(async (req) => {
    const footprint = await req.services.internalNodePact.getFootprintById(req.nodeId, req.params.id);
    if (!footprint) {
      throw new NotFoundError("Product footprint not found");
    }
    return { data: footprint };
  }));

  /**
   * POST /api/nodes/:nodeId/3/events
   * Handle PACT v3 events (Published, RequestCreated, RequestFulfilled, RequestRejected)
   */
  router.post("/:nodeId/3/events", authenticateInternalNode, nodeContext(async (req, res) => {
    if (!req.body.type || !req.body.specversion || !req.body.id || !req.body.source) {
      throw new BadRequestError("Invalid CloudEvents format. Missing required fields: type, specversion, id, or source");
    }

    logger.info({
      nodeId: req.nodeId,
      eventType: req.body.type,
      eventId: req.body.id,
      eventSource: req.body.source,
    }, "Received PACT event for internal node");

    await req.services.internalNodePact.handleEvent(req.nodeId, {
      type: req.body.type,
      specversion: req.body.specversion,
      id: req.body.id,
      source: req.body.source,
      time: req.body.time,
      data: req.body.data,
    });

    res.status(200).send();
  }));

  return router;
}
