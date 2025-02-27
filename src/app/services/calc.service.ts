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
      await this._alert(error, errorMsg);
      return null;
    }
  }

  async calcFormulasPre(formulas: Formulas, errorMsg?: CalcCustomErrorMsg) {
    const result = {error: ""};
    try {
      Calc.calcFormulas(formulas);
    } catch (error) {
      result.error = await this._alert(error, errorMsg);
    }
    return result;
  }

  private async _alert(error: any, errorMsg?: CalcCustomErrorMsg) {
    let err: string = "";
    if (error instanceof CalcSelfReferenceError) {
      err = error.message + "<br><br>";
      err += `${error.varName}<span class="error"> => </span>${error.varValue}`;
    } else if (error instanceof CalcCircularReferenceError) {
      err = error.message + "<br><br>";
      err += `${error.varName1}<span class="error"> => </span>${error.varValue1}<br>`;
      err += `${error.varName2}<span class="error"> => </span>${error.varValue2}`;
    } else {
      console.error(error);
    }
    if (errorMsg) {
      await this.message.error(err);
    }
    return err;
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
    let str = `${prefix}<div class="title small bold">${title}${title2}${code}<br/>1、<span class="accent">公式匹配</span>是否正确；`;
    str += `2、<span class="accent">公式书写</span>是否正确；`;
    str += `3、是否关闭了公式输出！</div><br/><br/>`;
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
      str += `公式: <span class="accent"> ${key} = ${value}</span>, 计算结果: <span class="accent">${calcRes}</span>`;
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
