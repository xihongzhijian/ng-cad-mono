import {Property} from "csstype";
import {PageComponentBase} from "./page-component-base";

export class PageComponentText extends PageComponentBase {
  readonly type = "text";
  text = "";
  fontSize: number = 16;
  fontFamily: Property.FontFamily = "";

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
    style.fontSize = `${this.fontSize}px`;
    style.fontFamily = this.fontFamily;
    style.color = this.color;
    return style;
  }
}
