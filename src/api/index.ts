import express from "express";

import places from "./places";
import template from "./TemplateApi/template";
import page from "./PageApi";

const router = express.Router();

router.use("/places", places);
router.use("/template", template);
router.use("/places", page);

export default router;
