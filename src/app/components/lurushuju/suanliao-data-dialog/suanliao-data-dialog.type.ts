import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {ObjectOf} from "packages/utils/lib";
import {SelectGongyiInput} from "../select-gongyi-dialog/select-gongyi-dialog.types";
import {算料数据2} from "../xinghao-data";

export interface SuanliaoDataInput {
  data: Pick<算料数据2, "算料公式" | "测试用例" | "算料CAD">;
  varNames: FormulasEditorComponent["varNames"];
  klkwpzParams: ObjectOf<any>;
  copySuanliaoCadsInput?: SelectGongyiInput;
}

export interface SuanliaoDataOutput {
  data: Pick<算料数据2, "算料公式" | "测试用例" | "算料CAD">;
}
