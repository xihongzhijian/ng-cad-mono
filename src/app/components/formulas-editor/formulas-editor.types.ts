import {ValidationErrors} from "@angular/forms";

export type FormulasValidatorFn = (formulaList: string[][]) => ValidationErrors | null;

export interface FormulasCompactConfig {
  minRows?: number;
  maxRows?: number;
  editOn?: boolean;
  noToolbar?: boolean;
}
