import {Component, Inject, ViewChild} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {timeout} from "@lucilor/utils";
import {MrbcjfzDataSubmitEvent, MrbcjfzInputData} from "@views/mrbcjfz/mrbcjfz.types";
import {MrbcjfzComponent} from "../../../views/mrbcjfz/mrbcjfz.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-mrbcjfz-dialog",
  templateUrl: "./mrbcjfz-dialog.component.html",
  styleUrls: ["./mrbcjfz-dialog.component.scss"],
  standalone: true,
  imports: [MrbcjfzComponent]
})
export class MrbcjfzDialogComponent {
  @ViewChild(MrbcjfzComponent) mrbcjfz?: MrbcjfzComponent;

  constructor(
    public dialogRef: MatDialogRef<MrbcjfzDialogComponent, MrbcjfzDialogOutput>,
    @Inject(MAT_DIALOG_DATA) public data: MrbcjfzDialogInput
  ) {
    if (!data) {
      data = {id: 0, table: ""};
    }
  }

  submit(event: MrbcjfzDataSubmitEvent) {
    this.dialogRef.close(event);
  }

  close() {
    this.dialogRef.close();
  }

  async refreshAfter() {
    await timeout(0);
    if (!this.mrbcjfz || !this.data.dryRun) {
      return;
    }
    this.dialogRef.close({data: this.mrbcjfz.xinghao, errors: this.mrbcjfz.checkSubmit()});
  }
}

export interface MrbcjfzDialogInput {
  id: number;
  table: string;
  inputData?: MrbcjfzInputData;
  dryRun?: boolean;
}

export type MrbcjfzDialogOutput = MrbcjfzDataSubmitEvent;

export const openMrbcjfzDialog = getOpenDialogFunc<MrbcjfzDialogComponent, MrbcjfzDialogInput, MrbcjfzDialogOutput>(
  MrbcjfzDialogComponent,
  {width: "100%", height: "100%"}
);
