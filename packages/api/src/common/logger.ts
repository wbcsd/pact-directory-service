import config from '@src/common/config';
import pino from 'pino';
import pinoHttp from 'pino-http';

const pinoInstance = pino({
  ...(config.NODE_ENV !== 'production'
    ? {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    }
    : { level: 'info' }),
});

const wrap =
  (method: 'info' | 'error' | 'warn' | 'debug') =>
    (message: any, meta?: unknown) => {
      if (meta) {
        pinoInstance[method](meta, message);
      } else {
        pinoInstance[method](message);
      }
    };

const logger = {
  info: config.LOG_OUTPUT === 'console' ? console.info : wrap('info'),
  error: config.LOG_OUTPUT === 'console' ? console.error : wrap('error'),
  warn: config.LOG_OUTPUT === 'console' ? console.warn : wrap('warn'),
  debug: config.LOG_OUTPUT === 'console' ? console.debug : wrap('debug'),
};

const loggerMiddleware =
  config.LOG_OUTPUT === 'console'
    ? (req: any, res: any, next: any) => {
      next();
    }
    : pinoHttp({ logger: pinoInstance });

export { loggerMiddleware, };
export default logger;
