import zixuanpeijianTypesInfo from "@assets/json/zixuanpeijianTypesInfo.json";
import {OptionsAll} from "@components/lurushuju/services/lrsj-status.types";
import {MokuaiItem, MokuaiItemCustomData} from "./mokuai-item.types";

export const getEmptyMokuaiItem = (): MokuaiItem => {
  const item = zixuanpeijianTypesInfo.typesInfo.empty.empty;
  return {
    ...item,
    name: "",
    type: "",
    order: 0,
    gongshishuru: "",
    xuanxiangshuru: "",
    shuchubianliang: "",
    xiaoguotushiyongbianliang: "",
    shuchuwenben: ""
  };
};

export const getMokuaiCustomData = (raw: MokuaiItemCustomData | null | undefined, 选项数据选项: OptionsAll) => {
  const result: MokuaiItemCustomData = {
    选项数据: [],
    下单显示: "",
    ...raw
  };
  updateMokuaiCustomDataOptions(result, 选项数据选项);
  return result;
};
export const updateMokuaiCustomDataOptions = (data: MokuaiItemCustomData, 选项数据选项: OptionsAll) => {
  const optionsOld = data.选项数据;
  data.选项数据 = [];
  for (const key in 选项数据选项) {
    const item = optionsOld.find((v) => v.名字 === key);
    if (item) {
      data.选项数据.push(item);
    } else {
      data.选项数据.push({名字: key, 可选项: []});
    }
  }
};
