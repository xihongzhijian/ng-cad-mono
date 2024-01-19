import {ObjectOf} from "@lucilor/utils";
import {OptionsDataData, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {输入, 选项, 门铰锁边铰边} from "../xinghao-data";
import {LurushujuIndexComponent} from "./lurushuju-index.component";

export interface XinghaoData extends TableDataBase {
  paixu?: number;
  tingyong?: number;
  tupian?: string;
  hidden?: boolean;
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
export type ShuruTableData = 输入 & {操作?: string};
export type MenjiaoData = 门铰锁边铰边 & {操作?: string};

export interface XuanxiangFormData {
  名字: string;
  可选项: {vid: number; mingzi: string}[];
  默认值: string;
}
