import {cloneDeep, isEmpty, isEqual} from "lodash";
import {ObjectOf} from "./types";

export const isObject = (obj: any) => typeof obj === "object" && obj !== null && !Array.isArray(obj);

export const importObject = <T extends ObjectOf<any>, K extends ObjectOf<any>>(source: T, defaultObj: K) => {
  for (const key in defaultObj) {
    if (key in source) {
      if (isObject(defaultObj[key]) && isObject(source[key])) {
        importObject(source[key], defaultObj[key]);
      }
    } else {
      source[key] = cloneDeep(defaultObj[key]) as any;
    }
  }
  return source as T & K;
};

export const exportObject = <T extends ObjectOf<any>>(source: T, defaultObj: T) => {
  for (const key in source) {
    if (key in defaultObj) {
      if (isObject(defaultObj[key]) && isObject(source[key])) {
        exportObject(source[key], defaultObj[key]);
        if (isEmpty(source[key])) {
          delete source[key];
        }
      } else if (isEqual(source[key], defaultObj[key])) {
        delete source[key];
      }
    }
  }
  return source;
};
