import {filePathUrl, session} from "@app/app.common";
import {Value} from "@app/utils/get-value";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {OptionsDataData} from "@modules/http/services/cad-data.service.types";
import {Properties} from "csstype";
import {uniq} from "lodash";
import {
  InputInfo,
  InputInfoArray,
  InputInfoBoolean,
  InputInfoImage,
  InputInfoNumber,
  InputInfoObject,
  InputInfoOption,
  InputInfoOptions,
  InputInfoPart,
  InputInfoSelectMultiple,
  InputInfoSelectSingle,
  InputInfoString
} from "./input.types";

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

export const convertOptions = (options: OptionsDataData[] | undefined) => {
  if (!Array.isArray(options)) {
    return [];
  }
  return options.map<InputInfoOption<string>>((v) => ({value: v.name, label: v.label, img: v.img, disabled: v.disabled, vid: v.vid}));
};

export const getGroupStyle = (): Properties => {
  return {display: "flex", marginRight: "-5px", flexWrap: "wrap"};
};

export const getInputStyle = (isInGroup: boolean, others?: Properties) => {
  const result: Properties = {boxSizing: "border-box"};
  if (isInGroup) {
    result.flex = "1 1 0";
    result.width = "0";
    result.marginRight = "5px";
  }
  Object.assign(result, others);
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

export type InputInfoWithDataPart<T extends InputInfo> = Omit<InputInfoPart<T>, "model" | "value">;
export class InputInfoWithDataGetter<T> {
  constructor(
    public data: T,
    public others?: Omit<InputInfoPart, "model">
  ) {}

  string(key: keyof T, others?: InputInfoWithDataPart<InputInfoString>): InputInfoString {
    return {
      type: "string",
      label: String(key),
      model: {data: this.data, key},
      ...this.others,
      ...others
    };
  }

  selectSingle(
    key: keyof T,
    options: Value<string[]>,
    others?: InputInfoWithDataPart<InputInfoSelectSingle<T, any>>
  ): InputInfoSelectSingle<T, any>;
  selectSingle<K>(
    key: keyof T,
    options: Value<InputInfoOptions<K>>,
    others?: InputInfoWithDataPart<InputInfoSelectSingle<T, K>>
  ): InputInfoSelectSingle<T, K>;
  selectSingle<K = any>(
    key: keyof T,
    options: Value<InputInfoOptions<K>>,
    others?: InputInfoWithDataPart<InputInfoSelectSingle<T, K>>
  ): InputInfoSelectSingle<T, K> {
    return {
      type: "select",
      label: String(key),
      options,
      multiple: false,
      model: {data: this.data, key},
      ...this.others,
      ...others
    };
  }

  selectMultiple(
    key: keyof T,
    options: Value<string[]>,
    others?: InputInfoWithDataPart<InputInfoSelectMultiple<T, any>>
  ): InputInfoSelectMultiple<T, any>;
  selectMultiple<K>(
    key: keyof T,
    options: Value<InputInfoOptions<K>>,
    others?: InputInfoWithDataPart<InputInfoSelectMultiple<T, K>>
  ): InputInfoSelectMultiple<T, K>;
  selectMultiple<K>(
    key: keyof T,
    options: Value<InputInfoOptions<K>>,
    others?: InputInfoWithDataPart<InputInfoSelectMultiple<T, K>>
  ): InputInfoSelectMultiple<T, K> {
    return {
      type: "select",
      label: String(key),
      options: options,
      multiple: true,
      model: {data: this.data, key},
      ...this.others,
      ...others
    };
  }

  number(key: keyof T, others?: InputInfoWithDataPart<InputInfoNumber>): InputInfoNumber {
    return {type: "number", label: String(key), model: {data: this.data, key}, ...this.others, ...others};
  }

  boolean(key: keyof T, others?: InputInfoWithDataPart<InputInfoBoolean>): InputInfoBoolean {
    return {type: "boolean", label: String(key), model: {data: this.data, key}, ...this.others, ...others};
  }

  object(key: keyof T, others?: InputInfoWithDataPart<InputInfoObject>): InputInfoObject {
    return {type: "object", label: String(key), model: {data: this.data, key}, ...this.others, ...others};
  }

  array(key: keyof T, others?: InputInfoWithDataPart<InputInfoArray>): InputInfoArray {
    return {type: "array", label: String(key), model: {data: this.data, key}, ...this.others, ...others};
  }

  image(key: keyof T, http: CadDataService, others?: InputInfoWithDataPart<InputInfoImage>): InputInfoImage {
    return {
      type: "image",
      label: String(key),
      value: this.data[key],
      prefix: filePathUrl,
      onChange: async (val, info) => {
        if (val) {
          const result = await http.uploadImage(val);
          if (result?.url) {
            info.value = result.url;
            this.data[key] = result.url as any;
          }
        } else {
          info.value = "";
          this.data[key] = "" as any;
        }
      },
      ...this.others,
      ...others
    };
  }
}
