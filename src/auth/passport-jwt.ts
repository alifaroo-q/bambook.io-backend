import passport from "passport";
import { ExtractJwt, Strategy, VerifiedCallback } from "passport-jwt";

import User from "../model/user.model";
import { Request } from "express";

passport.use(
  new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ["HS256"],
      passReqToCallback: true,
    },
    async (req: Request, jwtPayload: any, done: VerifiedCallback) => {
      try {
        const user = await User.findById(jwtPayload.sub);
        if (user) {
          req.user = user;
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
