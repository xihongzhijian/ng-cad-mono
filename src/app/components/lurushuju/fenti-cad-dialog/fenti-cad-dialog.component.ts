import {KeyValuePipe} from "@angular/common";
import {ChangeDetectorRef, Component, forwardRef, HostBinding, inject, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {CadItemButton} from "../cad-item/cad-item.types";
import {FentiCadDialogInput, FentiCadDialogOutput, FentiCadItemInfo} from "./fenti-cad-dialog.types";

@Component({
  selector: "app-fenti-cad-dialog",
  templateUrl: "./fenti-cad-dialog.component.html",
  styleUrl: "./fenti-cad-dialog.component.scss",
  imports: [forwardRef(() => CadItemComponent), KeyValuePipe, MatButtonModule, NgScrollbarModule]
})
export class FentiCadDialogComponent {
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  @HostBinding("class") class = "ng-page";

  cadButtons: CadItemButton<FentiCadItemInfo>[] = [{name: "删除", onClick: this.removeCad.bind(this)}];

  constructor(
    public dialogRef: MatDialogRef<FentiCadDialogComponent, FentiCadDialogOutput>,
    @Inject(MAT_DIALOG_DATA) public data: FentiCadDialogInput
  ) {}

  submit() {
    this.dialogRef.close({});
  }

  cancel() {
    this.dialogRef.close();
  }

  returnZero() {
    return 0;
  }

  async selectFentiCad(key: string) {
    const fentiCads = this.data.data;
    const yaoqiu = this.data.cad数据要求;
    const checkedItems = [];
    const cad = fentiCads[key];
    if (cad) {
      checkedItems.push(cad._id);
    }
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "single",
        checkedItems,
        collection: "cad",
        search: yaoqiu?.search,
        yaoqiu: yaoqiu
      }
    });
    if (!result || !result.length) {
      return;
    }
    const data = result[0];
    const houtaiId = data.id;
    data.resetIds();
    fentiCads[key] = getHoutaiCad(data, {houtaiId: houtaiId});
    this.cd.markForCheck();
  }

  removeCad(component: CadItemComponent<FentiCadItemInfo>) {
    const {key} = component.customInfo() || {};
    if (!key || !this.data.data[key]) {
      return;
    }
    this.data.data[key] = null;
    this.cd.markForCheck();
  }
}

export const openFentiCadDialog = getOpenDialogFunc<FentiCadDialogComponent, FentiCadDialogInput, FentiCadDialogOutput>(
  FentiCadDialogComponent,
  {
    width: "100%",
    height: "100%"
  }
);
