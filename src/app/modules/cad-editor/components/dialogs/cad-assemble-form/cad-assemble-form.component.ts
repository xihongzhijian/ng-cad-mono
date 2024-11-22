import {Component, forwardRef, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {InputInfo} from "@modules/input/components/input.types";
import {InputComponent} from "../../../../input/components/input.component";

@Component({
  selector: "app-cad-assemble-form",
  templateUrl: "./cad-assemble-form.component.html",
  styleUrls: ["./cad-assemble-form.component.scss"],
  imports: [forwardRef(() => InputComponent), MatButtonModule]
})
export class CadAssembleFormComponent {
  inputInfos: InputInfo[];
  x = 0;
  y = 0;

  constructor(
    public dialogRef: MatDialogRef<CadAssembleFormComponent, CadAssembleFormOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadAssembleFormInput
  ) {
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.inputInfos = [
      {type: "number", label: "x", model: {key: "x", data: this}},
      {type: "number", label: "y", model: {key: "y", data: this}}
    ];
  }

  submit() {
    this.dialogRef.close({x: this.x, y: this.y});
  }

  cancel() {
    this.dialogRef.close();
  }
}

export interface CadAssembleFormInput {
  x: number;
  y: number;
}

export interface CadAssembleFormOutput {
  x: number;
  y: number;
}

export const openCadAssembleFormDialog = getOpenDialogFunc<CadAssembleFormComponent, CadAssembleFormInput, CadAssembleFormOutput>(
  CadAssembleFormComponent
);
