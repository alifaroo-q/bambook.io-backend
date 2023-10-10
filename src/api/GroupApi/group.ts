import z from "zod";
import multer from "multer";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import express, { NextFunction, Request, Response } from "express";
import { check, param, validationResult } from "express-validator";

import GroupModel from "../../model/group.model";
import HttpError from "../../model/http-error.model";

const router = express.Router();
const upload = multer();

const EMPTY_GROUP_VALIDATORS = [
  check("group_name", "group_name value must be a string or it is missing")
    .isString()
    .notEmpty(),
];

router.post(
  "/empty",
  upload.none(),
  EMPTY_GROUP_VALIDATORS,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    const groupData = {
      group_name: req.body.group_name,
      userId: userId,
      pages: [],
    };

    const newGroup = new GroupModel(groupData);

    newGroup
      .save()
      .then()
      .catch((error) =>
        next(
          new HttpError(
            "Cannot create group, something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
      );

    res.status(StatusCodes.CREATED).json(newGroup);
  }
);

const groupPages = z
  .array(
    z.string().refine((id) => {
      if (mongoose.Types.ObjectId.isValid(id)) return id;
      return false;
    })
  )
  .nonempty();

const NEW_GROUP_VALIDATORS = [
  check("group_name", "group_name value must be a string or it is missing")
    .isString()
    .notEmpty(),
  check(
    "pages",
    "pages value must be an array of valid page id in string format"
  )
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return groupPages.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
];

router.post(
  "/",
  upload.none(),
  NEW_GROUP_VALIDATORS,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    const groupData = {
      group_name: req.body.group_name,
      userId: userId,
      pages: req.body.pages,
    };

    const newGroup = new GroupModel(groupData);

    newGroup
      .save()
      .then()
      .catch((error) => next(error));

    res.status(StatusCodes.CREATED).json(newGroup);
  }
);

const UPDATE_GROUP_VALIDATORS = [
  check("group_name", "group_name value must be a string or it is missing")
    .optional()
    .isString()
    .notEmpty(),
  check(
    "pages",
    "pages value must be an array of valid page id in string format"
  )
    .optional()
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return groupPages.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
];

const ValidateGroupUpdateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestMap = ["group_name", "pages"];
  const request = Object.keys(req.body);
  const result = request.every((val) => requestMap.includes(val));

  if (result) {
    return next();
  } else {
    return next(
      new HttpError(
        "Unknown field detected, please only enter valid field(s)",
        StatusCodes.BAD_REQUEST
      )
    );
  }
};

