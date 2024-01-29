import {KeyValuePipe} from "@angular/common";
import {Component, HostBinding, Input} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getCopyName} from "@app/app.common";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep, isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {v4} from "uuid";
import {测试用例, 算料公式} from "../../../../components/lurushuju/xinghao-data";
import {SuanliaogongshiInfo} from "./suanliaogongshi.types";

@Component({
  selector: "app-suanliaogongshi",
  standalone: true,
  imports: [KeyValuePipe, MatButtonModule, MatCardModule, MatTooltipModule, NgScrollbarModule],
  templateUrl: "./suanliaogongshi.component.html",
  styleUrl: "./suanliaogongshi.component.scss"
})
export class SuanliaogongshiComponent {
  @HostBinding("class") class = "ng-page";
  @Input() info: SuanliaogongshiInfo = {data: {算料公式: [], 测试用例: []}};

  constructor(private message: MessageService) {}

  returnZero() {
    return 0;
  }

  async getGongshiItem(data0?: 算料公式) {
    let data: 算料公式;
    if (data0) {
      data = cloneDeep(data0);
    } else {
      data = {_id: v4(), 名字: "", 条件: [], 选项: {}, 公式: {}};
    }
    const form: InputInfo<Partial<算料公式>>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "formulas",
        label: "公式",
        model: {data, key: "公式"},
        varNames: this.info.varNames,
        validators: () => {
          if (isEmpty(data.公式)) {
            return {公式不能为空: true};
          }
          return null;
        }
      }
    ];
    const result = await this.message.form(form);
    return result ? data : null;
  }

  async addGongshi() {
    const data = this.info.data;
    const item = await this.getGongshiItem();
    if (item) {
      data.算料公式.push(item);
    }
  }

  async editGongshi(index: number) {
    const data = this.info.data;
    const item = await this.getGongshiItem(data.算料公式[index]);
    if (item) {
      data.算料公式[index] = item;
    }
  }

  async copyGongshi(index: number) {
    const data = this.info.data;
    if (!(await this.message.confirm(`确定复制【${data.算料公式[index].名字}】吗？`))) {
      return;
    }
    const item = cloneDeep(data.算料公式[index]);
    item._id = v4();
    const names = data.算料公式.map((v) => v.名字);
    item.名字 = getCopyName(names, item.名字);
    data.算料公式.push(item);
  }

  async removeGongshi(index: number) {
    const data = this.info.data;
    if (!(await this.message.confirm(`确定删除【${data.算料公式[index].名字}】吗？`))) {
      return;
    }
    data.算料公式.splice(index, 1);
  }

  async importGonshis() {
    const data = this.info.data;
    if (!(await this.message.confirm("导入算料公式会覆盖原有数据，确定导入吗？"))) {
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
        data.算料公式 = data2;
      } else {
        this.message.error("算料公式数据有误");
      }
    });
    reader.readAsText(file);
  }

  exportGongshis() {
    const data = this.info.data;
    downloadByString(JSON.stringify(data.算料公式), {filename: "算料公式.json"});
  }

  async getTestCaseItem(data0?: 测试用例) {
    const data: 测试用例 = {名字: "", 时间: 0, 测试数据: {}, 测试正确: false, ...data0};
    const form: InputInfo<typeof data>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "formulas",
        label: "测试数据",
        model: {data, key: "测试数据"},
        validators: (control) => {
          if (isEmpty(control.value)) {
            return {测试数据不能为空: true};
          }
          return null;
        }
      },
      {type: "boolean", label: "测试正确", model: {data, key: "测试正确"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      result.时间 = Date.now();
    }
    return result;
  }

  async addTestCase() {
    const data = this.info.data;
    const result = await this.getTestCaseItem();
    if (result) {
      data.测试用例.push(result);
    }
  }

  async editTestCase(index: number) {
    const data = this.info.data;
    const result = await this.getTestCaseItem(data.测试用例[index]);
    if (result) {
      data.测试用例[index] = result;
    }
  }

  async copyTestCase(index: number) {
    const data = this.info.data;
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
}
