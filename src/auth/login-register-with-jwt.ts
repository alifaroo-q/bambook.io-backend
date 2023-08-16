import express from "express";
import { StatusCodes } from "http-status-codes";

import User from "../model/user.model";

import issueJWT from "../util/issueJWT";
import { validateHash } from "../util/validateHash";
import { hashPassword } from "../util/hashPassword";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found or wrong credentials",
      });
    }

    const isValidPassword = await validateHash(password, user.password);

    if (isValidPassword) {
      const jwt = issueJWT(user);
      return res
        .status(StatusCodes.OK)
        .json({ success: true, user, token: jwt, expiresIn: jwt.expires });
    } else {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Wrong credentials, please try again",
      });
    }
  } catch (error) {
    console.error("Something went wrong, please try again", error);
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  const { email, password }: { email: string; password: string } = req.body;

  const newUser = new User({
    email,
    password: hashPassword(password),
  });

  try {
    await newUser.save();
    const { token, expires } = issueJWT(newUser);

    res
      .status(StatusCodes.OK)
      .json({ success: true, user: newUser, token, expiresIn: expires });
  } catch (error) {
    console.error("Can't register new user, something went wrong", error);
    next(error);
  }
});

export default router;
