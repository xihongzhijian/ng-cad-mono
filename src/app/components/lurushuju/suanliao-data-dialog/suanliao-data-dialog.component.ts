import {Component, EventEmitter, HostBinding, Inject, Output, ViewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadData} from "@lucilor/cad-viewer";
import {RequiredKeys} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {OpenCadOptions} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {SuanliaogongshiComponent} from "../../../modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {CadItemButton} from "../cad-item/cad-item.types";
import {openSelectGongyiDialog} from "../select-gongyi-dialog/select-gongyi-dialog.component";
import {SuanliaoTablesComponent} from "../suanliao-tables/suanliao-tables.component";
import {算料数据} from "../xinghao-data";
import {SuanliaoDataCadItemInfo, SuanliaoDataInput, SuanliaoDataOutput} from "./suanliao-data-dialog.type";

@Component({
  selector: "app-suanliao-data-dialog",
  standalone: true,
  imports: [
    CadItemComponent,
    MatButtonModule,
    MatDividerModule,
    NgScrollbarModule,
    SuanliaogongshiComponent,
    SuanliaoTablesComponent,
    TableComponent
  ],
  templateUrl: "./suanliao-data-dialog.component.html",
  styleUrl: "./suanliao-data-dialog.component.scss"
})
export class SuanliaoDataDialogComponent {
  @HostBinding("class") class = "ng-page";
  @Output() cadFormSubmitted = new EventEmitter<void>();

  suanliaoData: SuanliaoDataInput["data"];
  cadItemButtons: CadItemButton<SuanliaoDataCadItemInfo>[] = [
    {name: "复制", onClick: this.copyCad.bind(this)},
    {name: "删除", onClick: this.removeCad.bind(this)},
    {name: "添加孔位配置", onClick: this.addKwpz.bind(this)},
    {name: "添加开料参数", onClick: this.addKlcs.bind(this)}
  ];
  mubanExtraData: CadItemComponent["mubanExtraData"] = {};
  openCadOptions: RequiredKeys<OpenCadOptions, "suanliaogongshiInfo">;

  @ViewChild(SuanliaoTablesComponent) suanliaoTables?: SuanliaoTablesComponent;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    public dialogRef: MatDialogRef<SuanliaoDataDialogComponent, SuanliaoDataOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SuanliaoDataInput
  ) {
    this.suanliaoData = cloneDeep(this.data.data);
    this.mubanExtraData.options = this.data.suanliaoDataParams.选项;
    this.openCadOptions = {
      suanliaogongshiInfo: {
        data: {
          算料公式: this.suanliaoData.算料公式,
          测试用例: this.suanliaoData.测试用例,
          输入数据: this.suanliaoData.输入数据
        },
        varNames: this.data.varNames
      },
      suanliaoTablesInfo: {params: this.data.suanliaoDataParams}
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
          cad.json = v.data.clone(true).export();
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
    const {component, key1} = this.data;
    if (!component) {
      return;
    }
    const result = await openSelectGongyiDialog(this.dialog, {
      data: {
        xinghaos: component.xinghaos,
        xinghaoOptions: component.xinghaoOptionsAll,
        menjiaoOptions: component.menjiaoOptionsAll,
        excludeXinghaos: [component.xinghaoName],
        excludeGongyis: component.gongyi?.名字 ? [component.gongyi.名字] : [],
        key: "算料数据",
        fenlei: component.fenleiName
      }
    });
    const data = result?.items[0]?.data as 算料数据 | undefined;
    if (data) {
      if (await this.message.confirm("复制算料CAD会覆盖原有数据，确定复制吗？")) {
        this.suanliaoData.算料CAD = data[key1].算料CAD;
      }
    } else {
      this.message.alert("数据为空");
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

  async copyCad(component: CadItemComponent<SuanliaoDataCadItemInfo>) {
    const {cad} = component;
    if (!cad || !(await this.message.confirm(`确定复制【${cad.名字}】吗？`))) {
      return;
    }
    const {mubanData} = component;
    const cadData2 = new CadData(cad.json).clone(true);
    cadData2.name += "_复制";
    const cad2 = getHoutaiCad(cadData2);
    if (mubanData) {
      const cadData = new CadData(mubanData.clone(true));
      const result = await this.http.setCad({collection: "kailiaocadmuban", cadData, force: true}, true);
      if (!result) {
        return;
      }
      component.mubanId = result.id;
      component.mubanData = cadData;
    }
    this.suanliaoData.算料CAD.splice(component.customInfo.index + 1, 0, cad2);
  }

  async removeCad(component: CadItemComponent<SuanliaoDataCadItemInfo>) {
    const {cad} = component;
    if (!cad || !(await this.message.confirm(`确定删除【${cad.名字}】吗？`))) {
      return;
    }
    const {mubanId} = component;
    if (mubanId) {
      await this.http.mongodbDelete("kailiaocadmuban", mubanId);
    }
    this.suanliaoData.算料CAD.splice(component.customInfo.index, 1);
  }

  async addKwpz(component: CadItemComponent<SuanliaoDataCadItemInfo>) {
    const {cad} = component;
    const response = await this.http.mongodbInsert("kailiaokongweipeizhi", {...this.data.suanliaoDataParams, 名字: cad.名字});
    if (response) {
      this.suanliaoTables?.updateKlkwpzTable();
    }
  }

  async addKlcs(component: CadItemComponent<SuanliaoDataCadItemInfo>) {
    const {cad} = component;
    const response = await this.http.mongodbInsert("kailiaocanshu", {
      ...this.data.suanliaoDataParams,
      名字: cad.名字 + "中空参数",
      分类: "切中空"
    });
    if (response) {
      this.suanliaoTables?.updateKlcsTable();
    }
  }
}

export const openSuanliaoDataDialog = getOpenDialogFunc<SuanliaoDataDialogComponent, SuanliaoDataInput, SuanliaoDataOutput>(
  SuanliaoDataDialogComponent,
  {width: "100%", height: "100%"}
);
