import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {ObjectOf} from "@lucilor/utils";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {算料公式, 算料数据2} from "../xinghao-data";

export interface SuanliaoTestInput {
  data: 算料数据2;
  varNames: FormulasEditorComponent["varNames"];
}

export interface SuanliaoTestOutput {}

export interface SuanliaoTestInfo {
  slgsList: 算料公式[];
  errors: string[];
  allVars: string[];
  cadImgs: ObjectOf<string>;
  cads: HoutaiCad[];
}
