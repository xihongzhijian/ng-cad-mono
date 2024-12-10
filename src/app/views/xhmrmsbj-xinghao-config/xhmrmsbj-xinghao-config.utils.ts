import {ObjectOf} from "@lucilor/utils";
import {SuanliaoConfigItem} from "./xhmrmsbj-xinghao-config.types";

export const getSuanliaoConfigData = <T extends SuanliaoConfigItem>(
  name: T["名字"],
  position: T["位置"],
  cad: T["cad"],
  raw?: Omit<Partial<T>, "名字" | "位置">
) => {
  const item: T = {
    名字: name,
    位置: position,
    选项: {},
    条件: []
  } as unknown as T;
  if (cad) {
    item.cad = cad;
  }
  if (raw) {
    Object.assign(item, raw);
  }
  return item;
};

export const getSuanliaoConfigItemCadSearch = (key: string): ObjectOf<any> => {
  switch (key) {
    case "企料前后封口":
      return {分类: "企料封口"};
    default:
      return {};
  }
};
