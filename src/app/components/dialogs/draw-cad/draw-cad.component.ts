import {Component, inject, OnInit, signal} from "@angular/core";
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
  dialogRef = inject<MatDialogRef<DrawCadComponent, DrawCadOutput>>(MatDialogRef);
  data: DrawCadInput = inject<DrawCadInput>(MAT_DIALOG_DATA, {optional: true}) ?? {collection: "cad", cads: []};

  private status = inject(AppStatusService);

  items = signal<{data: CadData}[]>([]);

  async ngOnInit() {
    const cads = this.data.cads || [];
    const items: ReturnType<typeof this.items> = [];
    for (const cad of cads) {
      items.push({data: cad});
    }
    this.items.set(items);
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
