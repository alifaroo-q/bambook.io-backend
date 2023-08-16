import jwt from "jsonwebtoken";

const issueJWT = (user: any) => {
  const _id = user._id;
  const expiresIn = "1d";

  const payload = {
    sub: _id,
    iat: Date.now(),
  };

  const signedToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    algorithm: "HS256",
  });

  return {
    token: `Bearer ${signedToken}`,
    expires: expiresIn,
  };
};

export default issueJWT;
