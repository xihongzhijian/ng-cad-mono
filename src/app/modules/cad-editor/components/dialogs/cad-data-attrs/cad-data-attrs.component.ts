import {NgFor, NgIf} from "@angular/common";
import {Component, Inject} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadData} from "@lucilor/cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {NgScrollbar} from "ngx-scrollbar";

export type CadDataAttrsComponentData = CadData["attributes"];

@Component({
  selector: "app-cad-data-attrs",
  templateUrl: "./cad-data-attrs.component.html",
  styleUrls: ["./cad-data-attrs.component.scss"],
  standalone: true,
  imports: [NgScrollbar, NgIf, MatButtonModule, MatIconModule, NgFor, MatFormFieldModule, MatInputModule, FormsModule]
})
export class CadDataAttrsComponent extends Utils() {
  list: {key: string; value: string}[] = [];

  constructor(
    public dialogRef: MatDialogRef<CadDataAttrsComponent, CadDataAttrsComponentData>,
    @Inject(MAT_DIALOG_DATA) public data: CadDataAttrsComponentData
  ) {
    super();
    for (const key in data) {
      this.list.push({key, value: data[key]});
    }
  }

  submit() {
    const data: CadDataAttrsComponentData = {};
    this.list.forEach((v) => {
      if (v.key) {
        data[v.key] = v.value;
      }
    });
    this.dialogRef.close(data);
  }

  cancel() {
    this.dialogRef.close();
  }
}

type CDAC = CadDataAttrsComponentData;
export const openCadDataAttrsDialog = getOpenDialogFunc<CadDataAttrsComponent, CDAC, CDAC>(CadDataAttrsComponent);
