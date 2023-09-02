import express from "express";
import passport from "passport";

import issueAccessToken from "../util/issueAccessToken";
import issueRefreshToken from "../util/issueRefreshToken";

const router = express.Router();

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const errorLoginUrl = `${clientUrl}/login/error`;

router.get(
  "/login/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureMessage: "Cannot login using google, try again later",
    failureRedirect: errorLoginUrl,
    passReqToCallback: true,
    session: false,
  }),
  async (req, res) => {
    const accessToken = issueAccessToken(req.user);
    const refreshToken = issueRefreshToken(req.user);

    res
      .cookie("jwt", { access: accessToken.token, refresh: refreshToken })
      .json({ accessToken });
  }
);

export default router;
