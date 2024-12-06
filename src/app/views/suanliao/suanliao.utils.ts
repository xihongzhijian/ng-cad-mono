import {splitOptions} from "@app/app.common";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf} from "@lucilor/utils";
import {CalcCustomErrorMsg, CalcService} from "@services/calc.service";
import {XhmrmsbjDataMsbjInfos} from "@views/xhmrmsbj/xhmrmsbj.types";
import {getMokuaiObjectKey} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {difference} from "lodash";
import {HoutaiData, SuanliaoCalcError} from "./suanliao.types";

export const matchOptions = async (options: CadData["options"] | null | undefined, vars: ObjectOf<any>) => {
  const result = {fulfilled: true, isMatched: true};
  if (!options || typeof options !== "object" || Object.keys(options).length < 1) {
    return result;
  }
  for (let [key, value] of Object.entries(options)) {
    key = key.replaceAll(" ", "");
    if (typeof value === "string") {
      value = value.trim();
    }
    if (["所有", "全部"].includes(value)) {
      continue;
    }
    const value2 = vars[key];
    if (value2 === undefined || value2 === null) {
      result.isMatched = false;
      return result;
    }
    const valueArr = splitOptions(value);
    const value2Arr = Array.isArray(value2) ? value2 : [value2];
    for (const v of valueArr) {
      const excludeMatch = v.match(/不选(.+)/);
      if (excludeMatch?.[1] && value2Arr.includes(excludeMatch[1])) {
        result.isMatched = false;
        return result;
      }
      if (difference(value2Arr, valueArr).length > 0) {
        result.isMatched = false;
        return result;
      }
    }
  }
  return result;
};

export const matchConditions = async (
  conditions: CadData["conditions"] | null | undefined,
  vars: ObjectOf<any>,
  calc: CalcService,
  errorMsg?: CalcCustomErrorMsg
) => {
  const result = {fulfilled: true, isMatched: true, error: null as null | SuanliaoCalcError};
  if (!Array.isArray(conditions) || conditions.length < 1) {
    return result;
  }
  for (const condition of conditions) {
    if (!condition.trim()) {
      continue;
    }
    const calcResult = await calc.calcExpression(condition, vars, errorMsg);
    if (calcResult === null) {
      result.fulfilled = false;
      result.isMatched = false;
      result.error = {message: `${errorMsg?.title || "计算条件"}出错：${condition}`};
      return result;
    }
    if (!calcResult) {
      result.isMatched = false;
      return result;
    }
  }
  return result;
};

export const matchHoutaiData = async (
  houtaiData: HoutaiData,
  vars: ObjectOf<any>,
  calc: CalcService,
  opts?: {errorMsgCon?: CalcCustomErrorMsg}
) => {
  const result = {fulfilled: true, isMatched: true, error: null as null | SuanliaoCalcError};
  const reuslt1 = await matchOptions(houtaiData.选项, vars);
  const reuslt2 = await matchConditions(houtaiData.条件, vars, calc, opts?.errorMsgCon);
  result.fulfilled = reuslt1.fulfilled && reuslt2.fulfilled;
  result.isMatched = reuslt1.isMatched && reuslt2.isMatched;
  result.error = reuslt2.error;
  return result;
};

export const resetInputs = (data: XhmrmsbjDataMsbjInfos, dataOld: XhmrmsbjDataMsbjInfos, mokuaiIds?: number[]) => {
  for (const menshanKey of keysOf(data)) {
    const msbjInfoOld = dataOld[menshanKey];
    const msbjInfoNew = data[menshanKey];
    if (!msbjInfoOld || !msbjInfoNew) {
      continue;
    }
    const varNames = new Set<string>();
    const xxgsKeys = new Set<string>();
    for (const node of msbjInfoNew.模块节点 || []) {
      for (const mokuai of node.可选模块) {
        if (!mokuaiIds || mokuaiIds.includes(mokuai.id)) {
          for (const arr of mokuai.gongshishuru.concat(mokuai.xuanxiangshuru)) {
            varNames.add(arr[0]);
          }
          for (const xxgs of mokuai.xuanxianggongshi) {
            xxgsKeys.add(getMokuaiObjectKey(node, mokuai, xxgs._id));
          }
        }
      }
    }
    for (const varName of varNames) {
      if (msbjInfoOld.输入值 && varName in msbjInfoOld.输入值) {
        if (!msbjInfoNew.输入值) {
          msbjInfoNew.输入值 = {};
        }
        msbjInfoNew.输入值[varName] = msbjInfoOld.输入值[varName];
      } else {
        delete msbjInfoNew.输入值?.[varName];
      }
    }
    for (const xxgsKey of xxgsKeys) {
      if (msbjInfoOld.选项公式输入值 && xxgsKey in msbjInfoOld.选项公式输入值) {
        if (!msbjInfoNew.选项公式输入值) {
          msbjInfoNew.选项公式输入值 = {};
        }
        msbjInfoNew.选项公式输入值[xxgsKey] = msbjInfoOld.选项公式输入值[xxgsKey];
      } else {
        delete msbjInfoNew.选项公式输入值?.[xxgsKey];
      }
    }
    for (const options of Object.values(msbjInfoNew.模块选项 || {})) {
      for (const option of options) {
        if (option.选中值) {
          delete option.选中值;
        }
      }
    }
  }
};
