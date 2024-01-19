import {CadCollection} from "@app/cad/collections";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";

export const selectModes = ["single", "multiple"] as const;

export type SelectMode = (typeof selectModes)[number];

export interface CadListInput {
  selectMode: SelectMode;
  checkedItems?: string[];
  checkedItemsLimit?: number | number[];
  options?: CadData["options"];
  collection: CadCollection;
  qiliao?: boolean;
  search?: ObjectOf<any>;
  standaloneSearch?: boolean;
  fixedSearch?: ObjectOf<any>;
  pageSize?: number;
  source?: CadData[];
  raw?: boolean;
  addCadData?: Omit<Partial<HoutaiCad>, "_id">;
}

export type CadListOutput = CadData[];
