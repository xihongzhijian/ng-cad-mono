import {isEqual} from "lodash";
import {v4} from "uuid";
import {DataListItem, DataListNavNodeRaw} from "./data-list.types";

export class DataListNavNode {
  id = "";
  name = "";
  order = 0;
  createTime = 0;
  children?: DataListNavNode[];

  level = 0;
  itemCount = 0;
  hidden?: boolean;
  hidden2?: boolean;
  readonly?: boolean;

  constructor(data: DataListNavNodeRaw) {
    this.import(data);
  }

  import(data: DataListNavNodeRaw) {
    this.id = data.id;
    this.name = data.name;
    this.order = typeof data.order === "number" ? data.order : 0;
    this.createTime = typeof data.createTime === "number" ? data.createTime : Date.now();
    this.level = typeof data.level === "number" ? data.level : 0;
    if (Array.isArray(data.children)) {
      this.children = data.children.map((child) => new DataListNavNode({...child, level: this.level + 1}));
      sortDataListNavNodeList(this.children);
    } else {
      this.children = undefined;
    }
  }
  export(): DataListNavNodeRaw {
    return {
      id: this.id,
      name: this.name,
      order: this.order,
      createTime: this.createTime,
      children: this.children?.map((child) => child.export())
    };
  }
}

const unknownNodeName = "未分类";

export const getDataListNavNodeList = (rawList: DataListNavNodeRaw[]) => {
  const node = new DataListNavNode({id: "", name: "", children: rawList, level: -1});
  return node.children || [];
};

export const sortDataListNavNodeList = (list: DataListNavNode[]) => {
  list.sort((a, b) => {
    const orderA = a.name === unknownNodeName ? Infinity : (a.order ?? 0);
    const orderB = b.name === unknownNodeName ? Infinity : (b.order ?? 0);
    if (orderA === orderB) {
      return a.createTime - b.createTime;
    } else {
      return orderA - orderB;
    }
  });
  for (const node of list) {
    if (node.children) {
      sortDataListNavNodeList(node.children);
    }
  }
};

export const updateDataListNavNodeList = (list: DataListNavNode[], items: DataListItem[]) => {
  const typesAll: string[] = [];
  const addType = (nodes: DataListNavNode[]) => {
    for (const node of nodes) {
      if (node.name === unknownNodeName) {
        continue;
      }
      typesAll.push(node.name);
      if (node.children) {
        addType(node.children);
      }
    }
  };
  addType(list);

  const typesToAdd = new Set<string>();
  for (const item of items) {
    if (!typesAll.includes(item.type)) {
      typesToAdd.add(item.type);
    }
  }

  let updateNavNodes = false;
  if (typesToAdd.size > 0) {
    let node = list.find((v) => v.name === unknownNodeName);
    if (node) {
      const names = new Set(node.children?.map((v) => v.name) || []);
      if (!isEqual(names, typesToAdd)) {
        updateNavNodes = true;
      }
    } else {
      node = new DataListNavNode({id: v4(), name: unknownNodeName});
      list.push(node);
      updateNavNodes = true;
    }
    node.readonly = true;
    for (const child of node.children || []) {
      child.readonly = true;
    }
    if (updateNavNodes) {
      node.children = Array.from(typesToAdd).map((name) => new DataListNavNode({id: v4(), name}));
    }
  } else {
    const i = list.findIndex((v) => v.name === unknownNodeName);
    if (i >= 0) {
      list.splice(i, 1);
      updateNavNodes = true;
    }
  }
  return {updateNavNodes};
};
