import {Injectable} from "@angular/core";
import {MessageService} from "@modules/message/services/message.service";
import {isEmpty} from "lodash";
import {setGlobal} from "../app.common";
import {Calc, CalcCircularReferenceError, CalcResult, CalcSelfReferenceError, Formulas} from "../utils/calc";

@Injectable({
  providedIn: "root"
})
export class CalcService {
  calc = Calc;

  constructor(private message: MessageService) {
    setGlobal("calc", this, true);
  }

  async calcFormulas(formulas: Formulas, vars: Formulas = {}, errorMsg?: CalcCustomErrorMsg) {
    try {
      const result = Calc.calcFormulas(formulas, vars);
      const errorStr = this.getErrorFormusStr(result, errorMsg);
      if (errorStr) {
        await this.message.error(errorStr);
      }
      return result;
    } catch (error) {
      if (error instanceof CalcSelfReferenceError) {
        let str = error.message + "<br><br>";
        str += `${error.varName}<span style='color:red'> => </span>${error.varValue}`;
        if (errorMsg) {
          await this.message.error(str);
        }
      } else if (error instanceof CalcCircularReferenceError) {
        let str = error.message + "<br><br>";
        str += `${error.varName1}<span style='color:red'> => </span>${error.varValue1}<br>`;
        str += `${error.varName2}<span style='color:red'> => </span>${error.varValue2}`;
        if (errorMsg) {
          await this.message.error(str);
        }
      } else {
        if (errorMsg) {
          await this.message.alert({content: error});
        }
        console.error(error);
      }
      return null;
    }
  }

  async calcExpression(expression: string, vars: Formulas & {input?: Formulas} = {}, errorMsg?: CalcCustomErrorMsg) {
    const formulas: Formulas = {result: expression};
    const result = await this.calcFormulas(formulas, vars, errorMsg);
    if (!result) {
      return null;
    }
    if (!("result" in result.succeedTrim)) {
      return null;
    }
    return result.succeedTrim.result;
  }

  private getErrorFormusStr(result: CalcResult, errorMsg?: CalcCustomErrorMsg) {
    if (result.fulfilled || !errorMsg) {
      return "";
    }
    const {code = "", title = "", prefix = "", suffix = "", title2 = "错误！请检查："} = errorMsg;
    let str = `${prefix}<h2>${title}${title2}${code}<br/>1、<span style="color:red">公式匹配</span>是否正确；`;
    str += `2、<span style="color:red">公式书写</span>是否正确！</h2><br/><br/>`;
    str += suffix;

    const vars = result.succeed;
    const errorFormulas = isEmpty(result.errorTrim) ? result.error : result.errorTrim;

    if (vars && vars["正在计算CAD名字"]) {
      str += `CAD：${vars["正在计算CAD名字"]}<br/><br/>`;
    }

    for (const key in errorFormulas) {
      const value = errorFormulas[key];
      const calcRes = Calc.replaceVars(value.toString(), vars);

      const calcV = key in vars ? vars[key] : "";
      str += `公式: <span style="color:red"> ${key} = ${value}</span>, 计算结果: <span style="color:red">${calcRes}</span>`;
      if (calcV) {
        str += ` = ${calcV}<br/>`;
      } else {
        str += "<br/>";
      }
    }

    if (!str) {
      return "";
    }

    str += "<br/><br/>";
    return str;
  }
}

export interface CalcCustomErrorMsg {
  code?: string;
  title?: string;
  title2?: string;
  prefix?: string;
  suffix?: string;
  // data?: any;
}
