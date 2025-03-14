import {MongodbDataBase} from "@modules/http/services/cad-data.service.types";

export interface DataListNavNodeRaw {
  id: string;
  name: string;
  createTime?: number;
  order?: number;
  children?: DataListNavNodeRaw[];
  level?: number;
  isVirtual?: boolean;
}
export interface DataListNavData extends MongodbDataBase {
  data?: DataListNavNodeRaw[];
}

export interface DataListNavNodeItemCounts {
  self: number;
  children: number;
  selfQuery: number;
  childrenQuery: number;
}

export interface DataListItem {
  id: number | string;
  name: string;
  type: string;
  order?: number;
}

export interface DataListNavNameChangeEvent {
  before: string;
  after: string;
}

export interface DataListQueryItemField<T extends DataListItem = DataListItem> {
  field: keyof T;
  title?: string;
}
export const dataListQueryItemFieldsDefault: DataListQueryItemField[] = [
  {field: "name", title: "名字"},
  {field: "type", title: "分类"}
];

export type NodeSelectorMode = "parent" | "leaf";
