import {session} from "@app/app.common";
import {ObjectOf} from "@lucilor/utils";
import {OptionsDataData} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {Properties} from "csstype";
import {uniq} from "lodash";
import {InputInfo, InputInfoBoolean, InputInfoNumber, InputInfoOption, InputInfoString, Value} from "./input.types";

export const getValue = <T>(fromValue: Value<T>, message: MessageService) => {
  let result = fromValue;
  if (typeof fromValue === "function") {
    try {
      result = (fromValue as () => T)();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
      return null;
    }
  }
  return result as T;
};

export const parseObjectString = (str: string, objectBefore: ObjectOf<string>, mode: "replace" | "append") => {
  const data = Object.fromEntries(
    str
      .replace(/ /g, "")
      .split("\n")
      .map((v) => {
        const [key, value] = v.split(/[:：]/).map((v) => v.trim());
        return [key, value];
      })
  );
  for (const key in data) {
    if (mode === "replace") {
      if (objectBefore[key] === undefined) {
        continue;
      }
    } else if (mode === "append") {
      if (objectBefore[key] !== undefined) {
        continue;
      }
    } else {
      throw new Error("Invalid mode");
    }
    objectBefore[key] = data[key];
  }
};

export const convertOptions = (options: OptionsDataData[]) => {
  return options.map<InputInfoOption>((v) => ({value: v.name, label: v.label, img: v.img, disabled: v.disabled, vid: v.vid}));
};

export const getGroupStyle = (): Properties => {
  return {display: "flex", marginRight: "-5px", flexWrap: "wrap"};
};

export const getInputStyle = (isInGroup: boolean, others?: Properties) => {
  const result: Properties = {flex: "1 1 0", width: "0", boxSizing: "border-box", ...others};
  if (isInGroup) {
    result.marginRight = "5px";
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
    inputTextAlign: "right",
    ...others
  };
};

export const getUnifiedInputs = <T>(
  id: string,
  inputs: (InputInfoString | InputInfoNumber | InputInfoBoolean)[],
  arr: T[],
  onChange?: () => void
) => {
  const storageKey = `getUnifiedInputs_${id}`;
  let unified: boolean | null = session.load(storageKey);
  if (typeof unified !== "boolean") {
    unified = uniq(arr).length < 2;
  }
  const unifiedInput: InputInfo = {
    type: "boolean",
    label: "一起改变",
    value: unified,
    appearance: "switch",
    onChange: () => {
      unified = !unified;
      session.save(storageKey, unified);
      if (unified) {
        const value = arr[0];
        let isChanged = false;
        for (let i = 1; i < arr.length; i++) {
          if (arr[i] !== value) {
            isChanged = true;
            arr[i] = value;
          }
        }
        if (isChanged) {
          for (const input of inputs) {
            (input.onChange as any)?.(value, input);
          }
        }
      }
    },
    style: getInputStyle(true, {flex: "0 0 100%"})
  };
  for (const input of inputs) {
    const onChange2 = input.onChange as any;
    input.onChange = (val: any) => {
      if (unified) {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = val;
        }
      }
      onChange2?.(val, input);
      onChange?.();
    };
  }
  return [unifiedInput, ...inputs];
};
