import express from "express";

import loginWithGoogle from "./login-with-google";
import loginWithFacebook from "./login-with-facebook";
import loginRegisterWithJwt from "./login-register-with-jwt";

const router = express.Router();

router.use(loginWithGoogle);
router.use(loginWithFacebook);
router.use(loginRegisterWithJwt);

export default router;
