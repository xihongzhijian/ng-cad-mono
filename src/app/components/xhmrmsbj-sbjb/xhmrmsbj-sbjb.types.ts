import {CadCollection} from "@app/cad/collections";
import {SortedItem} from "@app/utils/sort-items";
import {CadData} from "@lucilor/cad-viewer";

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
  双开门扇宽生成方式?: string;
  锁扇铰扇蓝线宽固定差值?: number;
  锁边?: XhmrmsbjSbjbItemSbjbItem;
  铰边?: XhmrmsbjSbjbItemSbjbItem;
  插销边?: XhmrmsbjSbjbItemSbjbItem;
  小扇铰边?: XhmrmsbjSbjbItemSbjbItem;
  锁框?: string;
  铰框?: string;
  顶框?: string;
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
  title: string;
  cadId?: string;
}

export interface XhmrmsbjSbjbItemSbjbCadInfo {
  index: number;
}

export const xhmrmsbjSbjbItemOptionalKeys1 = ["锁框", "铰框", "顶框"] as const;
export type XhmrmsbjSbjbItemOptionalKey1 = (typeof xhmrmsbjSbjbItemOptionalKeys1)[number];
export const xhmrmsbjSbjbItemOptionalKeys2 = ["锁边", "铰边", "插销边", "小扇铰边"] as const;
export type XhmrmsbjSbjbItemOptionalKey2 = (typeof xhmrmsbjSbjbItemOptionalKeys2)[number];
export const xhmrmsbjSbjbItemOptionalKeys3 = [...xhmrmsbjSbjbItemOptionalKeys1, ...xhmrmsbjSbjbItemOptionalKeys2] as const;
export type XhmrmsbjSbjbItemOptionalKey3 = XhmrmsbjSbjbItemOptionalKey1 | XhmrmsbjSbjbItemOptionalKey2;

export const xhmrmsbjSbjbItemOptionalKeys2Map = new Map<XhmrmsbjSbjbItemOptionalKey2, XhmrmsbjSbjbItemOptionalKey2>([["小扇铰边", "铰边"]]);

export const xhmrmsbjSbjbItemCopyModes = ["清空原有数据并全部替换为新数据", "添加到原有数据"] as const;
export type XhmrmsbjSbjbItemCopyMode = (typeof xhmrmsbjSbjbItemCopyModes)[number];

export const isSbjbCad = (collection: CadCollection, cad: CadData) => {
  const collections: CadCollection[] = ["peijianCad"];
  if (!collections.includes(collection)) {
    return false;
  }
  const type = cad.type as XhmrmsbjSbjbItemOptionalKey3;
  return xhmrmsbjSbjbItemOptionalKeys3.includes(type);
};
