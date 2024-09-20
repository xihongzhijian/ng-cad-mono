import {HoutaiCad} from "@modules/http/services/cad-data.service.types";

export interface XhmrmsbjSbjbItem {
  产品分类: string;
  锁边铰边数据: XhmrmsbjSbjbItemSbjb[];
}
export interface XhmrmsbjSbjbItemSbjb {
  开启: string[];
  门铰: string[];
  门扇厚度: string[];
  条件: string;
  包边方向: string;
  锁边: XhmrmsbjSbjbItemSbjbItem;
  铰边: XhmrmsbjSbjbItemSbjbItem;
  锁框: string;
  铰框: string;
  顶框: string;
  CAD数据?: XhmrmsbjSbjbItemSbjbCad[];
}
export interface XhmrmsbjSbjbItemSbjbItem {
  名字: string;
  默认正面宽: number;
  默认背面宽: number;
  虚拟企料: boolean;
  使用分体: boolean;
}
export interface XhmrmsbjSbjbItemSbjbCad {
  name: string;
  cad: HoutaiCad;
}