router.patch(
  "/:groupId",
  upload.none(),
  param("groupId", "Wrong group id, please try again")
    .isString()
    .custom((groupId) => {
      return mongoose.Types.ObjectId.isValid(groupId);
    }),
  ValidateGroupUpdateRequest,
  UPDATE_GROUP_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { groupId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const group = await GroupModel.findById(groupId).exec();
      if (!group) {
        return next(
          new HttpError(
            "Group with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (group.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot update group, only user who created group can update it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      let data = {
        ...req.body,
      };

      await GroupModel.updateOne({ _id: groupId }, data)
        .exec()
        .then((group) => {
          if (group.acknowledged) {
            return res
              .status(StatusCodes.OK)
              .json({ success: true, message: "Group Updated" });
          } else {
            return next(
              new HttpError(
                "Group update failed, something went wrong",
                StatusCodes.INTERNAL_SERVER_ERROR
              )
            );
          }
        });
    } catch (error) {
      return next(
        new HttpError(
          "Group update failed, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

const GROUP_ADD_REMOVE_PAGES_VALIDATORS = [
  check(
    "pages",
    "pages value must be an array of valid page id in string format"
  )
    .isString()
    .notEmpty()
    .customSanitizer((value) => {
      try {
        const payload: [] = JSON.parse(value);
        return groupPages.parse(payload);
      } catch (error) {
        return false;
      }
    })
    .custom((value) => {
      return value;
    }),
];

router.patch(
  "/:groupId/addPages",
  upload.none(),
  param("groupId", "Wrong group id, please try again")
    .isString()
    .custom((groupId) => {
      return mongoose.Types.ObjectId.isValid(groupId);
    }),
  GROUP_ADD_REMOVE_PAGES_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { groupId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const group = await GroupModel.findById(groupId).exec();
      if (!group) {
        return next(
          new HttpError(
            "Group with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (group.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot add pages to the group, only user who created group can add pages",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const pages: [] = req.body.pages;

      pages.forEach((page) => {
        group.pages.push(page);
      });

      await group.save();

      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Pages added to the group" });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot add pages to group, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.patch(
  "/:groupId/removePages",
  upload.none(),
  param("groupId", "Wrong group id, please try again")
    .isString()
    .custom((groupId) => {
      return mongoose.Types.ObjectId.isValid(groupId);
    }),
  GROUP_ADD_REMOVE_PAGES_VALIDATORS,
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { groupId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const group = await GroupModel.findById(groupId).exec();
      if (!group) {
        return next(
          new HttpError(
            "Group with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (group.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot remove pages from the group, only user who created the group can remove pages",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const pages: string[] = req.body.pages;
      const currentGroupPages: string[] = group.pages.map((page) =>
        page.toString()
      );

      const newGroupPages = currentGroupPages.filter(
        (page) => !pages.includes(page)
      );

      await GroupModel.updateOne({ _id: groupId }, { pages: newGroupPages })
        .exec()
        .then((group) => {
          if (group.acknowledged) {
            return res
              .status(StatusCodes.OK)
              .json({ success: true, message: "Pages removed from the group" });
          } else {
            return next(
              new HttpError(
                "Cannot remove pages from the group, something went wrong",
                StatusCodes.INTERNAL_SERVER_ERROR
              )
            );
          }
        });
    } catch (error) {
      return next(
        new HttpError(
          "Cannot remove pages from group, something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

router.get("/all/full", (req: Request, res: Response, next: NextFunction) => {
  GroupModel.find()
    .populate("pages", {})
    .exec()
    .then((groups) => {
      return res.status(StatusCodes.OK).json(groups);
    })
    .catch(() => {
      return next(
        new HttpError("Something went wrong", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    });
});

router.get("/all/min", (req: Request, res: Response, next: NextFunction) => {
  GroupModel.find()
    .exec()
    .then((groups) => {
      return res.status(StatusCodes.OK).json(groups);
    })
    .catch(() => {
      return next(
        new HttpError("Something went wrong", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    });
});

router.get(
  "/one/:groupId/min",
  param("groupId", "Wrong group id, please try again")
    .isString()
    .custom((groupId) => {
      return mongoose.Types.ObjectId.isValid(groupId);
    }),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { groupId } = req.params;

    GroupModel.findById(groupId)
      .exec()
      .then((group) => {
        if (!group) {
          return next(
            new HttpError(
              "Group with provided id not found",
              StatusCodes.NOT_FOUND
            )
          );
        }
        return res.status(StatusCodes.OK).json(group);
      })
      .catch(() => {
        return next(
          new HttpError(
            "Something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      });
  }
);

router.get(
  "/one/:groupId/full",
  param("groupId", "Wrong group id, please try again")
    .isString()
    .custom((groupId) => {
      return mongoose.Types.ObjectId.isValid(groupId);
    }),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { groupId } = req.params;

    GroupModel.findById(groupId)
      .populate("pages", {})
      .exec()
      .then((group) => {
        if (!group) {
          return next(
            new HttpError(
              "Group with provided id not found",
              StatusCodes.NOT_FOUND
            )
          );
        }
        return res.status(StatusCodes.OK).json(group);
      })
      .catch((error) => {
        return next(
          new HttpError(
            "Something went wrong",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      });
  }
);

router.delete(
  "/:groupId",
  param("groupId", "Wrong group id, please try again")
    .isString()
    .custom((groupId) => {
      return mongoose.Types.ObjectId.isValid(groupId);
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      return next(new HttpError(err.msg, StatusCodes.UNPROCESSABLE_ENTITY));
    }

    const { groupId } = req.params;

    // @ts-ignore
    const userId = req.user.toObject({ getters: true }).id;

    try {
      const group = await GroupModel.findById(groupId).exec();
      if (!group)
        return next(
          new HttpError(
            "Group with provided id not found",
            StatusCodes.NOT_FOUND
          )
        );

      if (group.userId.toString() !== userId) {
        return next(
          new HttpError(
            "Cannot delete group, only user who created group can delete it",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      await GroupModel.deleteOne({ _id: groupId }).exec();

      return res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Group Deleted" });
    } catch (error) {
      return next(
        new HttpError(
          "Group does not exist or something went wrong",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

export default router;
