import {purgeObject} from "@lucilor/utils";

export interface CadQiegemuban {
  名字: string;
  位置?: "" | "上" | "下";
  高度余量?: string;
  起点微连?: string;
  终点微连?: string;
  微连位置?: string;
  微连长度?: string;
  依附板材边缘?: boolean;
  删除标记线?: boolean;
}

export interface CadQiegemubanGroup {
  index: number;
  qiegemubans: CadQiegemuban[];
}

export const qiegemubanGroupNames = ["锁框", "铰框", "顶框上", "顶框下"] as const;
export type QiegemubanGroupName = (typeof qiegemubanGroupNames)[number];
export const qiegemubanGroupNames2: string[] = [...qiegemubanGroupNames];

export const initQiegemubanGroup = (groups: CadQiegemubanGroup[], index: number) => {
  let group = groups.find((g) => g.index === index);
  if (!group) {
    group = {index, qiegemubans: []};
    groups.push(group);
  }
  return justifyQiegemubanGroup(group);
};

export const justifyQiegemubanGroup = (group: CadQiegemubanGroup) => {
  const items = group.qiegemubans;
  for (const name of qiegemubanGroupNames) {
    if (!items.find((i) => i.名字 === name)) {
      items.push({名字: name});
    }
  }
  const indexsToRemove: number[] = [];
  for (const [i, item] of items.entries()) {
    if (!qiegemubanGroupNames2.includes(item.名字)) {
      indexsToRemove.push(i);
    }
  }
  for (let i = indexsToRemove.length - 1; i >= 0; i--) {
    items.splice(indexsToRemove[i], 1);
  }
  items.sort((a, b) => qiegemubanGroupNames2.indexOf(a.名字) - qiegemubanGroupNames2.indexOf(b.名字));
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
  const emptyItem: Required<CadQiegemuban> = {
    名字: "",
    位置: "",
    高度余量: "",
    起点微连: "",
    终点微连: "",
    微连位置: "",
    微连长度: "",
    依附板材边缘: false,
    删除标记线: false
  };
  return purgeObject(item, emptyItem);
};

export const purgeQiegemubanGroup = (groups: CadQiegemubanGroup[]) => {
  const indexsToRemove: number[] = [];
  for (const [i, group] of groups.entries()) {
    const qiegemubans: CadQiegemuban[] = [];
    for (const item of group.qiegemubans) {
      const item2 = purgeQiegemuban(item);
      if (isQiegemubanEmpty(item2)) {
        continue;
      }
      qiegemubans.push(item2);
    }
    if (qiegemubans.length === 0) {
      indexsToRemove.push(i);
    } else {
      group.qiegemubans = qiegemubans;
    }
  }
  for (let i = indexsToRemove.length - 1; i >= 0; i--) {
    groups.splice(indexsToRemove[i], 1);
  }
  return groups;
};

export const isQiegemubanEmpty = (item: CadQiegemuban) => {
  return !item.位置;
};

export const getQiegemubanFilledCount = (group: CadQiegemubanGroup) => {
  return group.qiegemubans.filter((i) => !isQiegemubanEmpty(i)).length;
};

export const isQiegemubanGroupEmpty = (group: CadQiegemubanGroup) => {
  return getQiegemubanFilledCount(group) === 0;
};
