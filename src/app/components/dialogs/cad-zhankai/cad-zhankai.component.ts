import {Component, Inject} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxChange, MatCheckboxModule} from "@angular/material/checkbox";
import {ErrorStateMatcher, MatOptionModule} from "@angular/material/core";
import {MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {joinOptions, splitOptions} from "@app/app.common";
import {flipOptions} from "@app/cad/options";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {ReplaceFullCharsDirective} from "../../../modules/directives/replace-full-chars.directive";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {openCadOptionsDialog} from "../cad-options/cad-options.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-zhankai",
  templateUrl: "./cad-zhankai.component.html",
  styleUrls: ["./cad-zhankai.component.scss"],
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogActions,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatSlideToggleModule,
    NgScrollbar,
    ReplaceFullCharsDirective
  ]
})
export class CadZhankaiComponent extends Utils() {
  checkedIndices = new Set<number>();
  keysMap = {
    kaiqi: "开启",
    chanpinfenlei: "产品分类",
    flip: "翻转"
  };
  flipOptions = flipOptions;
  get emptyFlipItem(): CadZhankai["flip"][0] {
    return {kaiqi: "", chanpinfenlei: "", fanzhuanfangshi: ""};
  }
  nameErrorMsg: string[] = [];
  nameMatcher: ErrorStateMatcher = {
    isErrorState: (control) => {
      const value = control?.value;
      if (!value) {
        return true;
      }
      return false;
      // return this.data.filter((v) => v.name === value).length > 1;
    }
  };
  get valid() {
    return this.nameErrorMsg.every((v) => !v);
  }

  constructor(
    public dialogRef: MatDialogRef<CadZhankaiComponent, CadZhankai[]>,
    @Inject(MAT_DIALOG_DATA) public data: CadData["zhankai"],
    private dialog: MatDialog,
    private message: MessageService,
    private status: AppStatusService
  ) {
    super();
    this.data = cloneDeep(this.data);
  }

  submit() {
    if (this.valid) {
      this.dialogRef.close(this.data);
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  openCadmuban(item: CadZhankai, key: "kailiaomuban" | "neikaimuban") {
    this.status.openCadInNewTab(item[key], "kailiaocadmuban");
  }

  async selectCadmuban(item: CadZhankai, key: "kailiaomuban" | "neikaimuban") {
    const checkedItems = [item[key]];
    const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
    if (result?.length) {
      item[key] = result[0].id;
    }
  }

  onCheckboxChange(event: MatCheckboxChange, i: number) {
    if (event.checked) {
      this.checkedIndices.add(i);
    } else {
      this.checkedIndices.delete(i);
    }
  }

  onCheckboxChanglick(event: Event) {
    event.stopPropagation();
  }

  addItem() {
    this.data.push(new CadZhankai());
    this.validate();
  }

  selectAll() {
    this.data.forEach((_v, i) => this.checkedIndices.add(i));
    this.checkedIndices.delete(0);
  }

  unselectAll() {
    this.checkedIndices.clear();
  }

  copyItem(i: number) {
    this.data.splice(i + 1, 0, cloneDeep(this.data[i]));
    this.validate();
  }

  removeItem(i: number) {
    if (i === 0) {
      this.message.alert("不能删除第一项");
      return;
    } else {
      this.data.splice(i, 1);
    }
    this.validate();
  }

  async selectOptions(obj: any, field: string) {
    if (!field) {
      await this.message.error("键名不能为空");
    }
    const checkedItems = splitOptions(obj[field]);
    const name = (this.keysMap as any)[field] || field;
    const result = await openCadOptionsDialog(this.dialog, {data: {name, checkedItems, multi: true}});
    if (result?.options) {
      obj[field] = joinOptions(result.options);
    }
  }

  async addFlipChai(i: number) {
    const num = await this.message.prompt({label: "序号", type: "number", validators: Validators.min(0)});
    if (num === null) {
      return;
    }
    const flipChai = this.data[i].flipChai;
    if (flipChai[num] !== undefined) {
      this.message.snack("该序号已存在");
      return;
    }
    flipChai[num] = "h";
  }

  removeFlipChai(i: number, key: string) {
    delete this.data[i].flipChai[key];
  }

  validate() {
    const names: string[] = [];
    this.nameErrorMsg = [];
    this.data.forEach((v, i) => {
      this.nameErrorMsg[i] = v.name ? "" : "名字不能为空";
      if (v.name) {
        this.nameErrorMsg[i] = "";
        names.push(v.name);
      } else {
        this.nameErrorMsg[i] = "名字不能为空";
      }
    });
  }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankai[], CadZhankai[]>(CadZhankaiComponent);

export const editCadZhankai = async (dialog: MatDialog, data: CadData) => {
  const result = await openCadZhankaiDialog(dialog, {data: data.zhankai});
  if (result) {
    data.zhankai = result;
    if (result.length) {
      data.name = result[0].name;
    }
  }
};
