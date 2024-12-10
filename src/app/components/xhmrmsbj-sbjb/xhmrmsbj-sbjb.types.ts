import {CadCollection} from "@app/cad/collections";
import {SortedItem} from "@app/utils/sort-items";
import {CadItemForm} from "@components/lurushuju/cad-item/cad-item.types";
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
  小扇插销边?: XhmrmsbjSbjbItemSbjbItem;
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
  正面宽?: string;
  正面宽可改?: boolean;
  背面宽?: string;
  背面宽可改?: boolean;
  正背面同时改变?: boolean;
  使用正面分体?: boolean;
  使用背面分体?: boolean;
}
export interface XhmrmsbjSbjbItemSbjbCad {
  name: string;
  title: string;
  cadId?: string;
}

export interface XhmrmsbjSbjbItemSbjbCadInfo {
  index: number;
}

export const sbjbItemOptionalKeys1 = ["锁框", "铰框", "顶框"] as const;
export type SbjbItemOptionalKey1 = (typeof sbjbItemOptionalKeys1)[number];
export const sbjbItemOptionalKeys2 = ["锁边", "铰边", "插销边", "小扇插销边", "小扇铰边"] as const;
export type SbjbItemOptionalKey2 = (typeof sbjbItemOptionalKeys2)[number];
export const sbjbItemOptionalKeys3 = [...sbjbItemOptionalKeys1, ...sbjbItemOptionalKeys2] as const;
export type SbjbItemOptionalKey3 = SbjbItemOptionalKey1 | SbjbItemOptionalKey2;
export const sbjbItemOptionalKeys4 = ["锁框", "铰框", "顶框", "锁边", "铰边", "插销边", "中锁边", "中铰边"] as const;
export type SbjbItemOptionalKey4 = (typeof sbjbItemOptionalKeys4)[number];

export const sbjbItemOptionalKeys2Map = new Map<SbjbItemOptionalKey2, SbjbItemOptionalKey2>([["小扇铰边", "铰边"]]);

export const xhmrmsbjSbjbItemCopyModes = ["清空原有数据并全部替换为新数据", "添加到原有数据"] as const;
export type XhmrmsbjSbjbItemCopyMode = (typeof xhmrmsbjSbjbItemCopyModes)[number];

export const isSbjbCollection = (collection: CadCollection): collection is "peijianCad" => {
  return collection === "peijianCad";
};
export const isSbjbType = (type: string): type is SbjbItemOptionalKey4 => {
  return sbjbItemOptionalKeys4.includes(type as SbjbItemOptionalKey4);
};
export const isSbjbCad = (collection: CadCollection, cad: CadData): collection is "peijianCad" => {
  return isSbjbCollection(collection) && isSbjbType(cad.type);
};

export interface XhmrmsbjSbjbCadInfo extends Omit<XhmrmsbjSbjbItemSbjbCad, "cad"> {
  cad?: CadData;
  cadForm: CadItemForm<XhmrmsbjSbjbItemSbjbCadInfo>;
}

export interface XhmrmsbjSbjbCadInfoGrouped extends XhmrmsbjSbjbCadInfo {
  originalIndex: number;
}
