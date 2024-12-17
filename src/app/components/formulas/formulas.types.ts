import {InputInfo} from "@modules/input/components/input.types";

export interface FormulaInfo {
  keys: {eq: boolean; name: string}[];
  values: {eq: boolean; name: string; inputInfo?: InputInfo}[];
}
