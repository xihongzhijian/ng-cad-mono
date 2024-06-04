import {isTypeOf, Point} from "@lucilor/utils";
import {Properties, Property} from "csstype";
import {PageOrientation} from "pdfmake/interfaces";
import {PageSizeName, PageSizeNameCustom, pageSizes} from "./page-size";

export class Page {
  size = new Point(pageSizes.A4.slice());
  sizeName: PageSizeNameCustom = "A4";
  orientation: PageOrientation = "portrait";
  background: Property.Background = "white";
  scale = new Point(1, 1);
  padding: [number, number, number, number] = [0, 0, 0, 0];

  styleOverrides: Properties = {};

  constructor() {}

  setSize(params: {name: PageSizeName; orientation?: PageOrientation} | {width: number; height: number}) {
    if ("name" in params) {
      const {name, orientation} = params;
      if (!(name in pageSizes)) {
        throw new Error(`Unknown page size: ${name}`);
      }
      this.sizeName = name;
      this.orientation = orientation || "portrait";
      if (this.orientation === "portrait") {
        this.size.set(...(pageSizes[name].slice() as [number, number]));
      } else {
        this.size.set(...(pageSizes[name].slice().reverse() as [number, number]));
      }
    } else {
      const {width, height} = params;
      if (!isTypeOf(width, "number")) {
        throw new Error(`Invalid width: ${width}`);
      }
      if (!isTypeOf(height, "number")) {
        throw new Error(`Invalid height: ${height}`);
      }
      this.sizeName = "自定义";
      this.size.set(width, height);
    }
  }

  getStyle(): Properties {
    const {x: width, y: height} = this.size.multiply(this.scale);
    return {
      width: `${width}mm`,
      height: `${height}mm`,
      background: this.background,
      padding: this.padding.map((v) => `${v}mm`).join(" "),
      ...this.styleOverrides
    };
  }

  fitToSize(width: number, height: number) {
    const {x: w, y: h} = this.size;
    const scale = Math.min(width / w, height / h);
    this.scale.set(scale, scale);
  }
}
