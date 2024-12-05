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

export const getNameDetail = (name: string): ErrorDetail => [{text: "【"}, {text: name, color: "red"}, {text: "】"}];

export const getNamesDetail = (names: string[]): ErrorDetail => names.map((v) => getNameDetail(v)).flat();

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

export const alertError = async (message: MessageService, error: ErrorItem) => {
  const {content, details} = error;
  const details2 = details.map((detail) => {
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
    return str;
  });
  if (details) {
    return await message.error({content, details: details2});
  }
  return null;
};
