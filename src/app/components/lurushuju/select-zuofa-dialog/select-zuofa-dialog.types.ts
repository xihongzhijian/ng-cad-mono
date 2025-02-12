import {工艺做法Item} from "../xinghao-data";

export interface SelectZuofaInput {
  excludeXinghaos?: string[];
  excludeZuofas?: string[];
  key?: keyof 工艺做法Item;
  multiple?: boolean;
  fenlei?: string;
}

export interface SelectZuofaOutput {
  items: SelectZuofaItemData[];
}

export interface SelectZuofaItem {
  selected?: boolean;
  data: SelectZuofaItemData;
  info?: string[];
}

export interface SelectZuofaItemData<T = any> {
  型号: string;
  产品分类: string;
  名字: string;
  工艺做法?: string;
  图片?: string;
  data?: T;
  [key: string]: any;
}
