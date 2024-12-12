import {getTypeOf, isTypeOf} from "@lucilor/utils";

export const tryParseJson: {
  <T = any>(str: string): T | null;
  <T = any>(str: string, fallbackValue: T): T;
} = <T = any>(str: string, fallbackValue: T | null = null) => {
  let result: T | null;
  try {
    result = JSON.parse(str);
  } catch {
    result = fallbackValue;
  }
  if (!isTypeOf(fallbackValue, ["null", "undefined"]) && getTypeOf(result) !== getTypeOf(fallbackValue)) {
    result = fallbackValue;
  }
  return result;
};
