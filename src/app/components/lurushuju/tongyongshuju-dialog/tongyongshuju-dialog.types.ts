import {ObjectOf} from "@lucilor/utils";
import {MongodbDataBase, TableDataBase} from "@modules/http/services/cad-data.service.types";

export interface TongyongshujuInput {}

export interface TongyongshujuOutput {}

export interface TongyongshujuData extends TableDataBase {
  bangzhuwendang: string;
  cadmingziyaoqiu: string;
  cadshaixuanyaoqiu: string;
  cadxuanxiangyaoqiu: string;
  cadyaoqiu: string;
  xiaodaohang: string;
  xiaodaohang_id: number;
  xuyaocad: "" | "需要" | "不需要" | "可以没有";

  active?: boolean;
  url?: string;
}

export interface TongyongshujuActiveItem {
  index: number;
  data: TongyongshujuTableItem[];
}

export interface TongyongshujuTableItem extends TableDataBase {
  active: boolean;
}

export interface TongyongshujuActiveCadList {
  index?: number;
  data: TongyongshujuCadItem[];
}

export interface TongyongshujuCadItem extends MongodbDataBase {
  选项?: ObjectOf<string>;
}
