import {LurushujuIndexComponent} from "../lurushuju-index/lurushuju-index.component";
import {MenjiaoCadType, 企料CAD, 算料数据, 配合框CAD} from "../xinghao-data";

export interface MenjiaoInput {
  data?: 算料数据;
  component?: LurushujuIndexComponent;
  onSubmit?: (result: MenjiaoOutput) => void;
  isKailiao?: boolean;
}

export interface MenjiaoOutput {
  data: 算料数据;
}

export interface MenjiaoCadItemInfo {
  data: 配合框CAD | 企料CAD;
  key1: MenjiaoCadType;
}

export interface MenjiaoShiyituCadItemInfo {
  key1: MenjiaoCadType;
  index: number;
}
