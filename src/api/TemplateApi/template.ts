import fs from "fs";
import z from "zod";
import path from "path";
import multer from "multer";
import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { unlink } from "fs/promises";
import { StatusCodes } from "http-status-codes";
import { check, validationResult, param } from "express-validator";
import express, { NextFunction, Request, Response } from "express";

import HttpError from "../../model/http-error.model";
import TemplateModel from "../../model/template.model";

const router = express.Router();
const UPLOADS = path.resolve(__dirname, "../../uploads") + "/";

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
    cb(null, `${randomBytes(10).toString("hex")}-${fileName}`);
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
  await unlink(UPLOADS + image);
};

const NEW_TEMPLATE_VALIDATORS = [
  check("url", "url value must be a string or it is missing")
    .isString()
    .notEmpty()
    .isURL({ require_protocol: false, require_tld: false }),
  check("font_family", "font_family value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check(
    "corner_styles",
    "corner_styles value must be a string or it is missing"
  )
    .isString()
    .notEmpty(),
  check("header", "header value must be true or false or it is missing")
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("pagination", "pagination value must be true or false or it is missing")
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("title", "title value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check("links", "links value must be a valid links array or it is missing")
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return linksArray.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
];

const ValidateCustomLogo = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.file && req.file.fieldname === "custom_logo") return next();
  return next(
    new HttpError(
      "custom_logo must be image or it is missing",
      StatusCodes.UNPROCESSABLE_ENTITY
    )
  );
};

router.post(
  "/",
  upload.single("custom_logo"),
  ValidateCustomLogo,
  NEW_TEMPLATE_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      await unlink(UPLOADS + req.file.filename);
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    const templateData = {
      url: req.body.url,
      font_family: req.body.font_family,
      corner_styles: req.body.corner_styles,
      header: req.body.header,
      pagination: req.body.pagination,
      title: req.body.title,
      links: req.body.links,
      userId: userId,
      custom_logo: `${req.hostname}/uploads/${req.file.filename}`,
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

router.get("/all/min", (req, res, next) => {
  TemplateModel.find()
    .select({ url: 1, title: 1 })
    .exec()
    .then((templates) => {
      return res.status(StatusCodes.OK).json(templates);
    })
    .catch(() => {
      return next(
        new HttpError("Something went wrong", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    });
});

router.get("/user/all", (req, res, next) => {
  // @ts-ignore
  const userId = req.user.toObject({ getters: true }).id;

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

router.get(
  "/one/:templateId",
  param("templateId", "Wrong template id, please try again")
    .isString()
    .custom((templateId) => {
      return mongoose.Types.ObjectId.isValid(templateId);
    }),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

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
  }
);

router.delete(
  "/:templateId",
  param("templateId", "Wrong template id, please try again")
    .isString()
    .custom((templateId) => {
      return mongoose.Types.ObjectId.isValid(templateId);
    }),
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { templateId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const template = await TemplateModel.findById(templateId).exec();
      if (!template) {
        return next(
          new HttpError(
            "Template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (template.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot delete template, only user who created template can delete it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const custom_logo = template.custom_logo.split("/").at(-1);

      fs.access(UPLOADS + custom_logo, fs.constants.F_OK, async (error) => {
        console.log(error)
        if (!error) await unlink(UPLOADS + custom_logo);
      });

      await TemplateModel.deleteOne({ _id: templateId }).exec();

      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Template Deleted" });
    } catch (error) {
      console.log(error)
      return next(
        new HttpError(
          "Template does not exist or something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.delete("/user/all", async (req, res, next) => {
  // @ts-ignore
  const userId = req.user.toObject({ getters: true }).id;

  const templates = await TemplateModel.find({ userId: userId }).exec();

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
    })
    .catch((error) => {
      return next(error);
    });

  try {
    let allImagesPath: string[] = [];

    templates.forEach((template) => {
      allImagesPath.push(`${UPLOADS}${template.custom_logo.split("/").at(-1)}`);
    });

    const allImagesDelete = allImagesPath.map((imagePath) => unlink(imagePath));
    Promise.all(allImagesDelete);
  } catch (error) {
    return next(error);
  }

  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Template(s) Deleted" });
});

const UPDATE_TEMPLATE_VALIDATORS = [
  check("url", "url value must be a valid url")
    .optional()
    .isString()
    .notEmpty()
    .isURL({ require_protocol: false, require_tld: false }),
  check("font_family", "font_family value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("corner_styles", "corner_styles value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("header", "header value must be true or false")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("pagination", "pagination value must be true or false")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("title", "title value is missing").optional().isString().notEmpty(),
  check("links", "links value must be a valid links array or it is missing")
    .optional()
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return linksArray.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
];

const ValidatePatchRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestMap = [
    "url",
    "font_family",
    "corner_styles",
    "title",
    "header",
    "links",
    "pagination",
  ];
  const request = Object.keys(req.body);
  const result = request.every((val) => requestMap.includes(val));

  if (result) return next();
  else {
    if (req.file && req.file.fieldname === "custom_logo") {
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
  "/:templateId",
  upload.single("custom_logo"),
  param("templateId", "Wrong template id, please try again")
    .isString()
    .custom((templateId) => {
      return mongoose.Types.ObjectId.isValid(templateId);
    }),
  ValidatePatchRequest,
  UPDATE_TEMPLATE_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      await deleteImage(req.file.filename);
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { templateId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const template = await TemplateModel.findById(templateId).exec();
      if (!template) {
        await deleteImage(req.file.filename);
        return next(
          new HttpError(
            "Template with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (template.userId.toString() !== userId) {
        await deleteImage(req.file.filename);
        return next(
          new HttpError(
            "Cannot update template, only user who created template can update it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      let data = {
        ...req.body,
      };

      if (req.file && req.file.fieldname === "custom_logo") {
        const custom_logo = template.custom_logo.split("/").at(-1);
        await deleteImage(custom_logo);
        data["custom_logo"] = `${req.hostname}/uploads/${req.file.filename}`;
      }

      await TemplateModel.updateOne({ _id: templateId }, data)
        .exec()
        .then((template) => {
          if (template.acknowledged) {
            return res
              .status(StatusCodes.OK)
              .json({ success: true, message: "Template Updated" });
          } else {
            return next(
              new HttpError(
                "Template update failed, something went wrong",
                StatusCodes.INTERNAL_SERVER_ERROR
              )
            );
          }
        });
    } catch (error) {
      return next(
        new HttpError(
          "Template update failed, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

export default router;
