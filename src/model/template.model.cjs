"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var templateSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    url: String,
    font_family: String,
    corner_styles: String,
    header: Boolean,
    pagination: Boolean,
    custom_logo: String,
    title: String,
    links: [
        {
            _id: false,
            title: String,
            url: String,
        },
    ],
}, { timestamps: true });
var TemplateModel = (0, mongoose_1.model)("Template", templateSchema);
console.log(new TemplateModel({
    url: "http://localhost:5173/example",
    font_family: "Inter",
    corner_styles: "rounded",
    header: true,
    links: [{ title: "Discord", url: "https://discord.com" }],
    pagination: true,
    custom_logo: "C:/User/server/profile.png",
    title: "Some nice title",
}).toJSON());
