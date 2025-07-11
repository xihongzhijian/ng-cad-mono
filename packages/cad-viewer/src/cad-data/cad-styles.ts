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

export interface LineStyle {
  color?: csstype.Properties["color"];
  dashArray?: number[];
  padding?: number | number[];
  width?: number;
}

export interface CadDimensionStyle {
  color?: csstype.Properties["color"];
  dimensionLine?: LineStyle & {hidden?: boolean};
  extensionLines?: LineStyle & {hidden?: boolean; length?: number};
  arrows?: {hidden?: boolean; color?: csstype.Properties["color"]; size?: number};
  text?: FontStyle & {hidden?: boolean};
}

export const cadDimensionTypes = ["linear", "angular", "radius"] as const;
export type CadDimensionType = (typeof cadDimensionTypes)[number];
