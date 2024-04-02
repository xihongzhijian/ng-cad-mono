import {KeyValuePipe} from "@angular/common";
import {Component, forwardRef, HostBinding, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {ObjectOf} from "@lucilor/utils";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.types";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {CadItemButton} from "../cad-item/cad-item.types";
import {FentiCadDialogInput, FentiCadDialogOutput, FentiCadItemInfo} from "./fenti-cad-dialog.types";

@Component({
  selector: "app-fenti-cad-dialog",
  standalone: true,
  imports: [forwardRef(() => CadItemComponent), KeyValuePipe, MatButtonModule, NgScrollbarModule],
  templateUrl: "./fenti-cad-dialog.component.html",
  styleUrl: "./fenti-cad-dialog.component.scss"
})
export class FentiCadDialogComponent {
  @HostBinding("class") class = "ng-page";

  cadButtons: CadItemButton<FentiCadItemInfo>[] = [{name: "删除", onClick: this.removeCad.bind(this)}];

  constructor(
    private dialog: MatDialog,
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
    const search: ObjectOf<any> = this.data.cad数据要求?.导入CAD要求 || {};
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
        search,
        addCadData: search,
        hideCadInfo: true
      }
    });
    if (!result || !result.length) {
      return;
    }
    fentiCads[key] = getHoutaiCad(result[0]);
  }

  removeCad(component: CadItemComponent<FentiCadItemInfo>) {
    const {key} = component.customInfo || {};
    if (!key || !this.data.data[key]) {
      return;
    }
    this.data.data[key] = null;
  }
}

export const openFentiCadDialog = getOpenDialogFunc<FentiCadDialogComponent, FentiCadDialogInput, FentiCadDialogOutput>(
  FentiCadDialogComponent,
  {
    width: "100%",
    height: "100%"
  }
);
