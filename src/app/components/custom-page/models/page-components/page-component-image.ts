import {Property} from "csstype";
import {PageComponentBase} from "./page-component-base";

export class PageComponentImage extends PageComponentBase {
  src: string = "";
  alt: string = "";
  objectFit: Property.ObjectFit = "fill";
}
