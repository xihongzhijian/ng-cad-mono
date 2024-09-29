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
    输入数据: [],
    选项数据: [],
    ...raw
  };
  for (const optionName in 选项数据选项) {
    if (!result.选项数据.find((v) => v.名字 === optionName)) {
      result.选项数据.push({名字: optionName, 可选项: []});
    }
  }
  return result;
};
