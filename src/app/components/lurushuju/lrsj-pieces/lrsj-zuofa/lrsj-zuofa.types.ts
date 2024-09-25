import {SortedItem} from "@app/utils/sort-items";
import {算料数据, 输入, 选项} from "../../xinghao-data";

export interface ZuofaTab {
  name: string;
  hidden?: boolean;
}

export type XuanxiangTableData = 选项 & {操作?: string};
export type ShuruTableData = 输入 & {操作?: string};
export type ShuruTableDataSorted = SortedItem<输入 & {操作?: string}>;
export type MenjiaoData = 算料数据 & {操作?: string};
