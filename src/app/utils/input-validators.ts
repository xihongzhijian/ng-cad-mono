import {ValidatorFn} from "@angular/forms";
import {isTypeOf} from "@lucilor/utils";

export class CustomValidators {
  static numberRangeStr: ValidatorFn = (control) => {
    const value = control.value;
    if (!value) {
      return null;
    }
    if (!/^\d+(.\d+)?-\d+(.\d+)?$/.test(value)) {
      return {取值范围不符合格式: true};
    }
    return null;
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
}
