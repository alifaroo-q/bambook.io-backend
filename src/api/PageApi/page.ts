import z from "zod";
import path from "path";
import multer from "multer";
import { randomBytes } from "crypto";
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
    cb(null, `${Date.now() + randomBytes(5).toString("hex")}-${fileName}`);
  },
});

const upload = multer({
  storage: storage,
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
  upload.fields([
    { name: "custom_logo", maxCount: 1 },
    { name: "footer_logo", maxCount: 1 },
  ]),
  NEW_PAGE_VALIDATORS,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
      const userId = req.user.toObject({ getters: true }).id;

    // @ts-ignore
    const custom_logo = req.files.custom_logo[0].filename;
    // @ts-ignore
    const footer_logo = req.files.footer_logo[0].filename;

    const pageData = {
      userId: userId,
      title: req.body.title,
      url: req.body.url,
      theme: req.body.theme,
      font_family: req.body.font_family,
      corner_styles: req.body.corner_styles,
      footer_toggle: req.body.footer_toggle,
      footer_config: req.body.footer_config,
      pagination_bg_color: req.body.pagination_bg_color,
      pagination_text_color: req.body.pagination_text_color,
      footer_logo: `${req.hostname}/uploads/${footer_logo}`,
      custom_logo: `${req.hostname}/uploads/${custom_logo}`,
    };

    const newPage = new PageModel(pageData);
    console.log(newPage);

    newPage
      .save()
      .then()
      .catch((error) => next(error));

    res.status(StatusCodes.CREATED).json(newPage);
  }
);

export default router;
