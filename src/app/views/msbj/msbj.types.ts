import {Formulas} from "@app/utils/calc";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {ZuoshujuTableData} from "@app/utils/table-data/zuoshuju-data";
import {MsbjPeizhishuju, MsbjRectInfoRaw} from "@components/msbj-rects/msbj-rects.types";
import {ObjectOf} from "@lucilor/utils";
import {MsbjInfo} from "./msbj.utils";

export interface MsbjFenlei extends TableDataBase {
  selected?: boolean;
}

export interface MsbjData extends ZuoshujuTableData {
  peizhishuju?: string | MsbjPeizhishuju;
  node?: string;
  menshanweizhi?: string;
}

export interface Node2rectData {
  模块层ID: ObjectOf<number>;
  当前扇名字: string;
  门扇大小: Formulas;
  模块大小: Formulas;
}

export const node2rectDataMsdxKeys = ["锁扇正面总宽", "锁扇背面总宽", "铰扇正面总宽", "铰扇背面总宽", "包框高"];

export interface MsbjCloseEvent {
  isSubmited: boolean;
  msbjInfo: MsbjInfo | null;
}

declare global {
  interface Window {
    node2rect(node: any, data?: Node2rectData): MsbjRectInfoRaw[];
  }
}
