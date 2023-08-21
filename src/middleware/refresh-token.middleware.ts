import { StatusCodes } from "http-status-codes";
import { NextFunction, Request, Response } from "express";
import jwt, { VerifyErrors, JwtPayload } from "jsonwebtoken";

import HttpError from "../model/http-error.model";

const RefreshTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies["jwt"].refresh;
  jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET,
    (error: VerifyErrors, decoded: JwtPayload) => {
      if (error) {
        return next(
          new HttpError("Wrong refresh token", StatusCodes.UNAUTHORIZED)
        );
      } else {
        const payload = {
          sub: decoded.sub,
          iat: Date.now(),
        };
        const expiresInMS = 1 * 24 * 60 * 60 * 1000; // days * hours * minutes * seconds * milliseconds

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: expiresInMS,
          algorithm: "HS256",
        });

        res
          .status(StatusCodes.OK)
          .json({ accessToken: `Bearer ${accessToken}` });
      }
    }
  );
};

export default RefreshTokenMiddleware;
