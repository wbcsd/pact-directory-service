/**
 * Custom error classes for the REST API
 * These errors are handled by the error middleware in middleware/context.ts
 */

export class NotFoundError extends Error {
  code = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.message = message;
  }
}

export class BadRequestError extends Error {
  code = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
    this.message = message;
  }
}

export class ConflictError extends Error {
  code = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    this.message = message;
  }
}

export class ValidationError extends Error {
  code = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.message = message;
  }
}

export class UnauthorizedError extends Error {
  code = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
    this.message = message;
  }
}

export class ForbiddenError extends Error {
  code = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
    this.message = message;
  }
}
