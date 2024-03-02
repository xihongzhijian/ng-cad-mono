import {ObjectOf} from "@lucilor/utils";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";

export interface FentiCadDialogInput {
  data: FentiCadData;
  cadSize: [number, number];
}

export interface FentiCadDialogOutput {}

export type FentiCadData = ObjectOf<HoutaiCad | null | undefined>;

export interface FentiCadItemInfo {
  key: string;
}
