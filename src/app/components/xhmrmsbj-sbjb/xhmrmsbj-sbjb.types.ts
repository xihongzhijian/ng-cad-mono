import {CadCollection} from "@app/cad/collections";
import {SortedItem} from "@app/utils/sort-items";
import {Qiliao} from "@app/utils/table-data/table-data.qiliao";
import {CadItemForm} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {InputInfo} from "@modules/input/components/input.types";

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
  中锁边?: XhmrmsbjSbjbItemSbjbItem;
  中铰边?: XhmrmsbjSbjbItemSbjbItem;
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
  正面宽显示?: boolean;
  背面宽?: string;
  背面宽可改?: boolean;
  背面宽显示?: boolean;
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

export const sbjbItemCadKeys1 = ["锁框", "铰框", "顶框"] as const;
export type SbjbItemCadKey1 = (typeof sbjbItemCadKeys1)[number];
export const sbjbItemCadKeys2 = ["锁边", "铰边", "插销边", "小扇插销边", "小扇铰边", "中锁边", "中铰边"] as const;
export type SbjbItemCadKey2 = (typeof sbjbItemCadKeys2)[number];
export const sbjbItemCadKeys3 = [...sbjbItemCadKeys1, ...sbjbItemCadKeys2] as const;
export type SbjbItemCadKey3 = SbjbItemCadKey1 | SbjbItemCadKey2;

export const sbjbItemCadKeys2Map = new Map<SbjbItemCadKey2, SbjbItemCadKey2>([["小扇铰边", "铰边"]]);

export const isSbjbCollection = (collection: CadCollection): collection is "peijianCad" => {
  return collection === "peijianCad";
};
export const isSbjbType = (type: string): type is SbjbItemCadKey3 => {
  return sbjbItemCadKeys3.includes(type as SbjbItemCadKey3);
};
export const isSbjbCad = (collection: CadCollection, cad: CadData): collection is "peijianCad" => {
  return isSbjbCollection(collection) && isSbjbType(cad.type);
};

export interface XhmrmsbjSbjbCadInfo extends Omit<XhmrmsbjSbjbItemSbjbCad, "cad"> {
  cad?: CadData;
  cadForm: CadItemForm<XhmrmsbjSbjbItemSbjbCadInfo>;
  item2?: XhmrmsbjSbjbItemSbjbItem;
  qiliao?: Qiliao | null;
  isFetched?: boolean;
}

export interface XhmrmsbjSbjbCadInfoGrouped extends XhmrmsbjSbjbCadInfo {
  originalIndex: number;
}

export interface SbjbItemSbjbItemForm {
  title: string;
  inputInfos: InputInfo<XhmrmsbjSbjbItemSbjbItem>[];
  item: XhmrmsbjSbjbItemSbjb;
  name: SbjbItemCadKey2;
  item2?: XhmrmsbjSbjbItemSbjbItem;
  item2New: XhmrmsbjSbjbItemSbjbItem;
  qiliaoPrev?: Qiliao | null;
  qiliaoCurr?: Qiliao | null;
  fentiCad1?: CadData;
  fentiCad2?: CadData;
  cadName: string;
}

export interface FentiCadTemplateData {
  key: SbjbItemCadKey2;
  qiliao?: Qiliao;
  form?: SbjbItemSbjbItemForm;
  vertical?: boolean;
}
export const fentiCadTemplateTitles = ["分体1", "分体2"] as const;
export type FentiCadTemplateTitle = (typeof fentiCadTemplateTitles)[number];
export interface XhmrmsbjSbjbItemSbjbFentiCadInfo {
  data: FentiCadTemplateData;
  title: FentiCadTemplateTitle;
}

export interface XhmrmsbjSbjbItemSbjbCadsData {
  fenlei: string;
  item: Partial<XhmrmsbjSbjbItemSbjb>;
  cads: ReturnType<CadData["export"]>[];
}
