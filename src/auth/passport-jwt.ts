import passport from "passport";
import { ExtractJwt, Strategy, VerifiedCallback } from "passport-jwt";

import User from "../model/user.model";
import { Request } from "express";
import HttpError from "../model/http-error.model";
import { StatusCodes } from "http-status-codes";

const cookieExtractor = function (req: Request) {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["jwt"];
  }
  return token;
};

passport.use(
  new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
      ]),
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ["HS256"],
      passReqToCallback: true,
    },
    async (req: Request, jwtPayload: any, done: VerifiedCallback) => {
      if (Date.now() >= jwtPayload.exp) {
        return done(
          new HttpError(
            "Access token expired, please login again",
            StatusCodes.UNAUTHORIZED
          ),
          false
        );
      }

      try {
        const user = await User.findById(jwtPayload.sub);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (err) {
        console.error("Something went wrong", err);
        return done(err, false);
      }
    }
  )
);
