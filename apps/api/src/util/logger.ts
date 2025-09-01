import config from "@src/common/config";
import pino from "pino";
import pinoHttp from "pino-http";

const pinoInstance = pino({
  ...(config.NODE_ENV !== "production"
    ? {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }
    : { level: "info" }),
});

const wrap =
  (method: "info" | "error" | "warn" | "debug") =>
  (message: any, meta?: unknown) => {
    if (meta) {
      pinoInstance[method](meta, message);
    } else {
      pinoInstance[method](message);
    }
  };

const logger = config.LOG_OUTPUT === "console" ? console : {
  info: wrap("info"),
  error: wrap("error"),
  warn: wrap("warn"),
  debug: wrap("debug"),
};

const loggerMiddleware = config.LOG_OUTPUT === "console" ? 
  (req: any, res: any, next: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    next();
  } : 
  pinoHttp({ logger: pinoInstance });

export { loggerMiddleware };
export default logger;
