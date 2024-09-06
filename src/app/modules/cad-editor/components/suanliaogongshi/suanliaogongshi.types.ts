import {VarNames} from "@components/var-names/var-names.types";
import {算料数据2} from "../../../../components/lurushuju/xinghao-data";

export interface SuanliaogongshiInfo {
  data: Partial<Pick<算料数据2, "算料公式" | "输入数据">>;
  varNames?: VarNames;
  isFromSelf?: boolean;
}

export interface SuanliaogongshiCloseEvent {
  submit: boolean;
}
