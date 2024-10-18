import {CadCollection} from "@app/cad/collections";
import {ObjectOf} from "@lucilor/utils";

export interface ExportCache {
  collection: CadCollection;
  ids?: string[];
  direct?: boolean;
  search?: ObjectOf<any>;
  lurushuju?: boolean;
}
