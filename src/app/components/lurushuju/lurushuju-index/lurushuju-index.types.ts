import {ObjectOf} from "@lucilor/utils";
import {OptionsDataData, TableDataBase2} from "@modules/http/services/cad-data.service.types";
import {算料数据, 输入, 选项} from "../xinghao-data";
import {LurushujuIndexComponent} from "./lurushuju-index.component";

export interface XinghaoData extends TableDataBase2 {
  tupian?: string;
  hidden?: boolean;
  menchuang: string;
  gongyi: string;
  dingdanliucheng?: string;
  算料单模板?: string;
  是否需要激光开料?: boolean;
}

export type LurushujuIndexStep = 1 | 2 | 3;

export interface LurushujuIndexStepInfo extends Record<LurushujuIndexStep, Partial<LurushujuIndexComponent>> {
  1: Record<string, never>;
  2: {
    xinghaoName: string;
  };
  3: {
    xinghaoName: string;
    fenleiName: string;
    gongyiName: string;
  };
}

export type OptionsAll = ObjectOf<OptionsDataData[]>;
export type OptionsAll2 = ObjectOf<{options: OptionsDataData[]; disabled?: boolean; multiple?: boolean}>;

export type XuanxiangTableData = 选项 & {操作?: string};
export type ShuruTableData = 输入 & {操作?: string; originalIndex: number};
export type MenjiaoData = 算料数据 & {操作?: string};

export interface XinghaoMenchuang extends TableDataBase2 {
  gongyis?: XinghaoGongyis;
}
export interface XinghaoGongyi extends TableDataBase2 {
  menchuang: number;
  xinghaos?: XinghaoXinghaos;
}
export interface XinghaoDataList<T> {
  items: T[];
  count: number;
  index?: number;
}
export type XinghaoMenchuangs = XinghaoDataList<XinghaoMenchuang>;
export type XinghaoGongyis = XinghaoDataList<XinghaoGongyi>;
export type XinghaoXinghaos = XinghaoDataList<XinghaoData>;

export interface MenshanOption extends OptionsDataData {
  zuchenghuajian?: string;
}
