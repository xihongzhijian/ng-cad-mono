import {OptionsAll, OptionsAll2, XinghaoData} from "../lurushuju-index/lurushuju-index.types";

export interface SelectGongyiInput {
  xinghaos: XinghaoData[];
  xinghaoOptions: OptionsAll;
  menjiaoOptions?: OptionsAll2;
  excludeXinghaos?: string[];
  excludeGongyis?: string[];
  key?: string;
  multiple?: boolean;
  fenlei?: string;
}

export interface SelectGongyiOutput {
  items: SelectGongyiItemData[];
}

export interface SelectGongyiItem {
  selected?: boolean;
  data: SelectGongyiItemData;
  info?: string[];
}

export interface SelectGongyiItemData {
  型号: string;
  产品分类: string;
  名字: string;
  工艺做法?: string;
  图片?: string;
  data?: any;
  [key: string]: any;
}
