import {Anchor} from "@components/klkwpz/klkwpz";
import {purgeObject} from "@lucilor/utils";

export interface CadQiegemuban {
  name: string;
  cadId: string;
  destAnchor: Anchor;
  startPoint: "left" | "right";
  heightOffset?: string;
  cutStart?: string;
  cutEnd?: string;
  依附板材边缘?: boolean;
  删除标记线?: boolean;
}

export interface CadQiegemubanGroup {
  index: number;
  qiegemubans: CadQiegemuban[];
}

export const initQiegemubanGroup = (groups: CadQiegemubanGroup[], index: number) => {
  let group = groups.find((g) => g.index === index);
  if (!group) {
    group = {index, qiegemubans: []};
    groups.push(group);
  }
  const items = group.qiegemubans;
  const names = ["锁框", "铰框", "顶框上", "顶框下"];
  for (const name of names) {
    if (!items.find((i) => i.name === name)) {
      items.push({name, cadId: "", destAnchor: [0, 0], startPoint: "left"});
    }
  }
  const indexsToRemove: number[] = [];
  for (const [i, item] of items.entries()) {
    if (!names.includes(item.name)) {
      indexsToRemove.push(i);
    }
  }
  for (let i = indexsToRemove.length - 1; i >= 0; i--) {
    items.splice(indexsToRemove[i], 1);
  }
  items.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
  return group;
};

export const emptyQiegemubanGroup = (groups: CadQiegemubanGroup[], index: number) => {
  const i = groups.findIndex((g) => g.index === index);
  if (i !== -1) {
    groups.splice(i, 1);
  }
};

export const replaceQiegemubanGroup = (groups: CadQiegemubanGroup[], group: CadQiegemubanGroup) => {
  const existingGroup = groups.find((g) => g.index === group.index);
  if (!existingGroup) {
    return;
  }
  existingGroup.qiegemubans = group.qiegemubans;
};

export const purgeQiegemuban = (item: CadQiegemuban) => {
  purgeObject(item, {heightOffset: "", cutStart: "", cutEnd: "", 依附板材边缘: false, 删除标记线: false});
};

export const purgeQiegemubanGroup = (groups: CadQiegemubanGroup[]) => {
  const indexsToRemove: number[] = [];
  for (const [i, {qiegemubans}] of groups.entries()) {
    let hasCadId = false;
    for (const item of qiegemubans) {
      if (item.cadId) {
        hasCadId = true;
      }
      purgeQiegemuban(item);
    }
    if (qiegemubans.length === 0 || !hasCadId) {
      indexsToRemove.push(i);
    }
  }
  for (let i = indexsToRemove.length - 1; i >= 0; i--) {
    groups.splice(indexsToRemove[i], 1);
  }
  return groups;
};

export const isQiegemubanEmpty = (item: CadQiegemuban) => {
  return !item.cadId;
};

export const getQiegemubanFilledCount = (group: CadQiegemubanGroup) => {
  return group.qiegemubans.filter((i) => !isQiegemubanEmpty(i)).length;
};

export const isQiegemubanGroupEmpty = (group: CadQiegemubanGroup) => {
  return getQiegemubanFilledCount(group) === 0;
};
