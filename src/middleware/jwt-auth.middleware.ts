import passport from "passport";

const JWTAuthMiddleware = passport.authenticate("jwt", { session: false });

export default JWTAuthMiddleware;
