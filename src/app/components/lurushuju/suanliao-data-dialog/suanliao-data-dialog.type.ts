import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {LurushujuIndexComponent} from "../lurushuju-index/lurushuju-index.component";
import {MenjiaoCadType, SuanliaoDataParams, 算料数据2} from "../xinghao-data";

export interface SuanliaoDataInput {
  data: Pick<算料数据2, "算料公式" | "测试用例" | "算料CAD" | "输入数据">;
  varNames: FormulasEditorComponent["varNames"];
  suanliaoDataParams: SuanliaoDataParams;
  key1: MenjiaoCadType;
  component?: LurushujuIndexComponent;
  isKailiao?: boolean;
}

export interface SuanliaoDataOutput {
  data: Pick<算料数据2, "算料公式" | "测试用例" | "算料CAD" | "输入数据">;
}

export interface SuanliaoDataCadItemInfo {
  index: number;
}
