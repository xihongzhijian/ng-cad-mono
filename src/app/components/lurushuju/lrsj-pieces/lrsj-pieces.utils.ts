import {InputInfoOption} from "@modules/input/components/input.types";
import {OptionsAll} from "../services/lrsj-status.types";

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
