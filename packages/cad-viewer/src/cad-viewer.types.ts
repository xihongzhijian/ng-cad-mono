import {CadDimensionStyle, FontStyle} from "./cad-data/cad-styles";
import {EntityType} from "./cad-data/cad-types";

export interface CadViewerFont {
  name: string;
  url: string;
}

export interface CadViewerHotKey {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export type CadViewerSelectMode = "none" | "single" | "multiple";
export type CadViewerDragAxis = "" | "x" | "y" | "xy";

export interface CadViewerConfig {
  width: number; // 宽
  height: number; // 高
  backgroundColor: string; // 背景颜色, 写法与css相同
  padding: number[]; // 内容居中时的内边距, 写法与css相同
  reverseSimilarColor: boolean; // 实体颜色与背景颜色相近时是否反相
  validateLines: boolean; // 是否验证线段
  selectMode: CadViewerSelectMode; // 实体选取模式
  dragAxis: CadViewerDragAxis; // 限制整体内容可向x或y方向拖动
  entityDraggable: boolean | EntityType[]; // 实体是否可拖动
  hideDimensions: boolean; // 是否隐藏标注
  lineGongshi: number; // 显示线公式的字体大小, ≤0时不显示
  hideLineLength: boolean; // 是否隐藏线长度(即使lineLength>0)
  hideLineGongshi: boolean; // 是否隐藏线公式(即使lineGongshi>0)
  minLinewidth: number; // 所有线的最小宽度(调大以便选中)
  fontStyle: FontStyle; // 全局字体样式
  dimStyle: CadDimensionStyle; // 全局标注样式
  enableZoom: boolean; // 是否启用缩放
  dashedLinePadding: number | number[]; // 虚线前后留白
  hotKeys: {
    selectAll: CadViewerHotKey[];
    unSelectAll: CadViewerHotKey[];
    copyEntities: CadViewerHotKey[];
    pasteEntities: CadViewerHotKey[];
    deleteEntities: CadViewerHotKey[];
  };
}
export const getDefalutCadViewerConfig = (): CadViewerConfig => ({
  width: 300,
  height: 150,
  backgroundColor: "white",
  padding: [0],
  reverseSimilarColor: true,
  validateLines: false,
  selectMode: "multiple",
  dragAxis: "xy",
  entityDraggable: true,
  hideDimensions: false,
  lineGongshi: 0,
  hideLineLength: false,
  hideLineGongshi: false,
  minLinewidth: 1,
  fontStyle: {},
  dimStyle: {},
  enableZoom: true,
  dashedLinePadding: 2,
  hotKeys: {
    selectAll: [{key: "a", ctrl: true}],
    unSelectAll: [{key: "Escape"}],
    copyEntities: [{key: "c", ctrl: true}],
    pasteEntities: [{key: "v", ctrl: true}, {key: "Enter"}],
    deleteEntities: [{key: "Delete"}, {key: "Backspace"}]
  }
});
