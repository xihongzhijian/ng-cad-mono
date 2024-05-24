import {Component, forwardRef, HostBinding, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {cloneDeep} from "lodash";
import {SuanliaogongshiComponent} from "../../suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiDialogInput, SuanliaogongshiDialogOutput} from "./suanliaogongshi-dialog.types";

@Component({
  selector: "app-suanliaogongshi-dialog",
  standalone: true,
  imports: [forwardRef(() => SuanliaogongshiComponent), MatButtonModule],
  templateUrl: "./suanliaogongshi-dialog.component.html",
  styleUrl: "./suanliaogongshi-dialog.component.scss"
})
export class SuanliaogongshiDialogComponent {
  @HostBinding("class") class = "ng-page";
  info: SuanliaogongshiDialogInput["info"];

  constructor(
    public dialogRef: MatDialogRef<SuanliaogongshiDialogComponent, SuanliaogongshiDialogOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SuanliaogongshiDialogInput
  ) {
    this.info = cloneDeep(data.info);
  }

  submit() {
    this.dialogRef.close({data: this.info.data});
  }

  cancel() {
    if (this.info.isFromSelf) {
      this.dialogRef.close({data: this.info.data});
    } else {
      this.dialogRef.close();
    }
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
