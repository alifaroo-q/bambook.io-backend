import z from "zod";
import path from "path";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { check, validationResult } from "express-validator";
import express, { NextFunction, Request, Response } from "express";

import PageModel from "../../model/page.model";
import HttpError from "../../model/http-error.model";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, "../../uploads"));
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, `custom_logo-${Date.now()}-${fileName}`);
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

const themeSchema = z.object({
  type: z.string(),
  header_color: z.string(),
  subheader_color: z.string(),
  bg_color: z.string(),
  links_color: z.string(),
  toggle_mode: z.boolean(),
  default_mode: z.string(),
});

const navLinkSchema = z.object({
  link_title: z.string(),
  link_url: z.string(),
});

const navigationItemSchema = z.object({
  section_title: z.string(),
  links: z.array(navLinkSchema),
});

const footerConfigSchema = z.object({
  copyright_text: z.string(),
  copyright_color: z.string(),
  links_color: z.string(),
  bg_color: z.string(),
  navigation: z.array(navigationItemSchema),
});

const NEW_PAGE_VALIDATORS = [
  check("title", "title value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check("url", "url value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check("font_family", "font_family value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check(
    "corner_styles",
    "corner_styles value must be a string or it is missing"
  )
    .isString()
    .notEmpty(),
  check(
    "footer_toggle",
    "footer_toggle value must be a string or it is missing"
  )
    .isString()
    .toBoolean(),
  check(
    "pagination_bg_color",
    "pagination_bg_color value must be a string or it is missing"
  )
    .isString()
    .notEmpty(),
  check(
    "pagination_text_color",
    "pagination_text_color value must be a string or it is missing"
  )
    .isString()
    .notEmpty(),
  check("theme", "theme value must a valid theme object or it is missing")
    .isString()
    .customSanitizer((value) => {
      const payload: [] = JSON.parse(value);
      return themeSchema.parse(payload);
    }),
  check(
    "footer_config",
    "footer_config value must a valid footer_config object or it is missing"
  )
    .isString()
    .customSanitizer((value) => {
      const payload: [] = JSON.parse(value);
      return footerConfigSchema.parse(payload);
    }),
];

router.post(
  "/",
  upload.none(),
  NEW_PAGE_VALIDATORS,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
    //   const userId = req.user.toObject({ getters: true }).id;

    const newPage = new PageModel(req.body);
    console.log(newPage);

    newPage
      .save()
      .then()
      .catch((error) => next(error));

    res.json(newPage);
  }
);

export default router;
