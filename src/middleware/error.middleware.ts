import { NextFunction, Request, Response } from "express";
import HttpError from "../model/http-error.model";
import { StatusCodes } from "http-status-codes";

const ErrorMiddleware = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.httpCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    stack:
      process.env.NODE_ENV !== "dev"
        ? null
        : err.stack || "An unknown error occurred!",
  });
};

export default ErrorMiddleware;
