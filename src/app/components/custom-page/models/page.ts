import {Properties, Property} from "csstype";
import {isTypeOf} from "packages/utils/lib";
import {PageOrientation} from "pdfmake/interfaces";
import {PageSizeName, PageSizeNameCustom, pageSizes} from "./page-size";

export class Page {
  size = pageSizes.A4.slice() as [number, number];
  sizeName: PageSizeNameCustom = "A4";
  orientation: PageOrientation = "portrait";
  background: Property.Background = "white";
  scale: [number, number] = [1, 1];
  padding: [number, number, number, number] = [0, 0, 0, 0];

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
        this.size = pageSizes[name].slice() as [number, number];
      } else {
        this.size = pageSizes[name].slice().reverse() as [number, number];
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
      this.size = [width, height];
    }
  }

  getStyle(): Properties {
    const width = this.size[0] * this.scale[0];
    const height = this.size[1] * this.scale[1];
    return {
      width: `${width}mm`,
      height: `${height}mm`,
      background: this.background,
      padding: this.padding.map((v) => `${v}mm`).join(" ")
    };
  }

  fitToSize(width: number, height: number) {
    const [w, h] = this.size;
    const scale = Math.min(width / w, height / h);
    this.scale = [scale, scale];
  }
}
