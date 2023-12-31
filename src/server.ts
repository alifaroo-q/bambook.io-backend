import fs from "fs";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import passport from "passport";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { StatusCodes } from "http-status-codes";

import connectDB from "./db/mongodb";

import ErrorMiddleware from "./middleware/error.middleware";
import RouteNotFoundMiddleware from "./middleware/not-found.middleware";
import RefreshTokenMiddleware from "./middleware/refresh-token.middleware";

import "dotenv/config";
import "./auth/passport-jwt";
import "./auth/passport-google";
import "./auth/passport-facebook";

import api from "./api";
import auth from "./auth";
import getTokens from "./auth/get-tokens";
import HttpError from "./model/http-error.model";
import JWTAuthMiddleware from "./middleware/jwt-auth.middleware";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, "uploads")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan("common"));
app.use(helmet());

// cors policy

const corsConfig = {
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "DELETE", "UPDATE", "PATCH", "OPTIONS"],
  optionsSuccessStatus: 204,
  credentials: true,
};

app.use(cors(corsConfig));

app.use(passport.initialize());

app.get("/health", (req, res) => {
  res.status(StatusCodes.OK).json({ message: "OK" });
});

app.use("/auth", auth);
app.use("/api", JWTAuthMiddleware, api);

app.get("/getTokens", JWTAuthMiddleware, getTokens);
app.post("/refreshToken", RefreshTokenMiddleware);

app.get("/uploads/:filename", JWTAuthMiddleware, (req, res, next) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, "./uploads/" + filename);

  fs.access(imagePath, fs.constants.F_OK, (error) => {
    if (error)
      return next(new HttpError("Image does not exist", StatusCodes.NOT_FOUND));
    else return res.sendFile(imagePath);
  });
});

app.use(RouteNotFoundMiddleware);
app.use(ErrorMiddleware);

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    console.info("connected to database");
    app.listen(PORT, () => {
      console.info(`server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

start();
