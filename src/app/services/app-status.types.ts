import {ValidationErrors} from "@angular/forms";
import {CadCollection} from "@app/cad/collections";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {SuanliaoDataParams, 算料公式} from "@components/lurushuju/xinghao-data";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";

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
  mokuaiName?: string;
}

export interface AppUser extends TableDataBase {
  isAdmin: boolean;
}

export interface HoutaiInputOptions {
  选项: string[];
  模块选项: string[];
  公式: string[];
}
