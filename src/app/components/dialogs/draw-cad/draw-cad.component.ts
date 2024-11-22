import {Component, Inject, OnInit} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CadCollection} from "@app/cad/collections";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {CadData} from "@lucilor/cad-viewer";
import {AppStatusService} from "@services/app-status.service";
import {NgScrollbar} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-draw-cad",
  templateUrl: "./draw-cad.component.html",
  styleUrls: ["./draw-cad.component.scss"],
  imports: [CadImageComponent, MatButtonModule, NgScrollbar]
})
export class DrawCadComponent implements OnInit {
  items: {data: CadData}[] = [];

  constructor(
    public dialogRef: MatDialogRef<DrawCadComponent, DrawCadOutput>,
    @Inject(MAT_DIALOG_DATA) public data: DrawCadInput,
    private status: AppStatusService
  ) {}

  async ngOnInit() {
    const cads = this.data.cads || [];
    this.items = [];
    for (const cad of cads) {
      this.items.push({data: cad});
    }
  }

  logCad(data: CadData) {
    console.log(data);
  }

  openCad(data: CadData) {
    this.status.openCadInNewTab(data.id, this.data.collection);
  }

  close() {
    this.dialogRef.close();
  }
}

export interface DrawCadInput {
  collection: CadCollection;
  cads: CadData[];
}

export type DrawCadOutput = void;

export const openDrawCadDialog = getOpenDialogFunc<DrawCadComponent, DrawCadInput, DrawCadOutput>(DrawCadComponent, {
  width: "100vw",
  height: "100vh"
});
