import express from "express";

import loginWithGoogle from "./login-with-google";
import loginRegisterWithJwt from "./login-register-with-jwt";

const router = express.Router();

router.use(loginWithGoogle);
router.use(loginRegisterWithJwt);

export default router;
