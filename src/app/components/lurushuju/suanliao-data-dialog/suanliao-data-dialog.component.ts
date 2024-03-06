import {Component, EventEmitter, HostBinding, Inject, Output, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, RequiredKeys} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {OpenCadOptions} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {SuanliaogongshiComponent} from "../../../modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {CadItemButton} from "../cad-item/cad-item.types";
import {openSelectGongyiDialog} from "../select-gongyi-dialog/select-gongyi-dialog.component";
import {SelectGongyiItemData} from "../select-gongyi-dialog/select-gongyi-dialog.types";
import {SuanliaoTablesComponent} from "../suanliao-tables/suanliao-tables.component";
import {openSuanliaoTestDialog} from "../suanliao-test-dialog/suanliao-test-dialog.component";
import {SuanliaoDataParams, 算料数据} from "../xinghao-data";
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
  cadItemButtons: CadItemButton<SuanliaoDataCadItemInfo>[];
  mubanExtraData: CadItemComponent["mubanExtraData"] = {};
  openCadOptions: RequiredKeys<OpenCadOptions, "suanliaogongshiInfo">;

  @ViewChild(SuanliaoTablesComponent) suanliaoTables?: SuanliaoTablesComponent;
  @ViewChildren(CadItemComponent) cadItems?: QueryList<CadItemComponent>;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    private spinner: SpinnerService,
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
    this.cadItemButtons = [
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.removeCad.bind(this)}
    ];
    if (this.data.isKailiao) {
      this.cadItemButtons.push(
        ...[
          {name: "添加孔位配置", onClick: this.addKwpz.bind(this)},
          {name: "添加开料参数", onClick: this.addKlcs.bind(this)}
        ]
      );
    }
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
    if (result) {
      data.算料CAD = result.零散.map((v) => getHoutaiCad(v.data));
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
    const data = result?.items[0] as SelectGongyiItemData<算料数据>;
    if (data && data.工艺做法 && data.data) {
      const {suanliaoTables} = this;
      this.suanliaoData.算料CAD.push(...data.data[key1].算料CAD);
      this.suanliaoData.算料公式.push(...data.data[key1].算料公式);
      if (suanliaoTables) {
        const [包边方向, 开启] = key1.split("+");
        const suanliaoDataParams: SuanliaoDataParams = {
          选项: {
            型号: data.型号,
            产品分类: data.产品分类,
            工艺做法: data.工艺做法,
            包边方向,
            开启,
            门铰锁边铰边: data.data.名字
          }
        };
        this.spinner.show(this.spinner.defaultLoaderId);
        const klkwpzData = await suanliaoTables.getKlkwpzData(suanliaoDataParams);
        const klcsData = await suanliaoTables.getKlcsTableData(suanliaoDataParams);
        const suanliaoDataParams2 = this.data.suanliaoDataParams;
        await this.http.mongodbInsertMulti(
          suanliaoTables.klkwpzCollection,
          klkwpzData.map((v) => ({名字: v.名字, 孔位配置: v.孔位配置})),
          suanliaoDataParams2,
          {silent: true}
        );
        await this.http.mongodbInsertMulti(
          suanliaoTables.klcsCollection,
          klcsData.map((v) => ({名字: v.名字, 参数: v.参数})),
          suanliaoDataParams2,
          {silent: true}
        );
        await suanliaoTables.update();
        this.spinner.hide(this.spinner.defaultLoaderId);
      }
    }
  }

  async suanliaoTest() {
    const result = await openSuanliaoTestDialog(this.dialog, {data: {data: {测试用例: this.suanliaoData.测试用例}}});
    if (result) {
      this.suanliaoData.测试用例 = result.data.测试用例 || [];
    }
  }

  async submit() {
    const cadItems = this.cadItems?.toArray() || [];
    const errors: string[] = [];
    if (!cadItems.every((v) => v.validate())) {
      errors.push("CAD数据有误");
    }
    if (errors.length) {
      this.message.error(errors.join("<br>"));
      return;
    }
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
    if (!cad || !(await this.message.confirm(`删除【${cad.名字}】将同时删除对应的孔位配置、开料参数、开料模板，确定删除吗？`))) {
      return;
    }
    const {mubanId} = component;
    if (mubanId) {
      await this.http.mongodbDelete("kailiaocadmuban", {id: mubanId});
    }
    const names = this.suanliaoData.算料CAD.filter((v) => v.名字 === cad.名字);
    if (names.length < 2) {
      const params: ObjectOf<any> = this.data.suanliaoDataParams;
      await this.http.mongodbDelete("kailiaokongweipeizhi", {filter: {...params, 名字: cad.名字}});
      await this.http.mongodbDelete("kailiaocanshu", {filter: {...params, 名字: cad.名字 + "中空参数"}});
      this.suanliaoTables?.update();
    }
    this.suanliaoData.算料CAD.splice(component.customInfo.index, 1);
  }

  async addKwpz(component: CadItemComponent<SuanliaoDataCadItemInfo>) {
    const {suanliaoTables} = this;
    if (!suanliaoTables) {
      return;
    }
    const {cad} = component;
    const id = await this.http.mongodbInsert(suanliaoTables.klkwpzCollection, {...this.data.suanliaoDataParams, 名字: cad.名字});
    if (id) {
      suanliaoTables.updateKlkwpzTable();
    }
  }

  async addKlcs(component: CadItemComponent<SuanliaoDataCadItemInfo>) {
    const {suanliaoTables} = this;
    if (!suanliaoTables) {
      return;
    }
    const {cad} = component;
    const response = await this.http.mongodbInsert(suanliaoTables.klcsCollection, {
      ...this.data.suanliaoDataParams,
      名字: cad.名字 + "中空参数",
      分类: "切中空"
    });
    if (response) {
      suanliaoTables.updateKlcsTable();
    }
  }
}

export const openSuanliaoDataDialog = getOpenDialogFunc<SuanliaoDataDialogComponent, SuanliaoDataInput, SuanliaoDataOutput>(
  SuanliaoDataDialogComponent,
  {width: "100%", height: "100%"}
);
