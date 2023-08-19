import express from "express";

import template from "./TemplateApi/template";
import page from "./PageApi/page";

const router = express.Router();

router.use("/template", template);
router.use("/page", page);

export default router;
