import {MongodbDataBase} from "@app/modules/http/services/cad-data.service.types";

export interface DataListNavNodeRaw {
  id: string;
  name: string;
  createTime?: number;
  order?: number;
  children?: DataListNavNodeRaw[];
  level?: number;
  readonly?: boolean;
}
export interface DataListNavData extends MongodbDataBase {
  data?: DataListNavNodeRaw[];
}

export interface DataListItem {
  id: number | string;
  name: string;
  type: string;
}
