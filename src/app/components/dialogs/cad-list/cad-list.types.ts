import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {CadItemButton} from "@components/lurushuju/cad-item/cad-item.types";
import {算料公式} from "@components/lurushuju/xinghao-data";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {CadListComponent} from "./cad-list.component";

export const selectModes = ["single", "multiple", "none"] as const;

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
  addCadData?: Partial<CadData>;
  beforeEditCad?: (data: HoutaiCad) => void;
  afterEditCad?: (data: HoutaiCad) => void;
  yaoqiu?: Cad数据要求;
  gongshis?: 算料公式[];
  vars?: ObjectOf<string>;
  title?: string;
  toolbarBtns?: {name: string; onClick?: (component: CadListComponent) => void}[];
  cadItemFormTitleBtns?: CadItemButton<CadListItemInfo>[];
}

export type CadListOutput = CadData[];

export interface CadListItemInfo {
  index: number;
}

export interface CadListPageItem {
  data: HoutaiCad;
  checked: boolean;
  isFetched?: boolean;
  toDelete?: boolean;
}
