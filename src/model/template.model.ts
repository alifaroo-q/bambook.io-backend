import { model, Schema } from "mongoose";

const templateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
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
  },
  { timestamps: true }
);

const TemplateModel = model("Template", templateSchema);

export default TemplateModel;