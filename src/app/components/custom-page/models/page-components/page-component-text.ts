import {Property} from "csstype";
import {PageComponentBase} from "./page-component-base";

export class PageComponentText extends PageComponentBase {
  readonly type = "text";
  text = "";
  fontSize: Property.FontSize = "16px";
  fontFamily: Property.FontFamily = "";
  color: Property.Color = "black";

  readonly = false;

  import(data: ReturnType<typeof this.export>) {
    super.import(data);
    this.text = data.text;
    this.fontSize = data.fontSize;
    this.fontFamily = data.fontFamily;
    this.color = data.color;
  }
  export() {
    return {
      ...super.export(),
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      color: this.color
    };
  }

  getStyle() {
    const style = super.getStyle();
    style.height = "auto";
    return style;
  }
}
