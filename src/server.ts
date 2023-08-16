import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import passport from "passport";
import { StatusCodes } from "http-status-codes";

import connectDB from "./db/mongodb";
import ErrorMiddleware from "./middleware/error.middleware";
import RouteNotFoundMiddleware from "./middleware/not-found.middleware";

import "dotenv/config";
import "./auth/passport-jwt";
import "./auth/passport-google";

import auth from "./auth";
import api from "./api";
import requireJwtAuth from "./middleware/jwt-auth.middleware";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));

app.use(passport.initialize());

app.get("/health", (req, res) => {
  res.status(StatusCodes.OK).json({ message: "OK" });
});

app.use("/auth", auth);
app.use("/api", requireJwtAuth, api);

app.use(RouteNotFoundMiddleware);
app.use(ErrorMiddleware);

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    console.info("connected to database");
    app.listen(PORT, () =>
      console.info(`server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error(err);
  }
};

start();
