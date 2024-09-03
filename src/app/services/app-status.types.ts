import {ValidationErrors} from "@angular/forms";
import {CadCollection} from "@app/cad/collections";
import {SuanliaoDataParams, 算料公式} from "@components/lurushuju/xinghao-data";
import {CadData} from "@lucilor/cad-viewer";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ObjectOf} from "packages/utils/lib";

export interface Loader {
  id: string;
  start: boolean;
  text?: string;
}

export type CadPoints = {x: number; y: number; active: boolean; lines: string[]}[];

export interface CadComponentsStatus {
  selected: CadData[];
  mode: "single" | "multiple";
  selectable: boolean;
}

export interface OpenCadOptions {
  data?: CadData;
  collection?: CadCollection;
  center?: boolean;
  beforeOpen?: (data: CadData) => any;
  isLocal?: boolean;
  isDialog?: boolean;
  suanliaogongshiInfo?: SuanliaogongshiInfo;
  suanliaoTablesInfo?: {params: SuanliaoDataParams};
  extraData?: Partial<CadData>;
  gongshis?: 算料公式[] | null;
  validator?: (data: CadData) => ValidationErrors | null;
  query?: ObjectOf<string>;
}

export interface AppUser extends TableDataBase {
  isAdmin: boolean;
}
