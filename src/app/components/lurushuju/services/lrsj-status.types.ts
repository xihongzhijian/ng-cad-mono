import {TableDataBase2} from "@app/utils/table-data/table-data-base";
import {ZuoshujuTableData} from "@app/utils/table-data/zuoshuju-data";
import {ObjectOf} from "@lucilor/utils";
import {OptionsDataData} from "@modules/http/services/cad-data.service.types";
import {MenjiaoCadType} from "../xinghao-data";

export type OptionsAll = ObjectOf<OptionsDataData[]>;
export type OptionsAll2 = ObjectOf<{
  options: OptionsDataData[];
  disabled?: boolean;
  multiple?: boolean;
  useDialog?: boolean;
  required?: boolean;
}>;

export interface XinghaoData extends TableDataBase2, ZuoshujuTableData {
  tupian?: string;
  hidden?: boolean;
  menchuang: string;
  gongyi: string;
  dingdanliucheng?: string;
  算料单模板?: string;
  是否需要激光开料?: boolean;
  下单显示没有配件的板材分组?: boolean;
  数据已录入完成?: boolean;
}

export interface XinghaoMenchuang extends TableDataBase2 {
  xiayijigongyi?: string;
  gongyis?: XinghaoDataList<XinghaoGongyi>;
}
export interface XinghaoGongyi extends TableDataBase2 {
  xinghaos?: XinghaoDataList<XinghaoData>;
}
export class XinghaoDataList<T> {
  constructor(
    public items: T[] = [],
    public count = 0,
    public index: number | null = null
  ) {}

  get item() {
    const i = this.index;
    if (typeof i === "number") {
      return this.items[i];
    }
    return null;
  }

  clone() {
    return new XinghaoDataList<T>(this.items, this.count, this.index);
  }
}

export interface SuanliaoDataInfo {
  fenleiName: string;
  zuofaName: string;
  suanliaoDataIndex: number;
}
export interface SuanliaoCadsInfo {
  key1: MenjiaoCadType;
}

export interface MenshanOption extends OptionsDataData {
  zuchenghuajian?: string;
}

export interface LrsjInfo {
  项目?: string;
  门窗?: string;
  工艺?: string;
  型号?: string;
  产品分类?: string;
  工艺做法?: string;
  门铰锁边铰边?: string;
  包边方向?: string;
  changeProject?: boolean;
}

export const dataCacheKeys = ["xinghaoOptions", "gongyiOptions", "menjiaoOptions"] as const;
export type DataCacheKey = (typeof dataCacheKeys)[number];
