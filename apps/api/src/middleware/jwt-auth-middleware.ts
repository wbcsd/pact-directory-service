import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "@src/util/logger";
import config from "@src/common/config";
import HttpStatusCodes from "@src/common/HttpStatusCodes";

const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ message: "Token missing or malformed" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    res.locals.user = decoded;
    next();
  } catch (error) {
    logger.error("jwtAuthMiddleware error", error);
    res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });

    return;
  }
};

export default jwtAuthMiddleware;
