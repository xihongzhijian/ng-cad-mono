import {Formulas} from "@app/utils/calc";
import {toFixed} from "@app/utils/func";
import {输入} from "@components/lurushuju/xinghao-data";
import {CalcService} from "@services/calc.service";
import {isBetween} from "packages/utils/lib";
import {FormulaInfo} from "./formulas.types";

export const getFormulaInfos = (
  calc: CalcService,
  formulas: Formulas,
  vars?: Formulas,
  input?: {shurus: 输入[]; onChange: (val: number) => void}
) => {
  const infos: FormulaInfo[] = [];
  const getValues = (val: string | number) => {
    const values: FormulaInfo["values"] = [];
    if (typeof val === "number") {
      values.push({eq: true, name: toFixed(val, 2)});
    } else if (typeof val === "string") {
      val = val.trim();
      const valReplaced = val.replaceAll(/^(.*)扇.面蓝线宽/g, "$1扇蓝线宽");
      values.push({eq: true, name: valReplaced});
      const val2 = calc.calc.replaceVars(val, vars);
      if (val !== val2) {
        values.push({eq: true, name: val2});
      }
    }
    return values;
  };
  for (const [key, value] of Object.entries(formulas)) {
    const keys: FormulaInfo["keys"] = [{eq: true, name: key}];
    const values: FormulaInfo["values"] = getValues(value);
    if (vars && key in vars) {
      const valuePrev = values.at(-1)?.name;
      const value2 = getValues(vars[key]).filter((v) => v.name !== valuePrev);
      if (value2.length > 0) {
        const valueNext = value2[0].name;
        let calcResult = calc.calc.calcExpress(`(${valuePrev}) === (${valueNext})`, vars);
        if (calcResult.value !== true) {
          calcResult = calc.calc.calcExpress(`(\`${valuePrev}\`) === (\`${valueNext}\`)`, vars);
        }
        if (calcResult.value !== true) {
          calcResult = calc.calc.calcExpress(`(eval(\`${valuePrev}\`)) === (\`${valueNext}\`)`, vars);
        }
        value2[0].eq = calcResult.value === true;
        values.push(...value2);
      }
    }
    const valueLast = values.at(-1);
    if (valueLast && input) {
      const shuru = input.shurus.find((v) => v.名字 === key);
      if (shuru) {
        const range = shuru.取值范围.split("-").map((v) => parseFloat(v)) || [];
        const getNum = (n: any, defaultVal: number) => {
          if (typeof n === "number" && !isNaN(n)) {
            return n;
          }
          return defaultVal;
        };
        if (["undefined", "null", ""].includes(String(formulas[key]))) {
          formulas[key] = shuru.默认值;
        }
        const min = getNum(range[0], -Infinity);
        const max = getNum(range[1], Infinity);
        valueLast.inputInfo = {
          type: "number",
          label: "",
          model: {key, data: formulas},
          readonly: !shuru.可以修改,
          validators: (control) => {
            const val = control.value;
            if (!isBetween(val, min, max)) {
              return {超出取值范围: true};
            }
            return null;
          },
          onChange: (val) => {
            input.onChange(val);
          }
        };
      }
    }
    infos.push({keys, values});
  }
  return infos;
};
