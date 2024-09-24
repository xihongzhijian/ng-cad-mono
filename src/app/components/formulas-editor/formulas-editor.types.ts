import {ValidationErrors} from "@angular/forms";
import {Formulas} from "@app/utils/calc";

export interface FormulasChangeEvent {
  formulas: Formulas;
  errors: string[];
}

export type FormulasValidatorFn = (formulaList: string[][]) => ValidationErrors | null;
