import {Component, EventEmitter, HostBinding, Inject, Output} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {SuanliaogongshiComponent} from "../../../modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiInfo} from "../../../modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {openSelectGongyiDialog} from "../select-gongyi-dialog/select-gongyi-dialog.component";
import {SuanliaoDataInput, SuanliaoDataOutput} from "./suanliao-data-dialog.type";

@Component({
  selector: "app-suanliao-data-dialog",
  standalone: true,
  imports: [CadItemComponent, MatButtonModule, MatDividerModule, NgScrollbarModule, SuanliaogongshiComponent, TableComponent],
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
  suanliaogongshiInfo: SuanliaogongshiInfo;

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
    this.suanliaogongshiInfo = {
      data: {
        算料公式: this.suanliaoData.算料公式,
        测试用例: this.suanliaoData.测试用例
      },
      varNames: this.data.varNames
    };
  }

  returnZero() {
    return 0;
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
