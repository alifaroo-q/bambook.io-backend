import express from "express";

import page from "./PageApi/page";
import template from "./TemplateApi/template";
import group from "./GroupApi/group";

const router = express.Router();

router.use("/template", template);
router.use("/page", page);
router.use("/group", group);

export default router;
