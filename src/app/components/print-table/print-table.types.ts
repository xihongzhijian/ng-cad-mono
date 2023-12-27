import {ObjectOf} from "packages/utils/lib";

export interface TableInfoData {
  标题: string;
  表头: {
    label: string;
    value: string;
    width: string[];
  }[][];
  表数据: ObjectOf<string[][]>;
  列宽: ObjectOf<ObjectOf<number>>;
}

export type TableData = ObjectOf<any>;
