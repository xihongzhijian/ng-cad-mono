import {ChangeDetectionStrategy, Component, HostBinding, Inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {Formulas} from "@app/utils/calc";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-edit-formulas-dialog",
  templateUrl: "./edit-formulas-dialog.component.html",
  styleUrls: ["./edit-formulas-dialog.component.scss"],
  standalone: true,
  imports: [FormulasEditorComponent, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditFormulasDialogComponent {
  @HostBinding("class") class = "ng-page";

  formulasEditor = viewChild<FormulasEditorComponent>("formulasEditor");

  constructor(
    public dialogRef: MatDialogRef<EditFormulasDialogComponent, EditFormulasOutput>,
    @Inject(MAT_DIALOG_DATA) public data?: EditFormulasInput
  ) {}

  async submit() {
    const formulasEditor = this.formulasEditor();
    if (!formulasEditor) {
      return;
    }
    const result = await formulasEditor.submitFormulas();
    if (result.errors.length > 0) {
      return;
    }
    this.dialogRef.close(result.formulas);
  }

  cancel() {
    this.dialogRef.close();
  }
}

export const openEditFormulasDialog = getOpenDialogFunc<EditFormulasDialogComponent, EditFormulasInput, EditFormulasOutput>(
  EditFormulasDialogComponent,
  {width: "calc(100vw - 20px)", height: "calc(100vh - 10px)", disableClose: true}
);

export interface EditFormulasInput {
  formulas?: ReturnType<FormulasEditorComponent["formulas"]>;
  formulasText?: ReturnType<FormulasEditorComponent["formulasText"]>;
  varNameItem?: ReturnType<FormulasEditorComponent["varNameItem"]>;
  extraInputInfos?: ReturnType<FormulasEditorComponent["extraInputInfos"]>;
  validator?: ReturnType<FormulasEditorComponent["validator"]>;
}

export type EditFormulasOutput = Formulas;
