import jwt from "jsonwebtoken";

const issueJWT = (user: any) => {
  const _id = user._id;
  const expiresInMS = 7 * 24 * 60 * 60 * 1000; // days * hours * minutes * seconds * milliseconds

  const payload = {
    sub: _id,
    iat: Date.now(),
  };

  const signedToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresInMS,
    algorithm: "HS256",
  });

  return {
    token: signedToken,
    expiresInMS,
  };
};

export default issueJWT;
