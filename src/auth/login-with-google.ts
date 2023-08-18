import express from "express";
import passport from "passport";
import issueJWT from "../util/issueJWT";

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
    const { token } = issueJWT(req.user);
    res
      .cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "dev" ? false : true,
      })
      .redirect(clientUrl);
  }
);

export default router;
