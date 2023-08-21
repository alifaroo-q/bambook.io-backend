import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";

import User from "../model/user.model";

const callBackURL = process.env.SERVER_URL + "/auth/facebook/callback";

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: callBackURL,
      passReqToCallback: true,
      profileFields: [
        "id",
        "email",
        "gender",
        "profileUrl",
        "displayName",
        "locale",
        "name",
        "timezone",
        "updated_time",
        "verified",
        "picture.type(large)",
      ],
    },
    async (req, accessToken, refreshToken, profile, cb) => {
      const defaultUser = {
        fullName: profile.displayName,
        facebookId: profile.id,
      };

      try {
        const user = await User.findOne({ facebookId: profile.id }).exec();
        if (!user) {
          const newUser = new User(defaultUser);
          await newUser.save();
          cb(null, newUser);
        }
        cb(null, user);
      } catch (error) {
        console.error("Something went wrong during signup process", error);
        cb(error, null);
      }
    }
  )
);
