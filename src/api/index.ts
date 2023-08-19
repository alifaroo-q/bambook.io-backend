import express from "express";

import template from "./TemplateApi/template";
import page from "./PageApi";

const router = express.Router();

router.use("/template", template);
router.use("/places", page);

export default router;
