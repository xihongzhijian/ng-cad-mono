import {ChangeDetectionStrategy, Component, Inject, ViewChild} from "@angular/core";
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
  imports: [MrbcjfzComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
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
    this.dialogRef.close({data: this.mrbcjfz.xinghao(), errors: this.mrbcjfz.checkSubmit()});
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
