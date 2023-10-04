import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { check, validationResult } from "express-validator";
import express, { NextFunction, Request, Response } from "express";

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
      .catch((error) => next(error));

    res.status(StatusCodes.CREATED).json(newGroup);
  }
);

export default router;
