import { ErrorRequestHandler } from 'express';

export class ApiError extends Error {

  public status: number;
  public code: string;
  public message: string;

  constructor(status: number, code: string, message?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  toJSON() {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
    }
  }

}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (!(err instanceof ApiError)) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      err = new ApiError(500, 'internal_server_error');
    } else {
      err = new ApiError(500, 'internal_server_error', err.stack || 'unknown');
    }
  }
  res.status(err.status).json(err);
};
