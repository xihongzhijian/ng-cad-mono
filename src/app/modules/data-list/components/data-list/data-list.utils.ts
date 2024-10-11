import {ObjectOf} from "@lucilor/utils";
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
  isVirtual?: boolean;

  constructor(data: DataListNavNodeRaw) {
    this.import(data);
  }

  hasChild() {
    return this.children && this.children.length > 0;
  }
  isLeaf() {
    return !this.hasChild() && this.itemCount > 0;
  }

  import(data: DataListNavNodeRaw) {
    this.id = data.id;
    this.name = data.name;
    this.order = typeof data.order === "number" ? data.order : 0;
    this.createTime = typeof data.createTime === "number" ? data.createTime : Date.now();
    this.level = typeof data.level === "number" ? data.level : 0;
    this.isVirtual = data.isVirtual;
    if (Array.isArray(data.children)) {
      this.children = data.children.map((child) => new DataListNavNode({...child, level: this.level + 1}));
      sortDataListNavNodeList(this.children);
    } else {
      this.children = undefined;
    }
  }
  export() {
    const data: DataListNavNodeRaw = {
      id: this.id,
      name: this.name,
      order: this.order,
      createTime: this.createTime,
      children: this.children?.map((child) => child.export())
    };
    if (this.order !== 0) {
      data.order = this.order;
    }
    return data;
  }
  clone(resetId = false) {
    const result = new DataListNavNode(this.export());
    if (resetId) {
      result.id = v4();
    }
    return result;
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
    node.isVirtual = true;
    if (updateNavNodes) {
      node.children = Array.from(typesToAdd).map((name) => new DataListNavNode({id: v4(), name, isVirtual: true}));
    } else {
      for (const child of node.children || []) {
        child.isVirtual = true;
      }
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

export const findDataListNavNode = (
  list: DataListNavNode[],
  predicate: (node: DataListNavNode, index: number, arr: DataListNavNode[]) => boolean
): DataListNavNode | null => {
  for (const node of list) {
    if (predicate(node, 0, list)) {
      return node;
    }
    if (node.children) {
      const result = findDataListNavNode(node.children, predicate);
      if (result) {
        return result;
      }
    }
  }
  return null;
};
export const findActiveDataListNavNode = (list: DataListNavNode[], type: string) => {
  return findDataListNavNode(list, (node) => !node.hasChild() && node.name === type);
};

export const getDataListNavNodePath = (
  nodes: DataListNavNode[],
  node: DataListNavNode,
  path: DataListNavNode[] = []
): DataListNavNode[] => {
  for (const node2 of nodes) {
    if (node.id === node2.id) {
      return [...path, node2];
    }
    if (node2.children && node2.children.length > 0) {
      const path2 = getDataListNavNodePath(node2.children, node, [...path, node2]);
      if (path2.length > path.length + 1) {
        return path2;
      }
    }
  }
  return path;
};

export const getDataListNavNodesFlat = function* (nodes: DataListNavNode[]): Generator<DataListNavNode> {
  for (const node of nodes) {
    yield node;
    if (node.children) {
      yield* getDataListNavNodesFlat(node.children);
    }
  }
};

export const moveDataListNavNode = (
  nodes: DataListNavNode[],
  node: DataListNavNode,
  from: DataListNavNode | null,
  to: DataListNavNode | null
) => {
  const removeNode = (parent: DataListNavNode[] | DataListNavNode, ...children: DataListNavNode[]) => {
    if (parent instanceof DataListNavNode) {
      if (!parent.children) {
        return;
      }
      parent = parent.children;
    }
    const ids = children.map((v) => v.id);
    const indexs = parent.map((v, i) => (ids.includes(v.id) ? i : -1)).filter((v) => v !== -1);
    for (const [j, index] of indexs.entries()) {
      parent.splice(index - j, 1);
    }
  };
  const addNode = (parent: DataListNavNode[] | DataListNavNode, ...children: DataListNavNode[]) => {
    const level = parent instanceof DataListNavNode ? parent.level + 1 : 0;
    if (parent instanceof DataListNavNode) {
      if (!parent.children) {
        parent.children = [];
      }
      parent = parent.children;
    }
    for (const child of children) {
      child.level = level;
      delete child.isVirtual;
      if (!parent.some((v) => v.id === child.id)) {
        parent.push(child);
      }
    }
  };

  if (from !== to) {
    if (from) {
      removeNode(from, node);
    } else {
      removeNode(nodes, node);
    }
  }
  if (to) {
    if (to.isLeaf()) {
      const toPath = getDataListNavNodePath(nodes, to);
      const to2 = toPath.at(-2);
      if (to2) {
        const to3 = to.clone(true);
        to3.name += "_软件生成";
        addNode(to3, to, node);
        removeNode(to2, to);
        addNode(to2, to3);
      }
    } else {
      addNode(to, node);
    }
  } else {
    addNode(nodes, node);
  }
};

export const sortDataListItems = <T extends DataListItem>(items: T[]) => {
  const sortedItems: T[] = [];
  type GroupItem = {item: T; index: number};
  const groups: ObjectOf<GroupItem[]> = {};
  const reg = /\d+$/;
  const items2 = items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const item of items2) {
    const name0 = item.name;
    if (typeof name0 !== "string") {
      continue;
    }
    const match = name0.match(reg);
    const index = match?.[0] ? Number(match[0]) : 0;
    const name = name0.replace(reg, "");
    if (!name) {
      sortedItems.push(item);
      continue;
    }
    const groupItem: GroupItem = {item, index};
    if (groups[name]) {
      groups[name].push(groupItem);
    } else {
      groups[name] = [groupItem];
    }
  }
  for (const group of Object.values(groups)) {
    group.sort((a, b) => a.index - b.index);
    for (const groupItem of group) {
      sortedItems.push(groupItem.item);
    }
  }
  return sortedItems;
};
