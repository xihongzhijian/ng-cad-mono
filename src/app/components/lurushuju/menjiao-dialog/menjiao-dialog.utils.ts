import {CadData} from "@lucilor/cad-viewer";
import {isTypeOf, keysOf, ObjectOf} from "@lucilor/utils";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.types";
import {random} from "lodash";
import {OptionsAll2} from "../lurushuju-index/lurushuju-index.types";
import {menjiaoCadTypes, 算料数据, 算料数据2Keys, 门缝配置输入} from "../xinghao-data";

export const autoFillMenjiao = (data: 算料数据, menjiaoOptionsAll: OptionsAll2) => {
  const setOption = (key: string) => {
    const {options, multiple, disabled} = menjiaoOptionsAll[key];
    if (disabled || !options || options.length < 1) {
      return;
    }
    if (multiple) {
      const result = [];
      for (const option of options) {
        if (Math.random() > 0.5) {
          result.push(option.name);
        }
      }
      if (result.length < 1) {
        result.push(options[0]);
      }
      (data as any)[key] = result;
    } else {
      (data as any)[key] = options[random(0, options.length - 1)].name;
    }
  };
  for (const key1 in data) {
    if (key1 in menjiaoOptionsAll) {
      setOption(key1);
    } else if (key1 === menjiaoCadTypes[0]) {
      for (const key2 of 算料数据2Keys) {
        for (const key3 of keysOf(data[key1][key2])) {
          if (!data[key1][key2][key3].cad) {
            data[key1][key2][key3].cad = getHoutaiCad(new CadData({name: key3}));
          }
        }
      }
    } else if (key1 === "锁扇铰扇蓝线宽固定差值") {
      data[key1] = random(0, 100);
    }
  }
  for (const item of 门缝配置输入) {
    data.门缝配置[item.name] = isTypeOf(item.defaultValue, "number") ? (item.defaultValue as number) : 1;
  }
  data.名字 = "autoFill";
  updateMenjiaoForm(data);
};

export const updateMenjiaoForm = (data: 算料数据) => {
  data.开启 = [];
  const menjiaoCadInfos = getMenjiaoCadInfos(data);
  for (const key1 in menjiaoCadInfos) {
    const key2 = key1.split("+")[1];
    if (menjiaoCadInfos[key1].isFull && !data.开启.includes(key2)) {
      data.开启.push(key2);
    }
  }
  const keys = ["vid", "产品分类", "开启", "门铰", "门扇厚度", "锁边", "铰边"] as const;
  const values = keys
    .map((k) => {
      const value = data[k];
      if (Array.isArray(value)) {
        return value.join(",");
      } else {
        return value;
      }
    })
    .filter(Boolean);
  data.名字2 = values.join("_");
};

export const getMenjiaoCadInfos = (data: 算料数据) => {
  const menjiaoCadInfos: ObjectOf<{isEmpty: boolean; isFull: boolean}> = {};
  for (const key1 of menjiaoCadTypes) {
    if (!data[key1]) {
      continue;
    }
    menjiaoCadInfos[key1] = {isEmpty: true, isFull: true};
    for (const key2 of 算料数据2Keys) {
      for (const key3 in data[key1][key2]) {
        if (data[key1][key2][key3].cad) {
          menjiaoCadInfos[key1].isEmpty = false;
        } else {
          menjiaoCadInfos[key1].isFull = false;
        }
      }
    }
  }
  return menjiaoCadInfos;
};
