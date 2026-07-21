import csstype from "csstype";

export interface FontStyle {
  color?: csstype.Properties["color"];
  size?: number;
  family?: csstype.Properties["fontFamily"];
  weight?: csstype.Properties["fontWeight"];
  vertical?: boolean;
  vertical2?: boolean;
}
export interface CadStyle {
  color?: csstype.Properties["color"];
  fontStyle?: FontStyle;
  lineStyle?: LineStyle;
  opacity?: number;
  dimStyle?: CadDimensionStyle;
}

export interface LineStyleBasic {
  color?: csstype.Properties["color"];
  dashArray?: number[];
  width?: number;
}

export interface LineStyle extends LineStyleBasic {
  fillColor?: csstype.Properties["color"];
  padding?: number | number[];
  forcePadding?: boolean;
}

export interface CadDimensionStyle {
  color?: csstype.Properties["color"];
  dimensionLine?: LineStyle & {hidden?: boolean};
  extensionLines?: LineStyle & {hidden?: boolean; length?: number};
  arrows?: {hidden?: boolean; color?: csstype.Properties["color"]; size?: number; block?: string | string[]; lineStyle?: LineStyle};
  text?: FontStyle & {hidden?: boolean};
}

export const cadDimensionTypes = ["linear", "angular", "radius"] as const;
export type CadDimensionType = (typeof cadDimensionTypes)[number];
