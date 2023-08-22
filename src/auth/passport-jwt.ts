import passport from "passport";
import { Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ExtractJwt, Strategy, VerifiedCallback } from "passport-jwt";

import User from "../model/user.model";
import HttpError from "../model/http-error.model";

const cookieExtractor = function (req: Request) {
  let token = null;
  if (req && req.cookies && req.cookies["jwt"]) {
    token = req.cookies["jwt"].access;
  }
  return token;
};

passport.use(
  new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
        cookieExtractor,
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
