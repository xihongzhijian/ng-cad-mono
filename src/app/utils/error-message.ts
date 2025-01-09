import {MessageService} from "@modules/message/services/message.service";
import {intersection} from "lodash";

export interface ErrorItem<T extends ErrorDetailText = ErrorDetailText> {
  content: string;
  details: ErrorDetail<T>[];
  duplicateVars?: Set<string>;
}

export type ErrorDetail<T extends ErrorDetailText = ErrorDetailText> = T[];

export interface ErrorDetailText {
  text?: string;
  br?: boolean;
  color?: string;
  hiddenWhenAlert?: boolean;
}

export const getNameDetail = (name: string, color?: string): ErrorDetail => [{text: "【"}, {text: name, color}, {text: "】"}];

export const getNamesDetail = (names: string[], color?: string): ErrorDetail => names.map((v) => getNameDetail(v, color)).flat();

export const checkDuplicateVars = (
  vars1: string[],
  vars2: string[],
  name1: string,
  name2: string,
  details?: ErrorDetail[]
): ErrorDetail | null => {
  const duplicateVars = intersection(vars1, vars2);
  if (duplicateVars.length > 0) {
    const detail: ErrorDetail = [
      ...getNameDetail(name1, "red"),
      {text: "与"},
      ...getNameDetail(name2, "red"),
      {
        text: `重复：${duplicateVars.join("，")}`
      }
    ];
    details?.push(detail);
    return detail;
  }
  return null;
};

export const alertError = async (message: MessageService, error: ErrorItem) => {
  const {content, details} = error;
  const details2: string[] = [];
  for (const detail of details) {
    let str = "";
    for (const {text, br, color, hiddenWhenAlert} of detail) {
      if (br) {
        str += "<br>";
      } else if (text && !hiddenWhenAlert) {
        if (color) {
          const span = document.createElement("span");
          span.style.color = color;
          span.textContent = text;
          str += span.outerHTML;
        } else {
          str += text;
        }
      }
    }
    details2.push(str);
  }
  if (content.length > 0 || details2.length > 0) {
    await message.error({content, details: details2});
    return true;
  }
  return false;
};

export const getNamesStr = (names: string[]) => names.map((v) => `【${v}】`).join("");

export class ResultWithErrors<T, K extends ErrorDetailText = ErrorDetailText> {
  errors: ErrorItem<K>[] = [];
  warnings: ErrorItem<K>[] = [];

  get fulfilled() {
    return this.errors.length < 1 && this.warnings.length < 1;
  }
  hasError() {
    return this.errors.length > 0;
  }
  hasWarning() {
    return this.warnings.length > 0;
  }

  constructor(public data: T) {}

  addError(error: ErrorItem<K>) {
    this.errors.push(error);
    return this;
  }
  addErrorStr(content: string, details: ErrorDetail<K>[] = []) {
    this.errors.push({content, details});
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

  async check(message: MessageService) {
    const errorToAlert: ErrorItem<K> = {content: "", details: []};
    for (const [i, error] of this.errors.entries()) {
      if (i > 0) {
        errorToAlert.content += "<br>" + error.content;
      } else {
        errorToAlert.content += error.content;
      }
      errorToAlert.details.push(...error.details);
    }
    await alertError(message, errorToAlert);
    return this.fulfilled;
  }
}
