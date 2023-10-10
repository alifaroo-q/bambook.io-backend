import { model, Schema } from "mongoose";

const pageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  templateId: { type: Schema.Types.ObjectId, ref: "Template" },
  title: String,
  description: String,
  icon: String,
  url: String,
  custom_logo: String,
  footer_logo: String,
  font_family: String,
  corner_styles: String,
  footer_toggle: Boolean,
  theme: new Schema(
    {
      type: String,
      header_color: String,
      subheader_color: String,
      bg_color: String,
      links_color: String,
      toggle_mode: Boolean,
      default_mode: String,
    },
    { _id: false }
  ),
  footer_config: {
    _id: false,
    copyright_text: String,
    copyright_color: String,
    links_color: String,
    bg_color: String,
    navigation: [
      new Schema(
        {
          section_title: String,
          links: [
            new Schema(
              {
                link_title: String,
                link_url: String,
              },
              { _id: false }
            ),
          ],
        },
        { _id: false }
      ),
    ],
  },
  pagination_bg_color: String,
  pagination_text_color: String,
});

const PageModel = model("Page", pageSchema);
export default PageModel;