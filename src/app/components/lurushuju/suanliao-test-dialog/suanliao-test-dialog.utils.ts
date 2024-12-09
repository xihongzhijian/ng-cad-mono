import {MatDialog} from "@angular/material/dialog";
import {Calc, CalcResult, Formulas} from "@app/utils/calc";
import {getNamesStr} from "@app/utils/error-message";
import {CalcZxpjResult, ZixuanpeijianCadItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {calcZxpj} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {matchHoutaiData} from "@views/suanliao/suanliao.utils";
import {cloneDeep, difference} from "lodash";
import {测试用例, 算料公式, 算料数据2} from "../xinghao-data";
import {SuanliaoTestInfo} from "./suanliao-test-dialog.types";

export const filterSlgsList = async (slgsList: 算料公式[], vars: Formulas, calc: CalcService) => {
  const slgsList2: 算料公式[] = [];
  for (const slgs of slgsList) {
    const result = await matchHoutaiData(slgs, vars, calc);
    if (result.isMatched) {
      slgsList2.push(slgs);
    }
  }
  return slgsList2;
};

export const getTestCaseInfo = async (testCase: 测试用例, data: 算料数据2, calc: CalcService) => {
  const {算料公式} = data;
  const cads = cloneDeep(data.算料CAD);
  const info: SuanliaoTestInfo = {slgsList: [], errors: [], allVars: [], requiredVars: [], cads};

  const isValueEmpty = (v: any) => v === "" || v === null || v === undefined;
  const testVars = {...testCase.测试数据};
  for (const [key, value] of Object.entries(testVars)) {
    if (isValueEmpty(value)) {
      delete testVars[key];
    }
  }
  const slgsList = await filterSlgsList(算料公式, testVars, calc);
  info.slgsList = slgsList;
  const formulas: Formulas = {};
  for (const slgs of slgsList) {
    for (const [key, value] of Object.entries(slgs.公式)) {
      if (isValueEmpty(value)) {
        continue;
      }
      if (formulas[key] === undefined) {
        formulas[key] = value;
      } else {
        info.errors.push(`算料公式【${key}】重复`);
      }
      if (typeof value === "string") {
        const vars = Calc.getVars(value);
        for (const v of vars) {
          if (!info.allVars.includes(v)) {
            info.allVars.push(v);
          }
        }
      }
    }
  }
  for (const key in testVars) {
    if (formulas[key] !== undefined) {
      info.errors.push(`测试变量【${key}】与算料公式重复`);
    }
  }
  info.requiredVars = difference(info.allVars, Object.keys(formulas));
  const missingVars = difference(info.requiredVars, Object.keys(testVars));
  if (missingVars.length > 0) {
    info.errors.push(`缺少变量${getNamesStr(missingVars)}`);
    for (const v of missingVars) {
      testCase.测试数据[v] = "";
    }
  }

  return info;
};

export const calcTestCase = async (
  testCase: 测试用例,
  info: SuanliaoTestInfo,
  data: 算料数据2,
  dialog: MatDialog,
  message: MessageService,
  calc: CalcService,
  status: AppStatusService
) => {
  const result = {
    fulfilled: false,
    errors: Array<string>(),
    calcResult: null as null | CalcResult,
    cads: null as null | ZixuanpeijianCadItem[],
    zxpjResult: null as null | CalcZxpjResult
  };
  if (!testCase || !info) {
    return result;
  }
  if (info.errors.length > 0) {
    result.errors.push(`测试用例【${testCase.名字}】存在错误`);
    return result;
  }

  const formulas: Formulas = {};
  for (const slgs of info.slgsList) {
    for (const [key, value] of Object.entries(slgs.公式)) {
      formulas[key] = value;
    }
  }

  result.calcResult = await calc.calcFormulas(formulas, testCase.测试数据);
  if (result.calcResult) {
    const calcResult = result.calcResult;
    const cads = data.算料CAD.map((v) => {
      const data = new CadData(v.json);
      let zhankai = data.zhankai[0];
      if (!zhankai) {
        zhankai = new CadZhankai();
        zhankai.name = data.name;
      }
      const numResult = Calc.calcExpress(`(${zhankai.shuliang})*(${zhankai.shuliangbeishu})`, calcResult.succeed);
      const num = numResult.error ? 1 : numResult.value;
      return {
        data,
        info: {
          houtaiId: v._id,
          zhankai: [
            {
              width: zhankai.zhankaikuan,
              height: zhankai.zhankaigao,
              num,
              originalWidth: zhankai.zhankaikuan
            }
          ],
          calcZhankai: []
        }
      };
    });
    result.cads = cads;
    result.zxpjResult = await calcZxpj(dialog, message, calc, status, calcResult.succeed, [], cads);
  }
  if (result.cads) {
    info.cads = result.cads.map((v, i) => {
      const item = data.算料CAD[i];
      const json = item.json;
      item.json = {};
      const item2 = cloneDeep(item);
      item.json = json;
      item2.json = v.data.export();
      item2.json.calcZhankai = v.info.calcZhankai;
      return item2;
    });
  }
  result.fulfilled = !!result.calcResult?.fulfilled && !!result.zxpjResult?.fulfilled;
  return result;
};
