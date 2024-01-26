import {KeyValuePipe} from "@angular/common";
import {Component, EventEmitter, HostBinding, Inject, Output} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getCopyName} from "@app/app.common";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadData} from "@lucilor/cad-viewer";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep, isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {v4} from "uuid";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {openSelectGongyiDialog} from "../select-gongyi-dialog/select-gongyi-dialog.component";
import {测试用例, 算料公式} from "../xinghao-data";
import {SuanliaoDataInput, SuanliaoDataOutput} from "./suanliao-data-dialog.type";

@Component({
  selector: "app-suanliao-data-dialog",
  standalone: true,
  imports: [
    CadItemComponent,
    KeyValuePipe,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    NgScrollbarModule,
    TableComponent
  ],
  templateUrl: "./suanliao-data-dialog.component.html",
  styleUrl: "./suanliao-data-dialog.component.scss"
})
export class SuanliaoDataDialogComponent {
  @HostBinding("class") class = "ng-page";
  @Output() cadFormSubmitted = new EventEmitter<void>();

  suanliaoData: SuanliaoDataInput["data"];
  klkwpzTable: TableRenderInfo<any> = {
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "孔位配置",
        buttons: [
          {event: "界面编辑", color: "primary"},
          {event: "JSON编辑", color: "primary"}
        ]
      }
    ],
    title: "开料孔位配置",
    noCheckBox: true,
    toolbarButtons: {
      extra: [
        {event: "编辑", color: "primary"},
        {event: "刷新", color: "primary"}
      ],
      inlineTitle: true
    }
  };
  cadItemButtons: CadItemComponent["buttons"] = [
    {
      name: "添加空孔位配置",
      onClick: this.addKwpz.bind(this)
    }
  ];
  mubanExtraData: CadItemComponent["mubanExtraData"] = {};

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    private status: AppStatusService,
    public dialogRef: MatDialogRef<SuanliaoDataDialogComponent, SuanliaoDataOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SuanliaoDataInput
  ) {
    if (!this.data) {
      this.data = {data: {算料公式: [], 测试用例: [], 算料CAD: []}, varNames: {names: [], width: 0}, klkwpzParams: {}};
    }
    this.suanliaoData = cloneDeep(this.data.data);
    this.updateKlkwpzTable();
    if (this.data.klkwpzParams?.选项) {
      this.mubanExtraData.options = this.data.klkwpzParams.选项;
    }
  }

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
        varNames: this.data?.varNames,
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
    const data = this.suanliaoData;
    const item = await this.getGongshiItem();
    if (item) {
      data.算料公式.push(item);
    }
  }

  async editGongshi(index: number) {
    const data = this.suanliaoData;
    const item = await this.getGongshiItem(data.算料公式[index]);
    if (item) {
      data.算料公式[index] = item;
    }
  }

  async copyGongshi(index: number) {
    const data = this.suanliaoData;
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
    const data = this.suanliaoData;
    if (!(await this.message.confirm(`确定删除【${data.算料公式[index].名字}】吗？`))) {
      return;
    }
    data.算料公式.splice(index, 1);
  }

  async importGonshis() {
    const data = this.suanliaoData;
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
    const data = this.suanliaoData;
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
    const data = this.suanliaoData;
    const result = await this.getTestCaseItem();
    if (result) {
      data.测试用例.push(result);
    }
  }

  async editTestCase(index: number) {
    const data = this.suanliaoData;
    const result = await this.getTestCaseItem(data.测试用例[index]);
    if (result) {
      data.测试用例[index] = result;
    }
  }

  async copyTestCase(index: number) {
    const data = this.suanliaoData;
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
    const data = this.suanliaoData;
    if (!(await this.message.confirm(`确定删除【${data.测试用例[index].名字}】吗？`))) {
      return;
    }
    data.测试用例.splice(index, 1);
  }

  async importTestCases() {
    const data = this.suanliaoData;
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
    const data = this.suanliaoData;
    downloadByString(JSON.stringify(data.测试用例), {filename: "测试用例.json"});
  }

  getTimeStr(time: number) {
    return new Date(time).toLocaleString();
  }

  async selectSuanliaoCads() {
    const data = this.suanliaoData;
    const zxpjData: ZixuanpeijianInput = {
      data: {
        零散: data.算料CAD.map((v) => {
          return {data: new CadData(v.json), info: {houtaiId: v._id, zhankai: [], calcZhankai: []}};
        })
      },
      step: 3,
      stepFixed: true,
      noValidateCads: true
    };
    const result = await openZixuanpeijianDialog(this.dialog, {data: zxpjData});
    if (!result) {
      return;
    }
    const ids = result.零散.map((v) => v.info.houtaiId);
    if (ids.length > 0) {
      const result2 = await this.http.queryMongodb<HoutaiCad>({collection: "cad", fields: {json: false}, where: {_id: {$in: ids}}});
      const result3: HoutaiCad[] = [];
      for (const v of result.零散) {
        const cad = cloneDeep(result2.find((v2) => v2._id === v.info.houtaiId));
        if (cad) {
          cad.json = v.data.export();
          result3.push(cad);
        } else {
          const cad2 = data.算料CAD.find((v2) => v2.json.id === v.data.id);
          if (cad2) {
            result3.push(cad2);
          }
        }
      }
      data.算料CAD = result3;
    } else {
      data.算料CAD = [];
    }
  }

  async copySuanliaoCads() {
    const data = this.suanliaoData;
    const result = await openSelectGongyiDialog(this.dialog, {
      data: this.data.copySuanliaoCadsInput
    });
    const item = result?.items[0];
    if (item && (await this.message.confirm("复制算料CAD会覆盖原有数据，确定复制吗？"))) {
      data.算料CAD = item.算料CAD;
    }
  }

  suanliao() {
    this.message.alert("未实现");
  }

  submit() {
    this.dialogRef.close({data: this.suanliaoData});
  }

  cancel() {
    this.dialogRef.close();
  }

  async updateKlkwpzTable() {
    this.klkwpzTable.data = await this.http.queryMongodb({
      collection: "kailiaokongweipeizhi",
      where: this.data.klkwpzParams,
      fields: this.klkwpzTable.columns.map((v) => v.field)
    });
  }

  async onKlkwpzToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "编辑":
        {
          const {klkwpzParams} = this.data;
          const url = await this.http.getShortUrl("开料孔位配置", {search2: klkwpzParams, extraData: klkwpzParams});
          if (url) {
            window.open(url);
            if (await this.message.newTabConfirm("是否修改了数据？")) {
              this.updateKlkwpzTable();
            }
          }
        }
        break;
      case "刷新":
        this.updateKlkwpzTable();
        break;
    }
  }

  async onKlkwpzRow(event: RowButtonEvent<any>) {
    const {item, column} = event;
    switch (event.button.event) {
      case "界面编辑":
        this.status.openInNewTab(["kailiaokongweipeizhi"], {queryParams: {id: item._id}});
        break;
      case "JSON编辑":
        if (await this.message.confirm("目前有bug")) {
          const json = item[column.field];
          const result = await this.message.json(json);
          if (result) {
            const response = await this.http.mongodbUpdate("kailiaokongweipeizhi", {_id: item._id}, {[column.field]: result});
            if (response) {
              this.updateKlkwpzTable();
            }
          }
        }
        break;
    }
  }

  async addKwpz(component: CadItemComponent) {
    const {list, index} = component;
    const cad = list[index];
    if (!cad) {
      return;
    }
    const response = await this.http.mongodbInsert("kailiaokongweipeizhi", {...this.data.klkwpzParams, 名字: cad.名字});
    if (response) {
      this.updateKlkwpzTable();
    }
  }
}

export const openSuanliaoDataDialog = getOpenDialogFunc<SuanliaoDataDialogComponent, SuanliaoDataInput, SuanliaoDataOutput>(
  SuanliaoDataDialogComponent,
  {width: "100%", height: "100%"}
);
