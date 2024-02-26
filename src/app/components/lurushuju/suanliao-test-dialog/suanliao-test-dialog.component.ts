import {Component, HostBinding, Inject} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getCopyName} from "@app/app.common";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {测试用例} from "../xinghao-data";
import {SuanliaoTestInput, SuanliaoTestOutput} from "./suanliao-test-dialog.types";

@Component({
  selector: "app-suanliao-test-dialog",
  standalone: true,
  imports: [MatButtonModule, MatDividerModule, MatTooltipModule, NgScrollbarModule],
  templateUrl: "./suanliao-test-dialog.component.html",
  styleUrl: "./suanliao-test-dialog.component.scss"
})
export class SuanliaoTestDialogComponent {
  @HostBinding("class") class = "ng-page";
  info: SuanliaoTestInput;

  constructor(
    private dialog: MatDialog,
    private message: MessageService,
    public dialogRef: MatDialogRef<SuanliaoTestDialogComponent, SuanliaoTestOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SuanliaoTestInput
  ) {
    this.info = cloneDeep(data);
  }

  async getTestCaseItem(data0?: 测试用例) {
    const data: 测试用例 = {名字: "", 时间: 0, 测试数据: {}, 测试正确: false, ...data0};
    const result = await openEditFormulasDialog(this.dialog, {
      data: {
        formulas: data.测试数据,
        extraInputInfos: [
          {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
          {type: "boolean", label: "测试正确", model: {data, key: "测试正确"}}
        ]
      }
    });
    if (result) {
      data.测试数据 = result;
      data.时间 = Date.now();
      return data;
    }
    return null;
  }

  async addTestCase() {
    const data = this.info.data;
    if (!data.测试用例) {
      return;
    }
    const result = await this.getTestCaseItem();
    if (result) {
      data.测试用例.push(result);
    }
  }

  async editTestCase(index: number) {
    const data = this.info.data;
    if (!data.测试用例) {
      return;
    }
    const result = await this.getTestCaseItem(data.测试用例[index]);
    if (result) {
      data.测试用例[index] = result;
    }
  }

  async copyTestCase(index: number) {
    const data = this.info.data;
    if (!data.测试用例) {
      return;
    }
    if (!(await this.message.confirm(`确定复制【${data.测试用例[index].名字}】吗？`))) {
      return;
    }
    const item = cloneDeep(data.测试用例[index]);
    const names = data.测试用例.map((v) => v.名字);
    item.名字 = getCopyName(names, item.名字);
    item.时间 = Date.now();
    data.测试用例.push(item);
  }

  async removeTestCase(index: number) {
    const data = this.info.data;
    if (!data.测试用例) {
      return;
    }
    if (!(await this.message.confirm(`确定删除【${data.测试用例[index].名字}】吗？`))) {
      return;
    }
    data.测试用例.splice(index, 1);
  }

  async importTestCases() {
    const data = this.info.data;
    if (!(await this.message.confirm("导入测试用例会覆盖原有数据，确定导入吗？"))) {
      return;
    }
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      let data2: any;
      try {
        data2 = JSON.parse(reader.result as string);
      } catch (e) {}
      if (Array.isArray(data2)) {
        data.测试用例 = data2;
      } else {
        this.message.error("测试用例数据有误");
      }
    });
    reader.readAsText(file);
  }

  exportTestCases() {
    const data = this.info.data;
    downloadByString(JSON.stringify(data.测试用例), {filename: "测试用例.json"});
  }

  getTimeStr(time: number) {
    return new Date(time).toLocaleString();
  }

  submit() {
    this.dialogRef.close({data: this.info.data});
  }

  cencel() {
    this.dialogRef.close();
  }
}

export const openSuanliaoTestDialog = getOpenDialogFunc<SuanliaoTestDialogComponent, SuanliaoTestInput, SuanliaoTestOutput>(
  SuanliaoTestDialogComponent,
  {width: "100%", height: "100%"}
);
