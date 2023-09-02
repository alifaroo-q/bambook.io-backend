import express from "express";
import passport from "passport";

import issueAccessToken from "../util/issueAccessToken";
import issueRefreshToken from "../util/issueRefreshToken";

const router = express.Router();

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const errorLoginUrl = `${clientUrl}/login/error`;

router.get(
  "/login/facebook",
  passport.authenticate("facebook", {
    // scope: ["public_profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureMessage: "Cannot login using facebook, try again later",
    failureRedirect: errorLoginUrl,
    passReqToCallback: true,
    session: false,
  }),
  async (req, res) => {
    const accessToken = issueAccessToken(req.user);
    const refreshToken = issueRefreshToken(req.user);

    res
      .cookie(
        "jwt",
        { access: accessToken.token, refresh: refreshToken },
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "dev" ? false : true,
        }
      )
      .json({ accessToken });
  }
);

export default router;
