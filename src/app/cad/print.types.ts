import {Formulas} from "@app/utils/calc";
import {ProjectConfig} from "@app/utils/project-config";
import {CadData, CadDimensionStyle, CadViewerConfig} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {Properties} from "csstype";
import {createPdf} from "pdfmake/build/pdfmake";

export interface DrawDesignPicsParams {
  margin?: number;
  anchorImg?: number[];
  anchorBg?: number[];
  objectFit?: Properties["objectFit"];
  flip?: string;
}

export interface PrintCadsParamsOrder {
  materialResult?: Formulas;
  unfold?: {cad: CadData; offsetStrs: string[]}[];
  bomTable?: BomTable;
  型材物料明细?: 型材物料明细List;
}
export interface BomTable {
  title: string;
  data: ObjectOf<any>[];
  cols: {field: string; label?: string; width?: number; link?: ObjectOf<string>}[];
}
export interface 型材物料明细List {
  items: 型材物料明细Item[];
  compact?: boolean;
}
export interface 型材物料明细Item {
  截面图: string;
  铝型材: string;
  是横料: string;
  左切角: string;
  右切角: string;
  型材颜色: string;
  型材长度: string;
  要求数量: number;
}

export type PdfDocument = Parameters<typeof createPdf>[0];

export interface PrintCadsParams {
  cads: CadData[];
  projectConfig: ProjectConfig;
  config?: Partial<CadViewerConfig>;
  linewidth?: number;
  dimStyle?: CadDimensionStyle;
  designPics?: ObjectOf<{
    urls: string[][];
    showSmall: boolean;
    showLarge: boolean;
    styles?: DrawDesignPicsParams;
  }>;
  extra?: {拉手信息宽度?: number};
  url?: string;
  keepCad?: boolean;
  codes?: string[];
  type?: string;
  info?: PdfDocument["info"];
  orders?: PrintCadsParamsOrder[];
  textMap?: ObjectOf<string>;
  dropDownKeys?: string[];
  projectName?: string;
  errors?: string[];
}
