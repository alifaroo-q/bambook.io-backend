import z from "zod";
import multer from "multer";
import express, { NextFunction, Request, Response } from "express";
import HttpError from "../../model/http-error.model";
import path from "path";
import { fileURLToPath } from "url";
import { StatusCodes } from "http-status-codes";
import { check, validationResult } from "express-validator";

import TemplateModel from "../../model/template.model";
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const linkSchema = z.object({
  title: z.string(),
  url: z.string(),
});

const linksArray = z.array(linkSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, "../../../src/uploads"));
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
          "Only .png, .jpg and .jpeg format allowed",
          StatusCodes.UNSUPPORTED_MEDIA_TYPE
        )
      );
    }
  },
});

const NEW_TEMPLATE_VALIDATORS = [
  check("url").isString().notEmpty(),
  check("font_family").isString().notEmpty(),
  check("corner_styles").isString().notEmpty(),
  check("header").isBoolean().notEmpty(),
  check("title").isString().notEmpty(),
  check("links")
    .isString()
    .customSanitizer((value) => {
      const payload: [] = JSON.parse(value);
      return linksArray.parse(payload);
    }),
];

router.post(
  "/",
  upload.single("custom_logo"),
  NEW_TEMPLATE_VALIDATORS,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(
        new HttpError(
          "Wrong data provided, please check your data and try again",
          StatusCodes.UNPROCESSABLE_ENTITY
        )
      );
    }

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;
    let custom_logo: string | null;
    if (req.file) {
      custom_logo = `${req.protocol}://${req.hostname}:${process.env.PORT}/uploads/${req.file.filename}`;
    }

    const newTemplate = new TemplateModel(req.body);
    newTemplate.userId = userId;
    newTemplate.custom_logo = custom_logo;

    newTemplate
      .save()
      .then()
      .catch((error) => next(error));
    return res.json(newTemplate.toJSON());
  }
);

router.get("/", (req, res, next) => {
  TemplateModel.find()
    .exec()
    .then((template) => {
      return res.json(template);
    })
    .catch(() => {
      return next(
        new HttpError("Something went wrong", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    });
});

router.get("/user/:userId", (req, res, next) => {
  const { userId } = req.params;

  TemplateModel.find({ userId: userId })
    .exec()
    .then((templates) => {
      if (!templates)
        return next(
          new HttpError(
            "template(s) with provided user id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.json(templates);
    })
    .catch((error) => {
      return next(error);
    });
});

router.get("/:templateId", (req, res, next) => {
  const { templateId } = req.params;

  TemplateModel.findById(templateId)
    .exec()
    .then((template) => {
      if (!template)
        return next(
          new HttpError(
            "template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.json(template);
    })
    .catch((error) => {
      return next(error);
    });
});

router.delete("/:templateId", (req, res, next) => {
  const { templateId } = req.params;

  TemplateModel.findByIdAndDelete(templateId)
    .exec()
    .then((template) => {
      if (!template)
        return next(
          new HttpError(
            "template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.json(template);
    })
    .catch((error) => {
      return next(error);
    });
});

router.delete("/user/:userId", (req, res, next) => {
  const { userId } = req.params;

  TemplateModel.deleteMany({ userId: userId })
    .exec()
    .then((templates) => {
      if (templates.deletedCount === 0)
        return next(
          new HttpError(
            "template(s) with provided user id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.json(templates);
    })
    .catch((error) => {
      return next(error);
    });
});

export default router;
