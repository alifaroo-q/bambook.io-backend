import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import User from "../model/user.model";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, cb) => {
      const defaultUser = {
        fullName: `${profile.name.givenName} ${profile.name.familyName}`,
        email: profile.emails[0].value,
        picture: profile.photos[0].value,
        googleId: profile.id,
      };

      try {
        const user = await User.findOne({ googleId: profile.id }).exec();
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