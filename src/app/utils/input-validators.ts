import {ValidatorFn} from "@angular/forms";
import {isTypeOf} from "@lucilor/utils";
import {Calc} from "./calc";

export class CustomValidators {
  static numberRangeStr: ValidatorFn = (control) => {
    const value = control.value;
    if (!value || typeof value !== "string") {
      return null;
    }
    const separators = ["-", "||"];
    let isValid = false;
    for (const sep of separators) {
      let parts = value.split(sep).map((v) => v.trim());
      const toRemove: number[] = [];
      if (sep === "-") {
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === "" && i < parts.length - 1 && parts[i + 1] !== "") {
            parts[i + 1] = "-" + parts[i + 1];
            toRemove.push(i);
          }
        }
      }
      parts = parts.filter((_, i) => !toRemove.includes(i));
      let limit = 2;
      if (sep === "||") {
        limit = Infinity;
      }
      if (parts.length < 2 || parts.length > limit) {
        continue;
      }
      const isAllNumbers = parts.every((part) => part === "" || !isNaN(Number(part)));
      if (isAllNumbers) {
        isValid = true;
        break;
      }
    }
    return isValid ? null : {取值范围不符合格式: true};
  };
  static rangedNumber = (rangeStr: string): ValidatorFn => {
    let [min, max] = rangeStr.split("-").map(Number);
    if (min > max) {
      [min, max] = [max, min];
    }
    if (!isTypeOf(min, "number") || !isTypeOf(max, "number")) {
      return () => null;
    }
    return (control) => {
      const value = control.value;
      if (value < min) {
        return {[`不能小于${min}`]: true};
      }
      if (value > max) {
        return {[`不能大于${max}`]: true};
      }
      return null;
    };
  };
  static lineGongshi: ValidatorFn = (control) => {
    const value = control.value;
    if (typeof value !== "string") {
      return null;
    }
    if (value.includes("变化值")) {
      return {公式不能包含变化值: true};
    }
    return null;
  };
  static lineGuanlianbianhuagongshi: ValidatorFn = (control) => {
    const value = control.value;
    if (typeof value !== "string") {
      return null;
    }
    if (value && !value.includes("变化值")) {
      return {关联变化公式必须包含变化值: true};
    }
    return null;
  };
  static duplicate = (names: string[] | Set<string>): ValidatorFn => {
    return (control) => {
      const value = control.value;
      if ((Array.isArray(names) && names.includes(value)) || (names instanceof Set && names.has(value))) {
        return {不能重复: true};
      }
      return null;
    };
  };
  static varName = (varNames: string[]): ValidatorFn => {
    return (control) => {
      const value = control.value;
      if (!value) {
        return {不能为空: true};
      }
      if (!isNaN(Number(value))) {
        return {不能是纯数字: true};
      }
      if (varNames.filter((v) => v === value).length > 1) {
        return {不能重复: true};
      }
      if (/^[0-9]/.test(value)) {
        return {不能以数字开头: true};
      }
      return null;
    };
  };
  static varExpr = (): ValidatorFn => {
    return (control) => {
      const value = control.value;
      const {error} = Calc.validateExpression(value);
      if (error) {
        return {语法错误: true};
      }
      return null;
    };
  };
}
