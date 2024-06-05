import {Property} from "csstype";
import {PageComponentBase} from "./page-component-base";

export class PageComponentImage extends PageComponentBase {
  readonly type = "image";
  src: string = "";
  alt: string = "";
  objectFit: Property.ObjectFit = "fill";

  import(data: ReturnType<typeof this.export>) {
    super.import(data);
    this.src = data.src;
    this.alt = data.alt;
    this.objectFit = data.objectFit;
  }
  export() {
    return {
      ...super.export(),
      src: this.src,
      alt: this.alt,
      objectFit: this.objectFit
    };
  }
}
