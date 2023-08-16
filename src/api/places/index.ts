import express from "express";
import { StatusCodes } from "http-status-codes";


const router = express.Router();

const places = [
  {
    id: "u1",
    title: "karachi",
  },
  {
    id: "u2",
    title: "lahore",
  },
];

router.get("/", (req, res, next) => {
  return res.status(StatusCodes.OK).json({ success: true, places });
});

export default router;
