import zixuanpeijianTypesInfo from "@assets/json/zixuanpeijianTypesInfo.json";
import {OptionsAll} from "@components/lurushuju/services/lrsj-status.types";
import {getTypeOf} from "@lucilor/utils";
import {isEmpty} from "lodash";
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
    kailiaoshiyongbianliang: "",
    shuchuwenben: ""
  };
};

export const getMokuaiCustomData = (raw: MokuaiItemCustomData | null | undefined, 选项数据选项: OptionsAll | null) => {
  const result: MokuaiItemCustomData = {
    选项数据: [],
    下单显示: "",
    下单时需要满足选项: {},
    ...raw
  };
  updateMokuaiCustomData(result, 选项数据选项);
  return result;
};
export const updateMokuaiCustomData = (data: MokuaiItemCustomData, 选项数据选项: OptionsAll | null) => {
  if (选项数据选项) {
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
  }
  if (getTypeOf(data.下单时需要满足选项) !== "object") {
    data.下单时需要满足选项 = {};
  }
};

export const mokuaiSubmitBefore = (item: Partial<MokuaiItem>) => {
  if (item.自定义数据) {
    updateMokuaiCustomData(item.自定义数据, null);
    delete item.自定义数据.下单时需要满足选项[""];
  }
};
export const mokuaiSubmitAfter = (item: MokuaiItem) => {
  if (item.自定义数据) {
    updateMokuaiCustomData(item.自定义数据, null);
    if (isEmpty(item.自定义数据.下单时需要满足选项)) {
      item.自定义数据.下单时需要满足选项[""] = "";
    }
  }
};
