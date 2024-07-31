import {computed, signal} from "@angular/core";
import {TableDataBase2} from "@modules/http/services/cad-data.service.types";

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
