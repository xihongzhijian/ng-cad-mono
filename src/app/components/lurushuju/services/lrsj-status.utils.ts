import {Validators} from "@angular/forms";
import {InputInfoSelect} from "@modules/input/components/input.types";
import {convertOptions} from "@modules/input/components/input.utils";
import {OptionsAll2, XinghaoData, XinghaoGongyi, XinghaoMenchuang} from "./lrsj-status.types";

export const getXinghaoMenchuang = (raw?: Partial<XinghaoMenchuang>): XinghaoMenchuang => {
  return {
    vid: 0,
    mingzi: "",
    paixu: 0,
    ...raw,
    tingyong: !!raw?.tingyong
  };
};
export const getXinghaoGongyi = (raw?: Partial<XinghaoGongyi>): XinghaoGongyi => {
  return {
    vid: 0,
    mingzi: "",
    paixu: 0,
    ...raw,
    tingyong: !!raw?.tingyong
  };
};
export const getXinghaoData = (raw?: Partial<XinghaoData>): XinghaoData => {
  return {
    vid: 0,
    mingzi: "",
    menchuang: "",
    gongyi: "",
    dingdanliucheng: "",
    tingyong: false,
    paixu: -10000,
    tupian: "",
    ...raw
  };
};

export const getOptionsAll2InputInfo = (
  optionsAll: OptionsAll2 | undefined | null,
  key: string,
  setter?: (info: InputInfoSelect) => void
): InputInfoSelect => {
  const optionsInfo = optionsAll?.[key];
  if (!optionsInfo) {
    return {type: "select", label: key, options: []};
  }
  const info: InputInfoSelect = {
    type: "select",
    label: key,
    options: convertOptions(optionsInfo.options),
    disabled: optionsInfo.disabled,
    multiple: optionsInfo.multiple
  };
  if (optionsInfo.required) {
    info.validators = [Validators.required];
  } else {
    info.clearable = true;
  }
  if (optionsInfo.useDialog) {
    info.optionsDialog = {noImage: true};
  }
  if (typeof setter === "function") {
    setter(info);
  }

  return info;
};
