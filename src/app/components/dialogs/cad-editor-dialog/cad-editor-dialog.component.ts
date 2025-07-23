import {Component, forwardRef, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CadData} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadEditorComponent} from "@modules/cad-editor/components/cad-editor/cad-editor.component";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import {CadStatusNormal} from "@services/cad-status";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-editor-dialog",
  templateUrl: "./cad-editor-dialog.component.html",
  styleUrls: ["./cad-editor-dialog.component.scss"],
  imports: [MatButtonModule, forwardRef(() => CadEditorComponent)]
})
export class CadEditorDialogComponent extends Subscribed() implements OnInit {
  dialogRef = inject<MatDialogRef<CadEditorDialogComponent, CadEditorOutput>>(MatDialogRef);
  data: CadEditorInput = inject<CadEditorInput>(MAT_DIALOG_DATA, {optional: true}) ?? {};

  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  constructor() {
    super();
    if (!this.data) {
      this.data = {};
    }
    this.cadEditorParams.set({...this.data, isDialog: true});
  }

  ngOnInit() {
    this.subscribe(this.status.saveCadStart$, () => {
      this.canClose.set(false);
    });
    this.subscribe(this.status.saveCadEnd$, (data) => {
      this.canClose.set(true);
      this.savedData.set(data.data);
    });
  }

  cadEditor = viewChild<CadEditorComponent>(forwardRef(() => CadEditorComponent));
  savedData = signal<CadData | null>(null);
  canClose = signal(true);
  cadEditorParams = signal<OpenCadOptions>({});

  async save() {
    return await this.cadEditor()?.save();
  }

  async close(save: boolean) {
    if (save) {
      const savedData = await this.save();
      if (!savedData) {
        return;
      }
    }
    if (this.cadEditor()) {
      this.status.setCadStatuses([new CadStatusNormal()]);
      await timeout(0);
      this.dialogRef.close({savedData: this.savedData()});
    } else {
      this.dialogRef.close();
    }
  }

  openCad() {
    const id = this.data.data?.id;
    const collection = this.data.collection;
    if (!id || !collection) {
      this.message.error("缺少id或collection");
      return;
    }
    const mokuaiName = this.data.mokuaiName;
    this.status.openCadInNewTab(id, collection, mokuaiName);
  }
}

export const openCadEditorDialog = getOpenDialogFunc<CadEditorDialogComponent, CadEditorInput, CadEditorOutput>(CadEditorDialogComponent, {
  width: "calc(100% - 50px)",
  height: "calc(100% - 50px)",
  disableClose: true
});

export type CadEditorInput = Omit<OpenCadOptions, "isDialog">;

export interface CadEditorOutput {
  savedData: CadData | null;
}
