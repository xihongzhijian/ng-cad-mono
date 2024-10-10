import {SortedItem} from "@app/utils/sort-items";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {ObjectOf} from "packages/utils/lib";

export type XhmrmsbjSbjbResponseData = XhmrmsbjSbjbItem[];

export interface XhmrmsbjSbjbItem {
  产品分类: string;
  锁边铰边数据: XhmrmsbjSbjbItemSbjb[];
}
export interface XhmrmsbjSbjbItemSbjb {
  开启: string;
  门铰: string[];
  门扇厚度: string[];
  条件: string;
  包边方向: string;
  锁边: XhmrmsbjSbjbItemSbjbItem;
  铰边: XhmrmsbjSbjbItemSbjbItem;
  锁框?: string;
  铰框?: string;
  顶框?: string;
  插销边?: string;
  小扇铰边?: string;
  CAD数据?: XhmrmsbjSbjbItemSbjbCad[];
  停用?: boolean;
  排序?: number;
  默认值?: boolean;
}
export type XhmrmsbjSbjbItemSbjbSorted = SortedItem<XhmrmsbjSbjbItemSbjb>;
export interface XhmrmsbjSbjbItemSbjbItem {
  名字: string;
  默认正面宽: number;
  默认背面宽: number;
  虚拟企料: boolean;
  使用分体: boolean;
}
export interface XhmrmsbjSbjbItemSbjbCad {
  name: string;
  fenlei?: string;
  cad?: HoutaiCad | null;
}

export interface XhmrmsbjSbjbItemSbjbCadInfo {
  index: number;
}

export const xhmrmsbjSbjbItemOptionalKeys = ["锁框", "铰框", "顶框", "插销边", "小扇铰边"] as const;
export type XhmrmsbjSbjbItemOptionalKey = (typeof xhmrmsbjSbjbItemOptionalKeys)[number];

export const xhmrmsbjSbjbItemOptionalKeys2 = ["锁边", "铰边", "锁框", "铰框", "顶框", "插销边", "小扇铰边"] as const;
export type XhmrmsbjSbjbItemOptionalKey2 = (typeof xhmrmsbjSbjbItemOptionalKeys2)[number];

export const xhmrmsbjSbjbItemCadKeys: ObjectOf<XhmrmsbjSbjbItemOptionalKey2[]> = {
  单门: ["铰框", "铰边", "锁边", "锁框", "顶框"],
  子母对开: ["铰框", "小扇铰边", "插销边", "锁边", "铰边", "铰框", "顶框"],
  双开: ["铰框", "铰边", "插销边", "锁边", "铰边", "铰框", "顶框"]
};

export const xhmrmsbjSbjbItemCopyModes = ["全部替换", "添加到原有数据"] as const;
export type XhmrmsbjSbjbItemCopyMode = (typeof xhmrmsbjSbjbItemCopyModes)[number];
