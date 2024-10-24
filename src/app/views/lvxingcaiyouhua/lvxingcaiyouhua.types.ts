import {TableDataBase2} from "@modules/http/services/cad-data.service.types";
import {calc} from "./lvxingcaiyouhua.utils";

export interface InputData {
  型材BOM: 型材BOM[];
  铝型材: 铝型材[];
  铝型材余料库存: 铝型材余料库存[];
}
export type OutputData = ReturnType<typeof calc>;
export interface 型材BOM {
  vid: number;
  名字: string;
  铝型材: string;
  型材长度: string;
  型材颜色: string;
  型材优化分组信息: string;
  要求数量: number;
}
export interface 铝型材 extends TableDataBase2 {
  biaozhunchangdu: number;
  yuliaorukuzuixiaochangdu: number;
  qieduan90dusunhao: number;
  qieduan45dusuanhao: number;
}
export interface 铝型材余料库存 {
  vid: number;
  lvxingcai: string;
  yanse: string;
  kucunshuliang: number;
  kucunweizhibianma: string;
  kucunma: string;
  yuliaochangdu: number;
}
export interface 铝型材优化结果 {
  型材: string;
  颜色: string;
  余料入库最小长度: number;
  排序: number;
  切断90度损耗: number;
  切断45度损耗: number;
  所有型材利用率: number;
  优化结果: 优化结果[];
}
export interface 优化结果Base {
  vid: number;
  铝型材: string;
  物料长度: number;
  物料颜色: string;
  数量: 1;
  单支型材利用率: number;
  排料后剩余长度: number;
  切口损耗: number;
  BOM: 型材BOM[];
  余料可以入库: boolean;
}
export interface 优化结果标准型材 extends 优化结果Base {
  型材类型: "标准型材";
}
export interface 优化结果余料 extends 优化结果Base {
  型材类型: "余料";
  余料标签信息: string;
  库存位置编码: string;
  库存码: string;
}
export type 优化结果 = 优化结果标准型材 | 优化结果余料;

export interface CalcResultItem extends 铝型材优化结果 {
  showDetails: boolean;
}

export interface LvxingcaiFilterForm {
  型材: string;
}
