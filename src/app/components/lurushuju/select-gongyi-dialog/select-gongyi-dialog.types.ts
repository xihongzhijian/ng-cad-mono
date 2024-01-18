import {OptionsAll} from "../lurushuju-index/lurushuju-index.types";

export interface SelectGongyiInput {
  options: OptionsAll;
  excludeXinghaos?: string[];
}

export interface SelectGongyiOutput {
  items: SelectGongyiItemData[];
}

export interface SelectGongyiItem {
  selected?: boolean;
  data: SelectGongyiItemData;
}

export interface SelectGongyiItemData {
  型号: string;
  产品分类: string;
  名字: string;
  图片: string;
}
