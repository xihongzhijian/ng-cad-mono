import {Formulas} from "@app/utils/calc";

export interface FormulasChangeEvent {
  formulas: Formulas;
  errors: string[];
}
