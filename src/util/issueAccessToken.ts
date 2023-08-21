import jwt from "jsonwebtoken";

const issueAccessToken = (user: any) => {
  const _id = user._id;
  const expiresInMS = 1 * 24 * 60 * 60 * 1000; // days * hours * minutes * seconds * milliseconds

  const payload = {
    sub: _id,
    iat: Date.now(),
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresInMS,
    algorithm: "HS256",
  });

  return {
    token: accessToken,
    expiresInMS,
  };
};

export default issueAccessToken;
