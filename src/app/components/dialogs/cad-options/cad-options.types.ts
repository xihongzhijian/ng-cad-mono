import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {GetOptionsResultItem} from "@modules/http/services/cad-data.service.types";
import {InputInfoObject, InputInfoPart} from "@modules/input/components/input.types";

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
  refreshOptions?: () => Promise<GetOptionsResultItem[]>;
  defaultValue?: {value?: string; required?: boolean};
  optionOptions?: {value?: ObjectOf<ObjectOf<string> | undefined>; info?: InputInfoPart<InputInfoObject<string, string, string>>};
  openInNewTab?: boolean;
  useLocalOptions?: boolean;
  info?: ObjectOf<any>;
  noImage?: boolean;
  typeFiltering?: {field: string; title: string};
  itemBtns?: {name: string; onClick: (item: GetOptionsResultItem) => void; hidden?: boolean}[];
}

export interface CadOptionsOutput {
  options: TableDataBase[];
  newTabChanged: boolean;
  defaultValue?: string;
  optionOptions?: ObjectOf<ObjectOf<string> | undefined>;
}
