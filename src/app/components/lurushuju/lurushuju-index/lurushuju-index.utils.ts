import {isTypeOf, keysOf, ObjectOf} from "@lucilor/utils";
import {random} from "lodash";
import {cadMatchRules, menjiaoCadTypes, 门缝配置输入, 门铰锁边铰边} from "../xinghao-data";
import {OptionsAll2} from "./lurushuju-index.types";

export const autoFillMenjiao = (data: 门铰锁边铰边, menjiaoOptionsAll: OptionsAll2) => {
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
      for (const key2 of keysOf(data[key1])) {
        for (const key3 of keysOf(data[key1][key2])) {
          if (!data[key1][key2][key3].cad) {
            data[key1][key2][key3].cad = {_id: "1", 名字: key3};
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
  updateMenjiaoForm(data);
};

export const updateMenjiaoForm = (data: 门铰锁边铰边) => {
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
  data.名字 = values.join("_");
};

export const getMenjiaoCadInfos = (data: 门铰锁边铰边) => {
  const menjiaoCadInfos: ObjectOf<{isEmpty: boolean; isFull: boolean}> = {};
  for (const key1 of menjiaoCadTypes) {
    if (!data[key1]) {
      continue;
    }
    menjiaoCadInfos[key1] = {isEmpty: true, isFull: true};
    for (const key2 of keysOf(data[key1])) {
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

export const getCadSearch = (data: 门铰锁边铰边, key1: string, key2: string, key3: string) => {
  const missingValues = [];
  const rule = cadMatchRules[key3];
  if (!rule) {
    throw new Error("没有对应的cad匹配规则");
  }
  const {分类, 选项} = rule;
  for (const name of 选项) {
    if (!data[name]) {
      missingValues.push(name);
    }
  }
  if (missingValues.length > 0) {
    throw new Error("请先选择" + missingValues.join("、"));
  }
  const formValues: ObjectOf<any> = {};
  for (const name of 选项) {
    const value = data[name];
    formValues[name] = value;
  }
  const [包边方向, 开启] = key1.split("+");
  const filter = `
    function fn() {
      var 分类 = ${JSON.stringify(分类)};
      var 选项 = ${JSON.stringify(选项)};
      var form = ${JSON.stringify(formValues)};
      var 包边方向1 = ${JSON.stringify(包边方向)};
      var 开启1 = ${JSON.stringify(开启)};
      var 包边方向2 = this.选项.包边方向;
      var 开启2 = this.选项.开启;
      var matchOption = function (value1, value2, falseIfEmpty) {
        if (value2 === undefined || value2 === null || value2 === "") {
          return !falseIfEmpty;
        }
        if (value2 === "所有") {
          return true;
        }
        if (typeof value2 === "string") {
          value2 = value2.split(";");
        }
        if (!Array.isArray(value1)) {
          value1 = [value1];
        }
        for (var i = 0; i < value1.length; i++) {
          var v = value1[i];
          if (value2.indexOf(v) >= 0) {
            return true;
          }
        }
        return false;
      }
      var check = function () {
        if (包边方向1 === "包边在外") {
          return matchOption(包边方向1, 包边方向2) && matchOption(开启1, 开启2, true);
        } else if (包边方向1 === "包边在内") {
          if (matchOption("包边在内", 包边方向2, true) && matchOption(开启1, 开启2, true)) {
            return true;
          }
          if (开启1 === "外开") {
            return matchOption("包边在外", 包边方向2) && matchOption("内开", 开启2, true);
          } else if (开启1 === "内开") {
            return matchOption("包边在外", 包边方向2) && matchOption("外开", 开启2, true);
          }
        }
      }
      if (!check()) {
        return false;
      }
      if (分类.indexOf(this.分类) < 0) {
        return false;
      }
      for (var i = 0; i < 选项.length; i++) {
        var name = 选项[i];
        var value1 = form[name];
        var value2 = this.选项[name];
        if (!matchOption(value1, value2)) {
          return false;
        }
      }
      return true;
    }
    `;
  const search: ObjectOf<any> = {$where: filter};
  return search;
};
