import jwt from "jsonwebtoken";

const issueRefreshToken = (user: any) => {
  const _id = user._id;
  const expiresInMS = 7 * 24 * 60 * 60 * 1000; // days * hours * minutes * seconds * milliseconds

  const payload = {
    sub: _id,
    iat: Date.now(),
  };

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: expiresInMS,
    algorithm: "HS256",
  });

  return refreshToken;
};

export default issueRefreshToken;
