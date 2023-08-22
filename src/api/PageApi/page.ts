import z from "zod";
import path from "path";
import multer from "multer";
import mongoose from "mongoose";
import { unlink } from "fs/promises";
import { randomBytes } from "crypto";
import { StatusCodes } from "http-status-codes";
import { check, param, validationResult } from "express-validator";
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

const ValidateImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // @ts-ignore
  const custom_logo = req.files.custom_logo ? req.files.custom_logo[0].filename : null;
  // @ts-ignore
  const footer_logo = req.files.footer_logo ? req.files.footer_logo[0].filename : null;

  const imagePath = path.resolve(__dirname, "../../uploads") + "/";
  const error = new HttpError(
    "custom_logo and footer_logo, both are required",
    StatusCodes.BAD_REQUEST
  );

  try {
    if (custom_logo) {
      if (footer_logo) {
        return next();
      } else {
        await unlink(imagePath + custom_logo);
        return next(error);
      }
    } else {
      if (footer_logo) {
        await unlink(imagePath + footer_logo);
        return next(error);
      }
    }
    return next(error);
  } catch (error) {
    return next(error);
  }
};

router.post(
  "/",
  upload.fields([
    { name: "custom_logo", maxCount: 1 },
    { name: "footer_logo", maxCount: 1 },
  ]),
  ValidateImages,
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

    newPage
      .save()
      .then()
      .catch((error) => next(error));

    res.status(StatusCodes.CREATED).json(newPage);
  }
);

router.get("/all", (req, res, next) => {
  PageModel.find()
    .exec()
    .then((page) => {
      return res.status(StatusCodes.OK).json(page);
    })
    .catch(() => {
      return next(
        new HttpError("Something went wrong", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    });
});

router.get("/all/min", (req, res, next) => {
  PageModel.find()
    .select({ url: 1, title: 1 })
    .exec()
    .then((pages) => {
      return res.status(StatusCodes.OK).json(pages);
    })
    .catch(() => {
      return next(
        new HttpError("Something went wrong", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    });
});

router.get(
  "/user/:userId",
  param("userId", "Wrong user id, please try again")
    .isString()
    .custom((userId) => {
      return mongoose.Types.ObjectId.isValid(userId);
    }),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { userId } = req.params;

    PageModel.find({ userId: userId })
      .exec()
      .then((page) => {
        if (!page)
          return next(
            new HttpError(
              "Page(s) with provided user id not found",
              StatusCodes.NOT_FOUND
            )
          );
        return res.status(StatusCodes.OK).json(page);
      })
      .catch((error) => {
        return next(error);
      });
  }
);

router.get(
  "/:pageId",
  param("pageId", "Wrong page id, please try again")
    .isString()
    .custom((pageId) => {
      return mongoose.Types.ObjectId.isValid(pageId);
    }),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { pageId } = req.params;

    PageModel.findById(pageId)
      .exec()
      .then((page) => {
        if (!page)
          return next(
            new HttpError(
              "Page with provided id not found",
              StatusCodes.NOT_FOUND
            )
          );
        return res.status(StatusCodes.OK).json(page);
      })
      .catch((error) => {
        return next(error);
      });
  }
);

router.delete(
  "/:pageId",
  param("pageId", "Wrong page id, please try again")
    .isString()
    .custom((pageId) => {
      return mongoose.Types.ObjectId.isValid(pageId);
    }),
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { pageId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const page = await PageModel.findById(pageId).exec();
      if (!page)
        return next(
          new HttpError(
            "Template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );

      if (page.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot delete page, only user who created page can delete it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const imagePath = path.resolve(__dirname, "../../uploads") + "/";

      const custom_logo = imagePath + page.custom_logo.split("/").at(-1);
      const footer_logo = imagePath + page.footer_logo.split("/").at(-1);

      const images = [custom_logo, footer_logo];

      const imagesDeletePromise = images.map((image) => unlink(image));
      Promise.all(imagesDeletePromise);
      await PageModel.deleteOne({ _id: pageId }).exec();

      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Page Deleted" });
    } catch (error) {
      return next(
        new HttpError(
          "Page does not exist or something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.delete(
  "/user/:userId",
  param("userId", "Wrong user id, please try again")
    .isString()
    .custom((userId) => {
      return mongoose.Types.ObjectId.isValid(userId);
    }),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { userId } = req.params;

    PageModel.deleteMany({ userId: userId })
      .exec()
      .then((pages) => {
        if (pages.deletedCount === 0)
          return next(
            new HttpError(
              "Page(s) with provided user id not found",
              StatusCodes.NOT_FOUND
            )
          );
        return res
          .status(StatusCodes.OK)
          .json({ success: true, message: "Page(s) Deleted" });
      })
      .catch((error) => {
        return next(error);
      });
  }
);

export default router;
