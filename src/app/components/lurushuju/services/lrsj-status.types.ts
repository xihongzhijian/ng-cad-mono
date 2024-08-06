import {computed, signal} from "@angular/core";
import {OptionsDataData, TableDataBase2} from "@app/modules/http/services/cad-data.service.types";
import {ObjectOf} from "@lucilor/utils";
import {算料数据} from "../xinghao-data";

export type OptionsAll = ObjectOf<OptionsDataData[]>;
export type OptionsAll2 = ObjectOf<{options: OptionsDataData[]; disabled?: boolean; multiple?: boolean}>;

export interface XinghaoData extends TableDataBase2 {
  tupian?: string;
  hidden?: boolean;
  menchuang: string;
  gongyi: string;
  dingdanliucheng?: string;
  算料单模板?: string;
  是否需要激光开料?: boolean;
}

export interface XinghaoMenchuang extends TableDataBase2 {
  gongyis?: XinghaoDataList<XinghaoGongyi>;
}
export interface XinghaoGongyi extends TableDataBase2 {
  menchuang: number;
  xinghaos?: XinghaoDataList<XinghaoData>;
}
export class XinghaoDataList<T> {
  constructor(
    public items = signal<T[]>([]),
    public count = signal<number>(0),
    public index = signal<number | null>(null)
  ) {}

  item = computed(() => {
    const i = this.index();
    if (typeof i === "number") {
      return this.items()[i] || null;
    }
    return null;
  });
}

export interface SuanliaoDataInfo {
  fenleiName: string;
  zuofaName: string;
  suanliaoData: 算料数据;
}

export interface MenshanOption extends OptionsDataData {
  zuchenghuajian?: string;
}
