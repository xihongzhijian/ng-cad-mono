import {ObjectOf} from "@lucilor/utils";
import {ColumnInfo, TableRenderInfo} from "@modules/table/components/table/table.types";

export interface TableInfoData {
  标题: string;
  表头?: TableInfoDataSideTable;
  表尾?: TableInfoDataSideTable;
  表头标题宽度?: string;
  表数据: TableInfoDataTable[];
  铣孔信息列宽: ObjectOf<number>;
  表换行索引?: ObjectOf<number[]>;
  小导航?: string;
  vid?: number;
  二维码?: string;
}
export type TableInfoDataTable = TableRenderInfo<TableData> & {
  columns: TableInfoDataColumnInfo[];
  type?: "header" | "footer" | "main";
  型材信息?: 型材信息;
  hideTitle?: boolean;
  换行索引?: string;
  hasSum?: boolean;
};
export type TableInfoDataColumnInfo = ColumnInfo<TableData> & {
  sum?: true;
};
export type TableInfoDataSideTable = {
  label: string;
  value: string;
  width?: string[];
}[][];
export interface 型材信息 {
  图示: string;
  型材颜色: string;
  铝型材: string;
  领料要求: {
    余料可以入库: boolean;
    单支型材利用率: number;
    型材类型: string;
    库存位置编码: string;
    库存码: string;
    排料后剩余长度: number;
    支数: number;
    物料长度: number;
  }[];
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

export interface LvxingcaiyouhuaInfo {
  tableInfoData: TableInfoData | null;
}
