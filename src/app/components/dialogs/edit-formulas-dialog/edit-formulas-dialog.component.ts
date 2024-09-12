import {Component, HostBinding, Inject, ViewChild} from "@angular/core";
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
  imports: [FormulasEditorComponent, MatButtonModule]
})
export class EditFormulasDialogComponent {
  @HostBinding("class") class = "ng-page";
  @ViewChild("formulasEditor") formulasEditor?: FormulasEditorComponent;

  constructor(
    public dialogRef: MatDialogRef<EditFormulasDialogComponent, EditFormulasOutput>,
    @Inject(MAT_DIALOG_DATA) public data?: EditFormulasInput
  ) {}

  submit() {
    if (!this.formulasEditor) {
      return;
    }
    const result = this.formulasEditor.submitFormulas();
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
  required?: ReturnType<FormulasEditorComponent["required"]>;
}

export type EditFormulasOutput = Formulas;
