import { StatusCodes } from "http-status-codes";
import { NextFunction, Request, Response } from "express";
import HttpError from "../model/http-error.model";

const RouteNotFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return next(
    new HttpError("Could not find provided route", StatusCodes.NOT_FOUND)
  );
};

export default RouteNotFoundMiddleware;
