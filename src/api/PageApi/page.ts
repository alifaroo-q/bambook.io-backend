import z from "zod";
import fs from "fs";
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
const UPLOADS = path.resolve(__dirname, "../../uploads") + "/";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, "../../uploads"));
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, `${Date.now() + randomBytes(10).toString("hex")}-${fileName}`);
  },
});

const upload = multer({
  storage: storage,
});

const deleteImage = async (image: string) => {
  fs.access(UPLOADS + image, fs.constants.F_OK, async (error) => {
    if (!error) await unlink(UPLOADS + image);
  });
};

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
  check("description", "description value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check("icon", "icon value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check("templateId", "Wrong template id, please try again")
    .isString()
    .notEmpty()
    .custom((templateId) => {
      return mongoose.Types.ObjectId.isValid(templateId);
    }),
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
      try {
        const payload: [] = JSON.parse(value);
        return themeSchema.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
  check(
    "footer_config",
    "footer_config value must a valid footer_config object or it is missing"
  )
    .isString()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return footerConfigSchema.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
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

  const error = new HttpError(
    "custom_logo and footer_logo, both are required",
    StatusCodes.BAD_REQUEST
  );

  try {
    if (custom_logo) {
      if (footer_logo) {
        return next();
      } else {
        await deleteImage(custom_logo);
        return next(error);
      }
    } else {
      if (footer_logo) {
        await deleteImage(footer_logo);
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
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // @ts-ignore
      await deleteImage(req.files.custom_logo[0].filename);
      // @ts-ignore
      await deleteImage(req.files.footer_logo[0].filename);

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
      templateId: req.body.templateId,
      title: req.body.title,
      description: req.body.description,
      icon: req.body.icon,
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
      .catch(() =>
        next(
          new HttpError(
            "Cannot create page, something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
      );

    res.status(StatusCodes.CREATED).json(newPage);
  }
);

const pageContents = z
  .array(
    z.object({
      type: z.string(),
      content: z.any(),
    })
  )
  .nonempty();

const PAGE_CONTENT_VALIDATORS = [
  check("contents", "contents must be a valid contents array or it is missing")
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return pageContents.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
];

router.post(
  "/:pageId/addContents",
  upload.none(),
  param("pageId", "Wrong page id, please try again")
    .isString()
    .custom((pageId) => {
      return mongoose.Types.ObjectId.isValid(pageId);
    }),
  PAGE_CONTENT_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
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
      if (!page) {
        return next(
          new HttpError(
            "Page with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (page.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot add contents to page, only user who created page can add contents",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const contents: [] = req.body.contents;

      contents.forEach((content) => {
        page.contents.push(content);
      });

      await page.save();

      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Contents added to the page" });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot add contents to the page, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.patch(
  "/:pageId/contents",
  upload.none(),
  param("pageId", "Wrong page id, please try again")
    .isString()
    .custom((pageId) => {
      return mongoose.Types.ObjectId.isValid(pageId);
    }),
  PAGE_CONTENT_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
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
      if (!page) {
        return next(
          new HttpError(
            "Page with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (page.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot update page content, only user who created page can update contents",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const contents: [] = req.body.contents;

      await PageModel.updateOne({ _id: pageId }, { contents: contents })
        .exec()
        .then((page) => {
          if (page.acknowledged) {
            return res
              .status(StatusCodes.OK)
              .json({ success: true, message: "Page contents updated" });
          } else {
            return next(
              new HttpError(
                "Cannot update page contents, something went wrong",
                StatusCodes.INTERNAL_SERVER_ERROR
              )
            );
          }
        });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot update page contents, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.get("/all", (req, res, next) => {
  PageModel.find()
    .exec()
    .then((pages) => {
      return res.status(StatusCodes.OK).json(pages);
    })
    .catch(() => {
      return next(
        new HttpError(
          "Cannot get pages, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    });
});

router.get("/all/min", (req, res, next) => {
  PageModel.find()
    .select({ url: 1, title: 1, description: 1 })
    .exec()
    .then((pages) => {
      return res.status(StatusCodes.OK).json(pages);
    })
    .catch(() => {
      return next(
        new HttpError(
          "Cannot get pages, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    });
});

router.get("/user/all", (req, res, next) => {
  // @ts-ignore
  const userId = req.user.toObject({ getters: true }).id;

  PageModel.find({ userId: userId })
    .exec()
    .then((pages) => {
      if (!pages)
        return next(
          new HttpError(
            "Pages with provided user id not found",
            StatusCodes.NOT_FOUND
          )
        );
      return res.status(StatusCodes.OK).json(pages);
    })
    .catch(() => {
      return next(
        new HttpError(
          "Cannot get pages, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    });
});

router.get(
  "/template/:templateId",
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

    PageModel.find({ templateId: templateId })
      .exec()
      .then((pages) => {
        if (!pages) {
          return next(
            new HttpError(
              "Pages with provided template id not found",
              StatusCodes.NOT_FOUND
            )
          );
        }

        return res.status(StatusCodes.OK).json(pages);
      })
      .catch(() => {
        return next(
          new HttpError(
            "Cannot get pages for provided template id, something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      });
  }
);

router.get(
  "/template/:templateId/min",
  param("templateId", "Wrong page id, please try again")
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

    PageModel.find({ templateId: templateId })
      .select({ url: 1, title: 1, description: 1 })
      .exec()
      .then((pages) => {
        if (!pages) {
          return next(
            new HttpError(
              "Pages with provided template id not found",
              StatusCodes.NOT_FOUND
            )
          );
        }

        return res.status(StatusCodes.OK).json(pages);
      })
      .catch(() => {
        return next(
          new HttpError(
            "Cannot get pages for provided template id, something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      });
  }
);

router.get(
  "/one/:pageId",
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
        if (!page) {
          return next(
            new HttpError(
              "Page with provided id not found",
              StatusCodes.NOT_FOUND
            )
          );
        }

        return res.status(StatusCodes.OK).json(page);
      })
      .catch(() => {
        return next(
          new HttpError(
            "Cannot get page for provided id, something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      });
  }
);

router.get(
  "/:pageId/getContents",
  param("pageId", "Wrong page id, please try again")
    .isString()
    .custom((pageId) => {
      return mongoose.Types.ObjectId.isValid(pageId);
    }),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { pageId } = req.params;

    PageModel.findById(pageId)
      .select({ title: 1, contents: 1 })
      .exec()
      .then((page) => {
        if (!page) {
          return next(
            new HttpError(
              "Page with provided template id not found",
              StatusCodes.NOT_FOUND
            )
          );
        }

        return res.status(StatusCodes.OK).json(page);
      })
      .catch(() => {
        return next(
          new HttpError(
            "Cannot get contents for provided page id, something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
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
      if (!page) {
        return next(
          new HttpError(
            "Page with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (page.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot delete page, only user who created the page can delete it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const custom_logo = page.custom_logo.split("/")[2];
      const footer_logo = page.footer_logo.split("/")[2];

      await deleteImage(custom_logo);
      await deleteImage(footer_logo);

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

router.delete("/user/all", async (req, res, next) => {
  // @ts-ignore
  const userId = req.user.toObject({ getters: true }).id;

  const pages = await PageModel.find({ userId: userId }).exec();

  PageModel.deleteMany({ userId: userId })
    .exec()
    .then((pages) => {
      if (pages.deletedCount === 0) {
        return next(
          new HttpError(
            "Pages with provided user id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }
    })
    .catch(() => {
      return next(
        new HttpError(
          "Cannot delete pages, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    });

  try {
    let allImagesPath: string[] = [];

    pages.forEach((page) => {
      allImagesPath.push(`${UPLOADS}${page.custom_logo.split("/")[2]}`);
      allImagesPath.push(`${UPLOADS}${page.footer_logo.split("/")[2]}`);
    });

    const allImagesDelete = allImagesPath.map((imagePath) => unlink(imagePath));

    Promise.all(allImagesDelete);
  } catch (error) {
    return next(
      new HttpError(
        "Cannot delete pages, something went wrong",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Pages Deleted" });
});

const UPDATE_PAGE_VALIDATORS = [
  check("url", "url value must be a valid url")
    .optional()
    .isString()
    .notEmpty()
    .isURL({ require_protocol: false, require_tld: false }),
  check("templateId", "Wrong template id, please try again")
    .optional()
    .isString()
    .notEmpty()
    .custom((templateId) => {
      return mongoose.Types.ObjectId.isValid(templateId);
    }),
  check("font_family", "font_family value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("corner_styles", "corner_styles value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("pagination_bg_color", "pagination_bg_color value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("pagination_text_color", "pagination_text_color value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("footer_toggle", "footer_toggle value must be true or false")
    .optional()
    .isString()
    .notEmpty()
    .toLowerCase()
    .isIn(["true", "false"])
    .toBoolean(),
  check("title", "title value is missing").optional().isString().notEmpty(),
  check("description", "description value is missing")
    .optional()
    .isString()
    .notEmpty(),
  check("icon", "icon value is missing").optional().isString().notEmpty(),
  check("theme", "theme value must a valid theme object or it is missing")
    .optional()
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return themeSchema.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
  check(
    "footer_config",
    "footer_config value must a valid footer_config object or it is missing"
  )
    .optional()
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return footerConfigSchema.parse(payload);
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
    "icon",
    "theme",
    "title",
    "templateId",
    "description",
    "font_family",
    "corner_styles",
    "footer_toggle",
    "footer_config",
    "pagination_bg_color",
    "pagination_text_color",
  ];
  const request = Object.keys(req.body);
  const result = request.every((val) => requestMap.includes(val));

  // @ts-ignore
  const custom_logo = req.files.custom_logo ? req.files.custom_logo[0].filename : null;

  // @ts-ignore
  const footer_logo = req.files.footer_logo ? req.files.footer_logo[0].filename : null;

  if (result) {
    // @ts-ignore
    req.logo = {
      custom_logo,
      footer_logo,
    };
    return next();
  } else {
    custom_logo && (await deleteImage(custom_logo));
    footer_logo && (await deleteImage(footer_logo));

    return next(
      new HttpError(
        "Unknown field detected, please only enter valid field(s)",
        StatusCodes.BAD_REQUEST
      )
    );
  }
};

router.patch(
  "/:pageId",
  upload.fields([
    { name: "custom_logo", maxCount: 1 },
    { name: "footer_logo", maxCount: 1 },
  ]),
  param("pageId", "Wrong page id, please try again")
    .isString()
    .custom((pageId) => {
      return mongoose.Types.ObjectId.isValid(pageId);
    }),
  ValidatePatchRequest,
  UPDATE_PAGE_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    // @ts-ignore
    const { custom_logo, footer_logo } = req.logo;

    if (!errors.isEmpty()) {
      custom_logo && (await deleteImage(custom_logo));
      footer_logo && (await deleteImage(footer_logo));
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { pageId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const page = await PageModel.findById(pageId).exec();
      if (!page) {
        custom_logo && (await deleteImage(custom_logo));
        footer_logo && (await deleteImage(footer_logo));
        return next(
          new HttpError(
            "Page with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (page.userId.toString() !== userId) {
        custom_logo && (await deleteImage(custom_logo));
        footer_logo && (await deleteImage(footer_logo));
        return next(
          new HttpError(
            "Cannot update page, only user who created the page can update it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      let data = {
        ...req.body,
      };

      if (custom_logo) {
        const old_custom_logo = page.custom_logo.split("/")[2];
        await deleteImage(old_custom_logo);
        data["custom_logo"] = `${req.hostname}/uploads/${custom_logo}`;
      }

      if (footer_logo) {
        const old_footer_logo = page.footer_logo.split("/")[2];
        await deleteImage(old_footer_logo);
        data["footer_logo"] = `${req.hostname}/uploads/${footer_logo}`;
      }

      await PageModel.updateOne({ _id: pageId }, data)
        .exec()
        .then((page) => {
          if (page.acknowledged) {
            return res
              .status(StatusCodes.OK)
              .json({ success: true, message: "Page Updated" });
          } else {
            return next(
              new HttpError(
                "Cannot update page for provided id, something went wrong",
                StatusCodes.INTERNAL_SERVER_ERROR
              )
            );
          }
        });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot update page for provided id, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

export default router;
