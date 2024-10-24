import {ValidatorFn} from "@angular/forms";

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
}
