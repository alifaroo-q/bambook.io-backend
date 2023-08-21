import express from "express";

import page from "./PageApi/page";
import template from "./TemplateApi/template";

const router = express.Router();

router.use("/template", template);
router.use("/page", page);

export default router;
