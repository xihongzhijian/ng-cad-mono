import {FormulasValidatorFn} from "@components/formulas-editor/formulas-editor.types";
import {VarNameItem} from "@components/var-names/var-names.types";
import {Properties} from "csstype";
import {算料公式, 算料数据2} from "../../../../components/lurushuju/xinghao-data";

export interface SuanliaogongshiInfo {
  data: Partial<Pick<算料数据2, "算料公式" | "输入数据">>;
  varNameItem?: VarNameItem;
  isFromSelf?: boolean;
  slgs?: {
    title?: string;
    titleStyle?: Properties;
    justify?: (item: 算料公式) => void;
    validator?: FormulasValidatorFn;
  };
}

export interface SuanliaogongshiCloseEvent {
  submit: boolean;
}
