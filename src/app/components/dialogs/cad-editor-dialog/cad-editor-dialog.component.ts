import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, inject, Inject, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadEditorComponent} from "@modules/cad-editor/components/cad-editor/cad-editor.component";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-editor-dialog",
  templateUrl: "./cad-editor-dialog.component.html",
  styleUrls: ["./cad-editor-dialog.component.scss"],
  standalone: true,
  imports: [MatButtonModule, forwardRef(() => CadEditorComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadEditorDialogComponent extends Subscribed() implements OnInit {
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  constructor(
    public dialogRef: MatDialogRef<CadEditorDialogComponent, CadEditorOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadEditorInput
  ) {
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
    this.subscribe(this.status.saveCadEnd$, () => {
      this.canClose.set(true);
      this.isSaved.set(true);
    });
  }

  cadEditor = viewChild(forwardRef(() => CadEditorComponent));
  isSaved = signal(false);
  canClose = signal(true);
  cadEditorParams = signal<OpenCadOptions>({});

  async save() {
    await this.cadEditor()?.save();
  }

  async close(save: boolean) {
    if (save) {
      await this.save();
      if (!this.isSaved) {
        return;
      }
    }
    if (this.cadEditor()) {
      this.dialogRef.close({isSaved: this.isSaved()});
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
    this.status.openCadInNewTab(id, collection);
  }
}

export const openCadEditorDialog = getOpenDialogFunc<CadEditorDialogComponent, CadEditorInput, CadEditorOutput>(CadEditorDialogComponent, {
  width: "calc(100% - 50px)",
  height: "calc(100% - 50px)",
  disableClose: true
});

export type CadEditorInput = Omit<OpenCadOptions, "isDialog">;

export interface CadEditorOutput {
  isSaved: boolean;
}
