import { model, Schema, Types } from "mongoose";

interface INavLink {
  title: string;
  links: [{ [index: string]: string }];
}

interface IPage {
  userId: Types.ObjectId;
  title: string;
  url: string;
  custom_logo: string;
  themes: {
    type: string;
    subheader_color: string;
    bg_color: string;
    header_color: string;
    links_color: string;
    toggle_mode: boolean;
    default_mode: string;
  };
  font_family: string;
  corner_styles: string;
  footer_toggle: boolean;
  footer_config: {
    footer_logo: string;
    copyright_text: string;
    links_color: string;
    copyright_color: string;
    bg_color: string;
    navigation: Types.Array<INavLink>;
  };
  pagination_bg_color: string;
  pagination_text_color: string;
}
