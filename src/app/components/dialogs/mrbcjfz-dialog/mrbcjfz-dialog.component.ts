import {Component, inject, viewChild} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CadCollection} from "@app/cad/collections";
import {CadData} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {MrbcjfzDataSubmitEvent, MrbcjfzInputData} from "@views/mrbcjfz/mrbcjfz.types";
import {MrbcjfzComponent} from "../../../views/mrbcjfz/mrbcjfz.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-mrbcjfz-dialog",
  templateUrl: "./mrbcjfz-dialog.component.html",
  styleUrls: ["./mrbcjfz-dialog.component.scss"],
  imports: [MrbcjfzComponent]
})
export class MrbcjfzDialogComponent {
  dialogRef = inject<MatDialogRef<MrbcjfzDialogComponent, MrbcjfzDialogOutput>>(MatDialogRef);
  data: MrbcjfzDialogInput = inject<MrbcjfzDialogInput>(MAT_DIALOG_DATA, {optional: true}) ?? {id: 0, table: ""};

  mrbcjfz = viewChild(MrbcjfzComponent);

  submit(event: MrbcjfzDataSubmitEvent) {
    this.dialogRef.close(event);
  }

  close() {
    this.dialogRef.close();
  }

  async refreshAfter() {
    await timeout(0);
    const mrbcjfz = this.mrbcjfz();
    if (!mrbcjfz || !this.data.dryRun) {
      return;
    }
    this.dialogRef.close({data: mrbcjfz.xinghao(), errors: await mrbcjfz.checkSubmit()});
  }

  onCadChange(data: CadData) {
    this.data.onCadChange?.(data);
  }
}

export interface MrbcjfzDialogInput {
  id: number;
  table: string;
  collection?: CadCollection;
  inputData?: MrbcjfzInputData;
  dryRun?: boolean;
  mokuaiName?: string;
  cadWidth?: number;
  cadHeight?: number;
  onCadChange?: (data: CadData) => void;
}

export type MrbcjfzDialogOutput = MrbcjfzDataSubmitEvent;

export const openMrbcjfzDialog = getOpenDialogFunc<MrbcjfzDialogComponent, MrbcjfzDialogInput, MrbcjfzDialogOutput>(
  MrbcjfzDialogComponent,
  {width: "100%", height: "100%"}
);
