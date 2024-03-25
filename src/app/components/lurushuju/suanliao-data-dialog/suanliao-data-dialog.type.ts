import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {LurushujuIndexComponent} from "../lurushuju-index/lurushuju-index.component";
import {MenjiaoCadType, SuanliaoDataParams, 算料数据2} from "../xinghao-data";

export interface SuanliaoDataInput {
  data: 算料数据2;
  varNames: FormulasEditorComponent["varNames"];
  suanliaoDataParams: SuanliaoDataParams;
  key1: MenjiaoCadType;
  component?: LurushujuIndexComponent;
  isKailiao?: boolean;
  suanliaoTestName?: string;
}

export interface SuanliaoDataOutput {
  data: 算料数据2;
}

export interface SuanliaoDataCadItemInfo {
  index: number;
}
