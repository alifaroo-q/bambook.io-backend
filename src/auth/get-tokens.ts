import { NextFunction, Request, Response } from "express";

const getTokens = (req: Request, res: Response, next: NextFunction) => {
  console.log(req.cookies["jwt"]);
  const token_cookies = req.cookies["jwt"];
  res
    .cookie("jwt", token_cookies, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: true,
      sameSite: "none",
    })
    .json({ access_token: token_cookies["access"] });
};

export default getTokens;
