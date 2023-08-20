import z from "zod";
import path from "path";
import multer from "multer";
import { randomBytes } from "crypto";
import { StatusCodes } from "http-status-codes";
import { check, validationResult } from "express-validator";
import express, { NextFunction, Request, Response } from "express";

import TemplateModel from "../../model/template.model";
import HttpError from "../../model/http-error.model";

const router = express.Router();

const linkSchema = z.object({
  title: z.string(),
  url: z.string(),
});

const linksArray = z.array(linkSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, "../../uploads"));
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, `${randomBytes(5).toString("hex")}-${fileName}`);
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

const NEW_TEMPLATE_VALIDATORS = [
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
  check("header", "header value must be a string or it is missing")
    .isString()
    .toBoolean(),
  check("title", "title value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check("links", "links value must a valid links array or it is missing")
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
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    let custom_logo: string | null;
    if (req.file) {
      custom_logo = `${req.hostname}/uploads/${req.file.filename}`;
    }

    const templateData = {
      url: req.body.url,
      font_family: req.body.font_family,
      corner_styles: req.body.corner_styles,
      header: req.body.header,
      title: req.body.title,
      links: req.body.links,
      userId: userId,
      custom_logo: custom_logo,
    };

    const newTemplate = new TemplateModel(templateData);

    newTemplate
      .save()
      .then()
      .catch((error) => next(error));
    return res.status(StatusCodes.CREATED).json(newTemplate.toJSON());
  }
);

router.get("/all", (req, res, next) => {
  TemplateModel.find()
    .exec()
    .then((template) => {
      return res.status(StatusCodes.OK).json(template);
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
            "Template(s) with provided user id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.status(StatusCodes.OK).json(templates);
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
            "Template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.status(StatusCodes.OK).json(template);
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
            "Template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Template Deleted" });
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
            "Template(s) with provided user id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Template(s) Deleted" });
    })
    .catch((error) => {
      return next(error);
    });
});

export default router;
