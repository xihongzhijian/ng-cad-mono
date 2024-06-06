import {isTypeOf, Point} from "@lucilor/utils";
import Color from "color";
import {Properties, Property} from "csstype";
import {PageOrientation} from "pdfmake/interfaces";
import {pageComponentInfos, PageComponentType} from "./page-component-infos";
import {PageComponentBase} from "./page-components/page-component-base";
import {PageSizeName, PageSizeNameCustom, pageSizes} from "./page-size";

export class Page {
  size = new Point(pageSizes.A4.slice());
  sizeName: PageSizeNameCustom = "A4";
  orientation: PageOrientation = "portrait";
  background: Property.Background = "white";
  scale = new Point(1, 1);
  padding: [number, number, number, number] = [0, 0, 0, 0];

  styleOverrides: Properties = {};
  workSpaceStyle: Properties = {};
  components: PageComponentBase[] = [];

  constructor() {}

  import(data: ReturnType<typeof this.export>) {
    if (data.sizeName === "自定义") {
      this.setSize({width: data.size[0], height: data.size[1]});
    } else {
      this.setSize({name: data.sizeName, orientation: data.orientation});
    }
    this.background = data.background;
    this.scale.copy(data.scale);
    this.padding = data.padding;
    this.styleOverrides = data.styleOverrides;
    this.workSpaceStyle = data.workSpaceStyle;
    this.components = data.components.map((component) => {
      const type = component.type as PageComponentType;
      if (!(type in pageComponentInfos)) {
        throw new Error(`Unknown component type: ${type}`);
      }
      const componentInstance = new pageComponentInfos[type].class(component.name);
      componentInstance.import(component as any);
      return componentInstance;
    });
  }
  export() {
    return {
      size: this.size.toArray(),
      sizeName: this.sizeName,
      orientation: this.orientation,
      background: this.background,
      scale: this.scale.toArray(),
      padding: this.padding,
      styleOverrides: this.styleOverrides,
      workSpaceStyle: this.workSpaceStyle,
      components: this.components.map((v) => v.export())
    };
  }

  getPageConfig(): PageConfig {
    return {
      sizeName: this.sizeName,
      orientation: this.orientation,
      width: this.size.x,
      height: this.size.y,
      backgroundColor: Color(this.background),
      workSpaceBgColor: Color(this.workSpaceStyle.backgroundColor),
      padding: this.padding
    };
  }
  setPageConfig(config: PageConfig) {
    if (config.sizeName === "自定义") {
      this.setSize({width: config.width, height: config.height});
    } else {
      this.setSize({name: config.sizeName, orientation: config.orientation});
    }
    this.background = config.backgroundColor.toString();
    this.workSpaceStyle.backgroundColor = config.workSpaceBgColor.toString();
    this.padding = config.padding;
  }

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

  addComponent(type: PageComponentType, name: string) {
    const info = pageComponentInfos[type];
    const component = new info.class(name);
    this.components.push(component);
    return component;
  }
}

export interface PageConfig {
  sizeName: Page["sizeName"];
  orientation: Page["orientation"];
  width: number;
  height: number;
  backgroundColor: Color;
  workSpaceBgColor: Color;
  padding: Page["padding"];
}
