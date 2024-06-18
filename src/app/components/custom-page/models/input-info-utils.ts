import {InputInfoNumber} from "@app/modules/input/components/input.types";
import {Properties} from "csstype";

export const getGroupStyle = (): Properties => {
  return {display: "flex", marginRight: "-5px", flexWrap: "wrap"};
};

export const getInputStyle = (isInGroup: boolean, others?: Properties) => {
  const result: Properties = {flex: "1 1 0", width: "0", boxSizing: "border-box", ...others};
  if (isInGroup) {
    result.paddingRight = "5px";
  }
  return result;
};

export const getNumberUnitInput = <T>(
  isInGroup: boolean,
  label: string,
  unit: string,
  style?: Properties,
  others?: Partial<InputInfoNumber<T>>
): InputInfoNumber<T> => {
  return {
    type: "number",
    label,
    suffixTexts: [{name: unit}],
    style: getInputStyle(isInGroup, style),
    ndigits: 2,
    ...others
  };
};
