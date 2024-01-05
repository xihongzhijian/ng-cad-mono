import {ObjectOf} from "@lucilor/utils";
import {TableRenderInfo} from "@modules/table/components/table/table.types";

export interface TableInfoData {
  标题: string;
  表头: {
    label: string;
    value: string;
    width: string[];
  }[][];
  表数据: TableRenderInfo<ObjectOf<any>>[];
}

export type TableData = ObjectOf<any>;

export interface XikongDataRaw {
  加工孔名字: string;
  加工面: string;
  X: number | string;
  Y: number | string;
  Z: number | string;
}

export interface XikongData extends XikongDataRaw {
  序号: number;
}
