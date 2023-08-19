import { model, Schema, Types } from "mongoose";

const pageSchema = new Schema({
  // userId: { type: Schema.Types.ObjectId, ref: "User" },
  title: String,
  url: String,
  custom_logo: String,
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
    footer_logo: String,
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

const test = new PageModel({
  userId: "fsf908ffsdf9083",
  title: "This is a title",
  url: "http://test.com",
  custom_logo: "C:/User/admin/log.png",
  theme: {
    type: "default",
    header_color: "black",
    subheader_color: "blue",
    bg_color: "red",
    links_color: "green",
    toggle_mode: true,
    default_mode: "light",
  },
  font_family: "Inter",
  corner_styles: "rounded",
  footer_toggle: true,
  footer_config: {
    footer_logo: "C/user/admin/logo.png",
    copyright_text: "Copyright ali",
    copyright_color: "yellow",
    links_color: "gray",
    bg_color: "orange",
    navigation: [
      {
        section_title: "Main",
        links: [
          {
            link_title: "Discord",
            link_url: "discord.com",
          },
          {
            link_title: "Discord",
            link_url: "discord.com",
          },
        ],
      },
    ],
  },
  pagination_bg_color: "red",
  pagination_text_color: "blue",
});

// console.log(test);
