import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {GetOptionsResultItem} from "@modules/http/services/cad-data.service.types";

export interface CadOptionsInput {
  data?: CadData;
  name: string;
  checkedItems?: string[];
  checkedVids?: number[];
  multi?: boolean;
  xinghao?: string;
  filter?: ObjectOf<any>;
  fields?: string[];
  nameField?: string;
  options?: GetOptionsResultItem[];
  defaultValue?: {value?: string; required?: boolean};
  openInNewTab?: boolean;
  useLocalOptions?: boolean;
  info?: ObjectOf<any>;
  noImage?: boolean;
  typeFiltering?: {field: string; title: string};
}

export interface CadOptionsOutput {
  options: TableDataBase[];
  defaultValue?: string;
}

export interface CadOptionsPageDataItem extends GetOptionsResultItem {
  checked: boolean;
}
