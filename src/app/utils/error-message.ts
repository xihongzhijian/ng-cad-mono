import {ValidationErrors} from "@angular/forms";
import {MessageService} from "@modules/message/services/message.service";
import {intersection} from "lodash";

export interface ErrorItem<T = undefined> {
  content: string;
  details: ErrorDetail<T>[];
  duplicateVars?: Set<string>;
  fatal?: boolean;
}

export type ErrorDetail<T = undefined> = ErrorDetailText<T>[];

export interface ErrorDetailTextBase {
  text?: string;
  br?: boolean;
  className?: string;
  hiddenWhenAlert?: boolean;
}
export type ErrorDetailText<T = undefined> = (ErrorDetailTextBase & {info?: undefined}) | (ErrorDetailTextBase & {info: T});

export const getNameDetail = <T = undefined>(name: string | ErrorDetailText<T>): ErrorDetail<T> => [
  {text: "【"},
  typeof name === "string" ? {text: name} : name,
  {text: "】"}
];

export const getNamesDetail = <T = undefined>(names: (string | ErrorDetailText<T>)[]): ErrorDetail<T> =>
  names.map((v) => getNameDetail(v)).flat();

export const checkDuplicateVars = <T = undefined>(
  vars1: string[],
  vars2: string[],
  name1: string | ErrorDetailText<T>,
  name2: string | ErrorDetailText<T>,
  details?: ErrorDetail<T>[]
) => {
  const duplicateVars = intersection(vars1, vars2);
  if (duplicateVars.length > 0) {
    const detail: ErrorDetail<T> = [
      ...getNameDetail(name1),
      {text: "与"},
      ...getNameDetail(name2),
      {
        text: `重复：${duplicateVars.join("，")}`
      }
    ];
    details?.push(detail);
    return detail;
  }
  return null;
};

export const getErrorDetailStr = <T>(detail: ErrorDetail<T>) => {
  let str = "";
  for (const {text, br, className, hiddenWhenAlert} of detail) {
    if (br) {
      str += "<br>";
    } else if (text && !hiddenWhenAlert) {
      if (className) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = text;
        str += span.outerHTML;
      } else {
        str += text;
      }
    }
  }
  return str;
};
export const alertError = async <T = undefined>(message: MessageService, error: ErrorItem<T>) => {
  const {content, details} = error;
  const details2: string[] = [];
  for (const detail of details) {
    details2.push(getErrorDetailStr(detail));
  }
  if (content.length > 0 || details2.length > 0) {
    await message.error({content, details: details2});
    return true;
  }
  return false;
};

export const getNamesStr = (names: string[]) => names.map((v) => `【${v}】`).join("");

export class ResultWithErrors<T, K = undefined> {
  errors: ErrorItem<K>[] = [];
  warnings: ErrorItem<K>[] = [];

  get fulfilled() {
    return this.errors.length < 1 && this.warnings.length < 1;
  }
  hasError() {
    return this.errors.length > 0;
  }
  hasFatalError() {
    return this.errors.some((v) => v.fatal);
  }
  hasAllFatalError() {
    return this.errors.every((v) => v.fatal);
  }
  hasWarning() {
    return this.warnings.length > 0;
  }

  constructor(data: T);
  constructor(public data: T) {}

  addError(error: ErrorItem<K>) {
    this.errors.push(error);
    return this;
  }
  addErrorStr(content: string, details: ErrorDetail<K>[] = []) {
    this.errors.push({content, details});
    return this;
  }
  addFatalErrorStr(content: string, details: ErrorDetail<K>[] = []) {
    this.errors.push({content, details, fatal: true});
    return this;
  }

  addWarning(warning: ErrorItem<K>) {
    this.warnings.push(warning);
    return this;
  }
  addWarningStr(content: string, details: ErrorDetail<K>[] = []) {
    this.warnings.push({content, details});
    return this;
  }

  getErrorToAlert() {
    const errorToAlert: ErrorItem<K> = {content: "", details: []};
    for (const [i, error] of this.errors.entries()) {
      if (i > 0) {
        errorToAlert.content += "<br>" + error.content;
      } else {
        errorToAlert.content += error.content;
      }
      errorToAlert.details.push(...error.details);
    }
    return errorToAlert;
  }
  getValidationErrors() {
    const errorToAlert = this.getErrorToAlert();
    let strList: string[];
    if (errorToAlert.content) {
      strList = errorToAlert.content.split("<br>");
    } else {
      strList = errorToAlert.details.map((v) => getErrorDetailStr(v));
    }
    const errors: ValidationErrors = {};
    for (const str of strList) {
      errors[str] = true;
    }
    return errors;
  }
  async alertError(message: MessageService) {
    await alertError(message, this.getErrorToAlert());
  }
  async check(message: MessageService) {
    await this.alertError(message);
    return this.fulfilled;
  }

  learnFrom<R>(result: ResultWithErrors<R, K>) {
    this.errors.push(...result.errors);
    this.warnings.push(...result.warnings);
    return this;
  }
}
