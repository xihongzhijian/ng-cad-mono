import {InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {convertOptions} from "@modules/input/components/input.utils";
import {OptionsAll, OptionsAll2} from "../services/lrsj-status.types";

export const defaultFenleis = ["单门", "子母对开", "双开"];

export const getOptions = (optionsAll: OptionsAll | undefined | null, key: string, setter?: (option: InputInfoOption) => void) => {
  const options = optionsAll?.[key];
  if (!options) {
    return [];
  }
  return options.map(({name, label}) => {
    const option: InputInfoOption = {value: name, label};
    if (typeof setter === "function") {
      setter(option);
    }
    return option;
  });
};

export const getOptionInputInfo = (
  optionsAll: OptionsAll2 | undefined | null,
  key: string,
  setter?: (info: InputInfoSelect) => void
): InputInfoSelect => {
  const optionsInfo = optionsAll?.[key];
  if (!optionsInfo) {
    return {type: "select", label: key, options: []};
  }
  const {disabled, multiple} = optionsInfo;
  const info: InputInfoSelect = {
    type: "select",
    label: key,
    options: convertOptions(optionsInfo.options),
    disabled,
    multiple
  };
  if (typeof setter === "function") {
    setter(info);
  }

  return info;
};
