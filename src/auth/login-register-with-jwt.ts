import fs from "fs";
import path from "path";
import multer from "multer";
import { unlink } from "fs/promises";
import { randomBytes } from "crypto";
import { StatusCodes } from "http-status-codes";
import { check, validationResult } from "express-validator";
import express, { NextFunction, Request, Response } from "express";

import User from "../model/user.model";
import HttpError from "../model/http-error.model";

import { validateHash } from "../util/validateHash";
import { hashPassword } from "../util/hashPassword";
import issueRefreshToken from "../util/issueRefreshToken";
import issueAccessToken from "../util/issueAccessToken";
import JWTAuthMiddleware from "../middleware/jwt-auth.middleware";

const router = express.Router();

const UPLOADS = path.resolve(__dirname, "../uploads") + "/";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, `${randomBytes(10).toString("hex")}-profile-${fileName}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(
        new HttpError(
          "Only .png, .jpg and .jpeg image format allowed",
          StatusCodes.UNSUPPORTED_MEDIA_TYPE
        )
      );
    }
  },
});

const deleteImage = async (image: string) => {
  fs.access(UPLOADS + image, fs.constants.F_OK, async (error) => {
    if (!error) await unlink(UPLOADS + image);
  });
};

const LOGIN_VALIDATORS = [
  check("email", "please enter a valid email address")
    .normalizeEmail()
    .isEmail(),
  check("password", "please enter a valid password").notEmpty(),
];

router.post(
  "/login",
  LOGIN_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { email, password } = req.body;
    let user: any;

    try {
      user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "User not found for provided email address",
        });
      }
    } catch (error) {
      next(
        new HttpError(
          "Cannot login, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const isValidPassword = validateHash(password, user.password);

    if (!isValidPassword) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Wrong password, please try again",
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
          maxAge: 7 * 24 * 60 * 60 * 1000,
          secure: true,
          sameSite: "none",
        }
      )
      .json(accessJwt);
  }
);

const SIGNUP_VALIDATORS = [
  check("email", "please enter a valid email address")
    .isString()
    .notEmpty()
    .normalizeEmail()
    .isEmail(),
  check("password", "password must be at least 8 characters")
    .isString()
    .notEmpty()
    .isLength({
      min: 8,
    }),
  check("fullName", "name must be at least 3 characters")
    .isString()
    .notEmpty()
    .isLength({
      min: 3,
    }),
  check("isAdmin", "isAdmin value must be true or false or it is missing")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("isPublic", "public value must be true or false or it is missing")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("phone", "phone must be at least 8 characters")
    .isString()
    .notEmpty()
    .isLength({
      min: 8,
    }),
];

const ValidateImage = (req: Request, res: Response, next: NextFunction) => {
  if (req.file && req.file.fieldname === "image") {
    return next();
  }
  return next(
    new HttpError(
      "image must be a valid image or it is missing",
      StatusCodes.UNPROCESSABLE_ENTITY
    )
  );
};

router.post(
  "/signup",
  upload.single("image"),
  ValidateImage,
  SIGNUP_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      await deleteImage(req.file.filename);
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { email, password, fullName, isAdmin, isPublic, phone } = req.body;

    const existingUser = await User.findOne({ email: email }).exec();

    if (existingUser) {
      await deleteImage(req.file.filename);
      return next(
        new HttpError(
          "User with provided email already exist, please try another email address",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      email,
      password: hashedPassword,
      fullName,
      isAdmin,
      isPublic,
      phone,
      image: `${req.hostname}/uploads/${req.file.filename}`,
    });

    try {
      await newUser.save();
      res.status(StatusCodes.CREATED).json({ success: true, user: newUser });
    } catch (error) {
      await deleteImage(req.file.filename);
      return next(
        new HttpError(
          "Cannot register new user, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.delete(
  "/user/delete",
  JWTAuthMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const user = await User.findById(userId).exec();
      if (!user) {
        return next(new HttpError("User not found", StatusCodes.NOT_FOUND));
      }

      const image = user.image.split("/")[2];

      await deleteImage(image);
      await User.deleteOne({ _id: userId }).exec();

      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "User Deleted" });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot delete user, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

const UPDATE_VALIDATORS = [
  check("email", "please enter a valid email address")
    .optional()
    .isString()
    .notEmpty()
    .normalizeEmail()
    .isEmail(),
  check("password", "password must be at least 8 characters")
    .optional()
    .isString()
    .notEmpty()
    .isLength({
      min: 8,
    }),
  check("fullName", "name must be at least 3 characters")
    .optional()
    .isString()
    .notEmpty()
    .isLength({
      min: 3,
    }),
  check("isAdmin", "isAdmin value must be true or false or it is missing")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("isPublic", "public value must be true or false or it is missing")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("phone", "phone must be at least 8 characters")
    .optional()
    .isString()
    .notEmpty()
    .isLength({
      min: 8,
    }),
];

const ValidateUpdateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestMap = [
    "email",
    "password",
    "fullName",
    "isAdmin",
    "isPublic",
    "phone",
  ];
  const request = Object.keys(req.body);
  const result = request.every((val) => requestMap.includes(val));

  if (result) {
    return next();
  } else {
    if (req.file && req.file.fieldname === "image") {
      await deleteImage(req.file.filename);
    }
    return next(
      new HttpError(
        "Unknown field detected, please only enter valid field(s)",
        StatusCodes.BAD_REQUEST
      )
    );
  }
};

router.patch(
  "/user/update",
  JWTAuthMiddleware,
  upload.single("image"),
  ValidateUpdateRequest,
  UPDATE_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      req.file.fieldname === "image" && (await deleteImage(req.file.filename));
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const user = await User.findById(userId).exec();
      if (!user) {
        await deleteImage(req.file.filename);
        return next(new HttpError("User not found", StatusCodes.NOT_FOUND));
      }

      let data = {
        ...req.body,
      };

      if (req.file && req.file.fieldname === "image") {
        const old_image = user.image.split("/")[2];
        await deleteImage(old_image);
        data["image"] = `${req.hostname}/uploads/${req.file.filename}`;
      }

      await User.updateOne({ _id: userId }, data)
        .exec()
        .then((user) => {
          if (user.acknowledged) {
            return res
              .status(StatusCodes.OK)
              .json({ success: true, message: "User Updated" });
          } else {
            return next(
              new HttpError(
                "Cannot update user, something went wrong",
                StatusCodes.INTERNAL_SERVER_ERROR
              )
            );
          }
        });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot update user, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);
export default router;
