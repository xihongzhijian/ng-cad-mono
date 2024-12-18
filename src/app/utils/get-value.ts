import {MessageService} from "@modules/message/services/message.service";

export type Value<T> = T | (() => T);

export const getValue: {
  <T>(fromValue: Value<T>): T;
  <T>(fromValue: Value<T>, message: MessageService): T | null;
} = <T>(fromValue: Value<T>, message?: MessageService) => {
  let result: T;
  if (fromValue instanceof Function) {
    if (message) {
      try {
        result = fromValue();
      } catch (error) {
        if (error instanceof Error) {
          message.error(error.message);
        } else {
          console.error(error);
        }
        return null;
      }
    } else {
      result = fromValue();
    }
  } else {
    result = fromValue;
  }
  return result;
};

export const getBooleanStr = (value: boolean) => {
  return value ? "是" : "否";
};
export const getArrayString = (value: any, separator: string) => {
  if (Array.isArray(value)) {
    return value.join(separator);
  } else {
    return "";
  }
};
export const getObjectString = (value: any, separator: string, separatorKv: string) => {
  if (!value || typeof value !== "object") {
    return "";
  }
  const strs: string[] = [];
  for (const key in value) {
    strs.push(`${key}${separatorKv}${value[key]}`);
  }
  return strs.join(separator);
};
export const getValueString = (value: any, opts?: {separator?: string; separatorKv?: string; forceBoolean?: boolean; ndigits?: number}) => {
  const {separator = ",", separatorKv = ":", forceBoolean} = opts || {};
  if (forceBoolean || typeof value === "boolean") {
    return getBooleanStr(value);
  } else if (typeof value === "number") {
    if (typeof opts?.ndigits === "number") {
      return Number(value.toFixed(opts.ndigits)).toString();
    } else {
      return value.toString();
    }
  } else if (Array.isArray(value)) {
    return getArrayString(value, separator);
  } else if (value && typeof value === "object") {
    return getObjectString(value, separator, separatorKv);
  } else if ([null, undefined].includes(value)) {
    return "";
  } else {
    return String(value);
  }
};

export const getNameWithSuffix = (names: string[], name: string, suffix: string, startNum: number) => {
  if (suffix && !names.includes(name)) {
    return name;
  }
  let i = startNum;
  const getSuffix = () => suffix + (i === 0 ? "" : i.toString());
  let suffix2 = getSuffix();
  while (names.includes(name + suffix2)) {
    suffix2 = getSuffix();
    i++;
  }
  return name + suffix2;
};
export const getInsertName = (names: string[], name: string) => getNameWithSuffix(names, name, "", 1);
export const getCopyName = (names: string[], name: string) => getNameWithSuffix(names, name, "_复制", 0);
