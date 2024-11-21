import {getTypeOf} from "@lucilor/utils";

export const tryParseJson = <T = any>(str: string, fallbackValue: T) => {
  let result: T;
  try {
    result = JSON.parse(str);
  } catch {
    result = fallbackValue;
  }
  if (getTypeOf(result) !== getTypeOf(fallbackValue)) {
    result = fallbackValue;
  }
  return result;
};
