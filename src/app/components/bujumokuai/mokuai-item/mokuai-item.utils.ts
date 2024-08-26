import zixuanpeijianTypesInfo from "@assets/json/zixuanpeijianTypesInfo.json";
import {MokuaiItem} from "./mokuai-item.types";

export const getEmptyMokuaiItem = (): MokuaiItem => {
  const item = zixuanpeijianTypesInfo.typesInfo.a.b;
  return {...item, name: "", type: "", order: 0, gongshishuru: "", xuanxiangshuru: "", shuchubianliang: "", shuchuwenben: ""};
};
