import {keysOf} from "@lucilor/utils";
import Color, {ColorInstance} from "color";
import {Property} from "csstype";
import {getDeltaE00, LAB} from "delta-e";
import {cloneDeep} from "lodash";
import {CadDimension, CadEntity, CadHatch, CadLine, CadLineLike, CadMtext} from "./cad-data/cad-entity";
import {CadDimensionStyle, CadStyle, FontStyle} from "./cad-data/cad-styles";
import {Defaults} from "./cad-utils";
import {CadViewerConfig} from "./cad-viewer.types";

export class CadStylizer {
  static get(entity: CadEntity, config: CadViewerConfig, params: CadStyle = {}) {
    const {dashedLinePadding, minLinewidth, reverseSimilarColor, validateLines} = config;
    const defaultStyle: Required<CadStyle> = {
      color: "white",
      fontStyle: {size: Defaults.FONT_SIZE, family: "", weight: "", ...config.fontStyle, ...params.fontStyle},
      lineStyle: {padding: dashedLinePadding, dashArray: entity.dashArray},
      opacity: 1,
      dimStyle: {text: {size: 16}}
    };
    const result: Required<CadStyle> = {...defaultStyle, ...params};
    this.mergeDimStyle(result.dimStyle, defaultStyle.dimStyle);
    this.mergeDimStyle(result.dimStyle, config.dimStyle);
    this.mergeDimStyle(result.dimStyle, params.dimStyle || {});
    let linewidth: number;
    let color = new Color(params.color || entity.getColor() || 0);
    if (params.lineStyle) {
      result.lineStyle = params.lineStyle;
      linewidth = params.lineStyle.width || 1;
    } else if (entity.linewidth > 0) {
      linewidth = entity.linewidth;
    } else {
      linewidth = 1;
    }
    if (entity instanceof CadLineLike && entity.开料不要) {
      color = new Color(0xff4081);
    }
    result.opacity = entity.opacity;
    if (typeof params.opacity === "number") {
      result.opacity = params.opacity;
    }

    if (validateLines && entity instanceof CadLine) {
      if (entity.info.errors?.length) {
        linewidth *= 10;
        color = new Color(0xff0000);
      }
    }
    if (reverseSimilarColor) {
      color = this.correctColor(color, config);
    }
    result.color = color.hex();
    if (!(entity instanceof CadHatch)) {
      // ? make lines easier to select
      linewidth = Math.max(minLinewidth, linewidth);
    }

    if (entity instanceof CadMtext) {
      this.mergeFontStyle(result.fontStyle, entity.fontStyle);
    }

    if (entity instanceof CadDimension) {
      this.mergeDimStyle(result.dimStyle, entity.style);
      // this.mergeFontStyle(result.dimStyle.text, result.fontStyle, false);
    }

    result.lineStyle.width = linewidth;
    const correctColorObj = (obj: {color?: Property.Color} | undefined) => {
      if (!obj) {
        return;
      }
      if (obj.color) {
        obj.color = this.correctColor(obj.color, config).hex();
      } else {
        obj.color = result.color;
      }
    };
    correctColorObj(result.lineStyle);
    correctColorObj(result.fontStyle);
    correctColorObj(result.dimStyle);
    correctColorObj(result.dimStyle.arrows);
    correctColorObj(result.dimStyle.dimensionLine);
    correctColorObj(result.dimStyle.extensionLines);
    correctColorObj(result.dimStyle.text);
    return result;
  }

  static correctColor(color: ColorInstance | string, config: CadViewerConfig) {
    if (typeof color === "string") {
      color = new Color(color);
    }
    const {reverseSimilarColor, backgroundColor} = config;
    if (reverseSimilarColor) {
      const color2 = new Color(backgroundColor);
      const getLAB = (c: ColorInstance): LAB => {
        const [L, A, B] = c.lab().array();
        return {L, A, B};
      };
      const delta = getDeltaE00(getLAB(color), getLAB(color2));
      if (color2.alpha() > 0 && delta <= 10) {
        return color.negate();
      }
    }
    return color;
  }

  static getColorStyle(color: ColorInstance, a = 1) {
    const arr = [color.red(), color.green(), color.blue()].map((v) => v * 255);
    if (a > 0 && a < 1) {
      return `rgba(${[...arr, a].join(",")})`;
    } else {
      return `rgb(${arr.join(",")})`;
    }
  }

  static getFontSize(value: any) {
    const size = Number(value);
    if (isNaN(size) || size <= 0) {
      return null;
    }
    return size;
  }

  static getFontFamilies(str: string) {
    return str
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  static mergeFontFamilies(val1: string | string[], val2: string | string[]) {
    if (typeof val1 === "string") {
      val1 = this.getFontFamilies(val1);
    }
    if (typeof val2 === "string") {
      val2 = this.getFontFamilies(val2);
    }
    return Array.from(new Set([...val1, ...val2]));
  }

  static mergeFontStyle(style1: FontStyle, style2: FontStyle) {
    for (const key2 in style2) {
      const key = key2 as keyof FontStyle;
      if (key === "family" && style2.family) {
        style1.family = this.mergeFontFamilies(style1.family || "", style2.family).join(", ");
      } else if (key === "size") {
        const size = this.getFontSize(style2.size);
        if (size) {
          style1.size = size;
        }
      } else {
        style1[key] = style2[key] as any;
      }
    }
  }

  static mergeDimStyle(style1: CadDimensionStyle, style2: CadDimensionStyle) {
    keysOf(style2).forEach((key) => {
      if (key === "color") {
        style1[key] = style2[key];
      } else {
        style1[key] = {...style1[key], ...cloneDeep(style2[key])};
      }
    });
  }
}
