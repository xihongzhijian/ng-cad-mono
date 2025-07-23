import {Component, inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {KailiaocanshuData, KlcsComponent} from "@components/klcs/klcs.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-klcs-dialog",
  templateUrl: "./klcs-dialog.component.html",
  styleUrls: ["./klcs-dialog.component.scss"],
  imports: [KlcsComponent, MatButtonModule]
})
export class KlcsDialogComponent {
  dialogRef = inject<MatDialogRef<KlcsDialogComponent, KlcsDialogOutput>>(MatDialogRef);
  data: KlcsDialogInput = inject<KlcsDialogInput>(MAT_DIALOG_DATA, {optional: true}) ?? {
    source: {_id: "", 名字: "", 分类: "", 参数: ""},
    cadId: ""
  };

  klcsComponent = viewChild(KlcsComponent);

  async submit() {
    const klcsComponent = this.klcsComponent();
    if (!klcsComponent) {
      return;
    }
    const result = await klcsComponent.submit();
    if (result) {
      this.dialogRef.close(result);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}

export interface KlcsDialogInput {
  source: KailiaocanshuData;
  cadId: string;
}

export type KlcsDialogOutput = KailiaocanshuData;

export const openKlcsDialog = getOpenDialogFunc<KlcsDialogComponent, KlcsDialogInput, KlcsDialogOutput>(KlcsDialogComponent, {
  width: "85%",
  height: "85%"
});
