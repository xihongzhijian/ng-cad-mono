import {Component, inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {KlkwpzSource} from "@components/klkwpz/klkwpz";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-klkwpz-dialog",
  templateUrl: "./klkwpz-dialog.component.html",
  styleUrls: ["./klkwpz-dialog.component.scss"],
  imports: [KlkwpzComponent, MatButtonModule]
})
export class KlkwpzDialogComponent {
  dialogRef = inject<MatDialogRef<KlkwpzDialogComponent, KlkwpzSource>>(MatDialogRef);
  data: KlkwpzDialogData = inject<KlkwpzDialogData>(MAT_DIALOG_DATA, {optional: true}) ?? {
    source: {},
    cadId: ""
  };

  klkwpzComponent = viewChild(KlkwpzComponent);

  constructor() {
    const data = this.data;

    if (!data.source || typeof data.source !== "object" || Array.isArray(data.source)) {
      data.source = {};
    }
  }

  async submit() {
    const klkwpzComponent = this.klkwpzComponent();
    if (!klkwpzComponent || !(await klkwpzComponent.submit())) {
      return;
    }
    this.dialogRef.close(klkwpzComponent.klkwpz.export());
  }

  cancel() {
    this.dialogRef.close();
  }
}

export interface KlkwpzDialogData {
  source: KlkwpzSource;
  cadId?: string;
}

export const openKlkwpzDialog = getOpenDialogFunc<KlkwpzDialogComponent, KlkwpzDialogData, KlkwpzSource>(KlkwpzDialogComponent, {
  width: "85%",
  height: "85%"
});
