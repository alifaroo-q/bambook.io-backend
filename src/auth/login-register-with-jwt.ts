import { StatusCodes } from "http-status-codes";
import { check, validationResult } from "express-validator";
import express, { NextFunction, Request, Response } from "express";

import User from "../model/user.model";
import HttpError from "../model/http-error.model";

import { validateHash } from "../util/validateHash";
import { hashPassword } from "../util/hashPassword";
import issueRefreshToken from "../util/issueRefreshToken";
import issueAccessToken from "../util/issueAccessToken";

const router = express.Router();

const LOGIN_VALIDATORS = [
  check("email").normalizeEmail().isEmail(),
  check("password").notEmpty(),
];

router.post(
  "/login",
  LOGIN_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(
        new HttpError(
          "Wrong credentials provided, please check your credentials and try again",
          StatusCodes.UNPROCESSABLE_ENTITY
        )
      );
    }

    const { email, password } = req.body;
    let user: any;

    try {
      user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "User not found or wrong credentials",
        });
      }
    } catch (error) {
      console.error("Something went wrong, please try again", error);
      next(error);
    }

    const isValidPassword = validateHash(password, user.password);

    if (!isValidPassword) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Wrong credentials, please try again",
      });
    }

    const accessToken = issueAccessToken(user);
    const accessJwt = {
      ...accessToken,
      token: `Bearer ${accessToken.token}`,
    };

    const refreshToken = issueRefreshToken(user);

    return res
      .cookie(
        "jwt",
        { access: accessToken.token, refresh: refreshToken },
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "dev" ? false : true,
        }
      )
      .json(accessJwt);
  }
);

const SIGNUP_VALIDATORS = [
  check("email").normalizeEmail().isEmail(),
  check("password").isLength({ min: 8 }),
];

router.post(
  "/signup",
  SIGNUP_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(
        new HttpError(
          "Wrong credentials provided, please check your credentials and try again",
          StatusCodes.UNPROCESSABLE_ENTITY
        )
      );
    }

    const { email, password }: { email: string; password: string } = req.body;

    const existingUser = await User.findOne({ email: email }).exec();

    if (existingUser) {
      return next(
        new HttpError(
          "User with provided email already exist, please try another email",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      email,
      password: hashedPassword,
    });

    try {
      await newUser.save();
      res.status(StatusCodes.CREATED).json({ success: true, user: newUser });
    } catch (error) {
      console.error("Cannot register new user, something went wrong", error);
      next(error);
    }
  }
);

export default router;
