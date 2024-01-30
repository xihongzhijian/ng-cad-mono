import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcfz.utils";
import {MrbcjfzInputData} from "@views/mrbcjfz/mrbcjfz.types";
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
  constructor(
    public dialogRef: MatDialogRef<MrbcjfzDialogComponent, MrbcjfzDialogOutput>,
    @Inject(MAT_DIALOG_DATA) public data: MrbcjfzDialogInput
  ) {
    if (!data) {
      data = {id: 0, table: ""};
    }
  }

  submit(xinghao: MrbcjfzXinghaoInfo) {
    this.dialogRef.close(xinghao);
  }

  close() {
    this.dialogRef.close();
  }
}

export interface MrbcjfzDialogInput {
  id: number;
  table: string;
  inputData?: MrbcjfzInputData;
}

export type MrbcjfzDialogOutput = MrbcjfzXinghaoInfo;

export const openMrbcjfzDialog = getOpenDialogFunc<MrbcjfzDialogComponent, MrbcjfzDialogInput, MrbcjfzDialogOutput>(
  MrbcjfzDialogComponent,
  {width: "100%", height: "100%"}
);
