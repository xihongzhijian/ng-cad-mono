import {ObjectOf} from "@lucilor/utils";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {Cad数据要求} from "../xinghao-data";

export interface FentiCadDialogInput {
  data: FentiCadData;
  cadSize: [number, number];
  cad数据要求?: Cad数据要求;
}

export interface FentiCadDialogOutput {}

export type FentiCadData = ObjectOf<HoutaiCad | null | undefined>;

export interface FentiCadItemInfo {
  key: string;
}
