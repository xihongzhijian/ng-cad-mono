import {Property} from "csstype";
import {PageComponentBase} from "./page-component-base";

export class PageComponentText extends PageComponentBase {
  text = "";
  fontSize: Property.FontSize = "16px";
  fontFamily: Property.FontFamily = "";
  color: Property.Color = "black";
}
