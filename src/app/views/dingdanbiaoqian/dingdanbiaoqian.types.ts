import {Formulas} from "@app/utils/calc";
import {FormulaInfo} from "@components/formulas/formulas.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {Properties} from "csstype";

export interface Order {
  code: string;
  shiyitus?: ShiyituInfo[];
  materialResult?: Formulas;
  cads: {
    houtaiId: string;
    data: CadData;
    isLarge: boolean;
    forceBreak: boolean;
    img: string;
    imgLarge?: string;
    imgSize: [number, number];
    style: Properties;
    imgStyle: Properties;
    zhankai?: {
      width: string;
      height: string;
      num?: string;
    }[];
    zhankaiDisplayInfos?: {
      kuan: boolean;
      sign: boolean;
      gao: boolean;
      num: boolean;
    }[];
  }[];
  positions: number[][];
  style: Properties;
  info: ObjectOf<string | number>[] | null;
  forms?: Form[];
  mokuaiInfo?: {
    index: number;
    details: {title?: string; value: string}[];
    formulaInfos: {title: string; infos: FormulaInfo[]}[];
  };
}

export interface SectionCell {
  key: string;
  label?: string;
  isBoolean?: boolean;
  autoWidth?: boolean;
  class?: string | string[];
  style?: Properties;
  labelStyle?: Properties;
  valueStyle?: Properties;
}

export interface ShiyituInfo {
  name: string;
  cads: ShiyituCadInfo[];
}
export interface ShiyituCadInfo {
  data: CadData;
  img: string;
  imgLarge?: string;
  style: Properties;
}

export interface SectionConfig {
  rows: {
    cells: SectionCell[];
  }[];
}

export type DdbqData = {
  code: string;
  materialResult?: Formulas;
  cads?: ObjectOf<any>[];
  shiyitus?: {name: string; cads: CadData[]}[];
  forms?: Form[];
  formsStyle?: Properties;
}[];

export interface Form {
  title?:
    | string
    | {
        content?: string;
        style?: Properties;
      };
  isTitleInner?: boolean;
  barCode?: string;
  style?: Properties;
  rowBorder?: boolean;
  footer?: {
    content?: string;
    style?: Properties;
  };
  rows: ({items: FormItem[]; style?: Properties} | FormItem[])[];
}

export interface FormItem {
  label: string;
  value: string;
  type?: "text" | "image";
  style?: Properties;
  labelStyle?: Properties;
  valueStyle?: Properties;
}

export type DdbqType = "标签贴纸" | "质检标签" | "配件模块" | "合格证" | "流程指令卡" | "生产流程单";

export interface DdbqConfig {
  showCadSmallImg: boolean;
  showCadLargeImg: boolean;
  showBarcode: boolean;
}
