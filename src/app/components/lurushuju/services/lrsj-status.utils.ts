import {Validators} from "@angular/forms";
import {InputInfoNumber, InputInfoSelect, InputInfoSelectSingle} from "@modules/input/components/input.types";
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

export interface Get双开门扇宽生成方式InputsData {
  双开门扇宽生成方式?: string;
  锁扇铰扇蓝线宽固定差值?: number;
}
export const show双开门扇宽生成方式 = (fenlei: string) => fenlei === "双开";
export const show锁扇铰扇蓝线宽固定差值 = (fenlei: string, 双开门扇宽生成方式: string | undefined) =>
  show双开门扇宽生成方式(fenlei) && 双开门扇宽生成方式 === "锁扇蓝线宽比铰扇蓝线宽大";
export const get双开门扇宽生成方式Inputs = <T extends Get双开门扇宽生成方式InputsData>(fenlei: string, options: OptionsAll2, data: T) => {
  const input双开门扇宽生成方式 = getOptionsAll2InputInfo(options, "双开门扇宽生成方式", (info) => {
    info.hidden = !show双开门扇宽生成方式(fenlei);
    info.model = {data, key: "双开门扇宽生成方式"};
    info.onChange = () => {
      update双开门扇宽生成方式();
    };
  }) as InputInfoSelectSingle;
  const input锁扇铰扇蓝线宽固定差值: InputInfoNumber = {
    type: "number",
    label: "锁扇铰扇蓝线宽固定差值",
    model: {data, key: "锁扇铰扇蓝线宽固定差值"}
  };
  const update双开门扇宽生成方式 = () => {
    if (show锁扇铰扇蓝线宽固定差值(fenlei, data.双开门扇宽生成方式)) {
      input锁扇铰扇蓝线宽固定差值.hidden = false;
      if (typeof data.锁扇铰扇蓝线宽固定差值 !== "number") {
        data.锁扇铰扇蓝线宽固定差值 = 0;
      }
    } else {
      input锁扇铰扇蓝线宽固定差值.hidden = true;
      delete data.锁扇铰扇蓝线宽固定差值;
    }
  };
  update双开门扇宽生成方式();
  return [input双开门扇宽生成方式, input锁扇铰扇蓝线宽固定差值] as const;
};
