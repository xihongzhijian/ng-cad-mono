import {Component, HostBinding, inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {SuanliaogongshiComponent} from "../../suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiDialogInput, SuanliaogongshiDialogOutput} from "./suanliaogongshi-dialog.types";

@Component({
  selector: "app-suanliaogongshi-dialog",
  imports: [MatButtonModule, SuanliaogongshiComponent],
  templateUrl: "./suanliaogongshi-dialog.component.html",
  styleUrl: "./suanliaogongshi-dialog.component.scss"
})
export class SuanliaogongshiDialogComponent {
  dialogRef = inject<MatDialogRef<SuanliaogongshiDialogComponent, SuanliaogongshiDialogOutput>>(MatDialogRef);
  data: SuanliaogongshiDialogInput = inject<SuanliaogongshiDialogInput>(MAT_DIALOG_DATA, {optional: true}) ?? {info: {data: {}}};

  @HostBinding("class") class = "ng-page";

  submit() {
    this.dialogRef.close();
  }
}

export const openSuanliaogongshiDialog = getOpenDialogFunc<
  SuanliaogongshiDialogComponent,
  SuanliaogongshiDialogInput,
  SuanliaogongshiDialogOutput
>(SuanliaogongshiDialogComponent, {
  width: "100%",
  height: "100%"
});
