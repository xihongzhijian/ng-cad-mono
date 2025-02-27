import {ObjectOf} from "@lucilor/utils";

export interface CadDataInfo {
  [key: string]: any;
  唯一码?: string;
  修改包边正面宽规则?: string;
  锁边自动绑定可搭配铰边?: string;
  version?: CadVersion;
  vars?: ObjectOf<string>;
  激光开料是否翻转?: boolean;
  激光开料标记线?: {ids: string[]; type: string}[];
}

export enum CadVersion {
  DXF9 = "AC1004",
  DXF10 = "AC1006",
  DXF12 = "AC1009",
  DXF13 = "AC1012",
  DXF14 = "AC1014",
  DXF2000 = "AC1015",
  DXF2004 = "AC1018",
  DXF2007 = "AC1021",
  DXF2010 = "AC1024",
  DXF2013 = "AC1027",
  DXF2018 = "AC1032"
}

export const intersectionKeys = ["zhidingweizhipaokeng", "指定分体位置", "指定位置不折"] as const;
export type IntersectionKey = (typeof intersectionKeys)[number];
export const intersectionKeysTranslate: Record<IntersectionKey, string> = {
  zhidingweizhipaokeng: "指定位置刨坑",
  指定分体位置: "指定分体位置",
  指定位置不折: "指定位置不折"
};

export interface FentiDuiyingxianItem {
  ids: string[];
  dl: number;
  isPinjie?: boolean;
}
