import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {MongodbDataBase2} from "@modules/http/services/cad-data.service.types";
import {difference, intersection, isEmpty} from "lodash";
import {splitOptions} from "../app.common";
import {Calc, Formulas} from "./calc";
import {toFixed} from "./func";

export const matchCadData = (data: CadData[], materialResult: Formulas) => {
  if (isEmpty(materialResult)) {
    return [];
  }

  // 循环筛选
  return data.filter((value) => {
    // 判断选项
    if (!isOptionsOK(value.options, materialResult)) {
      return false;
    }

    // 判断条件
    if (!isConditionOK(value.conditions, materialResult)) {
      return false;
    }

    return true;
  });
};

export const matchMongoData = <T extends MongodbDataBase2>(data: T[], materialResult: Formulas) => {
  if (isEmpty(materialResult)) {
    return [];
  }

  return data.filter((value) => {
    if (!isOptionsOK(value.选项, materialResult)) {
      return false;
    }

    if (!isConditionOK(value.条件, materialResult)) {
      return false;
    }

    return true;
  });
};

export const isOptionOK = (value1: any, value2: any, exclusive: boolean) => {
  if (typeof value1 === "string") {
    value1 = value1.replace(" ", "");
  }
  // 去掉空, '', 0, false, null
  let values1: string[] = [];
  if (Array.isArray(value1)) {
    values1 = value1.filter((v) => v);
  } else {
    values1 = splitOptions(value1).filter((v) => v);
  }

  // 去除空格
  values1 = values1.map((v) => v.replace(" ", ""));

  // 1、选择所有, 不判断,直接通过
  if (values1.some((v) => ["所有", "全部"].includes(v))) {
    return true;
  }

  // 2、当前结果没有选项,结束不通过
  if (value2 === undefined) {
    return false;
  }

  // 4、判断当前选项是否满足选项要求,例如当前key：包边
  // option：a,b,c,不选e；
  // current：【a,c】,满足；【a,e】,不满足；
  // 说明,选项内部不选必须满足,其余选上某些就满足；选项与选项必须同时满足
  let values2: string[];
  if (Array.isArray(value2)) {
    values2 = value2;
  } else {
    values2 = [value2];
  }

  const xuan: string[] = [];
  for (const option of values1) {
    if (option.includes("不选")) {
      if (values2.includes(option.replace("不选", ""))) {
        return false;
      }
    } else {
      xuan.push(option);
    }
  }
  values1 = xuan;

  // 除了不选外,没有选项,认为是全部,通过筛选
  if (values1.length < 1) {
    return true;
  }

  // 由于这里全都是选项，每一个值理论上都是字符串，将数字都转为字符串做比较
  for (let i = 0; i < values2.length; i++) {
    const val = values2[i];

    // 只处理数字
    if (typeof val !== "number") {
      continue;
    }

    values2[i] = toFixed(val, 3);
  }

  for (let i = 0; i < values1.length; i++) {
    const val = values1[i];

    // 只处理数字
    if (typeof val !== "number") {
      continue;
    }

    values1[i] = toFixed(val, 3);
  }

  if (exclusive) {
    return difference(values2, value1).length < 1;
  } else {
    return intersection(values2, value1).length > 0;
  }
};
export const isOptionsOK = (options: ObjectOf<string>, materialResult: ObjectOf<any>) => {
  if (isEmpty(options)) {
    return true;
  }

  for (const key in options) {
    const value1 = options[key];
    const value2 = materialResult[key];
    if (!isOptionOK(value1, value2, true)) {
      return false;
    }
  }

  return true;
};

export const canOptionsOverlap = (options1: ObjectOf<string>, options2: ObjectOf<string>) => {
  if (isEmpty(options1) || isEmpty(options2)) {
    return true;
  }
  const keys1 = Object.keys(options1);
  const keys2 = Object.keys(options2);
  const keys = intersection(keys1, keys2);
  if (keys.length < 1) {
    return false;
  }
  for (const key of keys) {
    const value1 = splitOptions(options1[key]);
    const value2 = splitOptions(options2[key]);
    if (!(isOptionOK(value1, value2, false) || isOptionOK(value2, value1, false))) {
      return false;
    }
  }
  return true;
};

export const isConditionOK = (conditions: string[], vars: ObjectOf<any>, errorAlert = true) => {
  if (isEmpty(conditions)) {
    return true;
  }
  for (const condition of conditions) {
    if (!isConditionOneOK(condition, vars, errorAlert)) {
      return false;
    }
  }
  return true;
};

const isConditionOneOK = (condition: string, vars: ObjectOf<any>, errorAlert = true) => {
  if (!condition) {
    return true;
  }
  condition = condition.replaceAll(" ", "").replaceAll(" ", ""); // 替换去除中文英文空格
  if (condition === "") {
    return true;
  }
  condition = convertChineseSymbol(condition);
  delete vars.R;
  delete vars.T;
  const result = Calc.calcExpress(`!!(${condition})`, vars);
  if (result.error) {
    if (errorAlert) {
      throw new Error(`计算条件出错： ${condition}<br />${result.error}`);
    }
  }
  return result.value;
};

const convertChineseSymbol = (str: string): string => {
  if (!str || typeof str !== "string") {
    return str;
  }

  const convertMap = [
    ["“", '"'],
    ["”", '"'],
    ["‘", "'"],
    ["’", "'"],
    ["，", ","]
  ];

  convertMap.forEach((kv) => {
    const [original, replace] = kv;

    str = str.replace(new RegExp(original, "g"), replace);
  });

  return str;
};

export const matchOptionFn = `
function (value1, value2, falseIfEmpty) {
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
    if (typeof value1 === "string") {
      value1 = value1.split(";");
    } else {
      value1 = [value1];
    }
  }
  for (var i = 0; i < value1.length; i++) {
    var v = value1[i];
    if (value2.indexOf(v) >= 0) {
      return true;
    }
  }
  return false;
}`;

export const matchOptionsFn = `
function (options1, options2, falseIfEmpty) {
  if (!options1) {
    return true;
  }
  if (!options2) {
    return !falseIfEmpty;
  }
  var matchOption = ${matchOptionFn};
  for (var key in options1) {
    if (!matchOption(options1[key], options2[key], falseIfEmpty)) {
      return false;
    }
  }
  return true;
}`;
