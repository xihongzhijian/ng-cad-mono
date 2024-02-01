import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {算料数据2} from "../../../../components/lurushuju/xinghao-data";

export interface SuanliaogongshiInfo {
  data: Pick<算料数据2, "算料公式" | "测试用例" | "输入数据">;
  varNames?: FormulasEditorComponent["varNames"];
}
