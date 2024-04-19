import {KeyValuePipe, NgTemplateOutlet} from "@angular/common";
import {Component, HostBinding, Inject, OnInit} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {setGlobal} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppStatusService} from "@services/app-status.service";
import {uniqueId} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  TongyongshujuActiveCadList,
  TongyongshujuActiveItem,
  TongyongshujuCadItem,
  TongyongshujuData,
  TongyongshujuInput,
  TongyongshujuOutput
} from "./tongyongshuju-dialog.types";

@Component({
  selector: "app-tongyongshuju-dialog",
  standalone: true,
  imports: [CadImageComponent, KeyValuePipe, MatButtonModule, MatDividerModule, NgScrollbarModule, NgTemplateOutlet, SpinnerModule],
  templateUrl: "./tongyongshuju-dialog.component.html",
  styleUrl: "./tongyongshuju-dialog.component.scss"
})
export class TongyongshujuDialogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";

  collection: CadCollection = "cad";
  tableData: TongyongshujuData[] = [];
  activeItem: TongyongshujuActiveItem | null = null;
  activeItemPrev: TongyongshujuActiveItem | null = null;
  activeCadList: TongyongshujuActiveCadList | null = null;

  tabelListLoader = uniqueId("tabelListLoader");
  activeItemLoader = uniqueId("activeItemLoader");
  cadListLoader = uniqueId("cadListLoader");

  constructor(
    private http: CadDataService,
    private status: AppStatusService,
    private message: MessageService,
    public dialogRef: MatDialogRef<TongyongshujuDialogComponent, TongyongshujuOutput>,
    @Inject(MAT_DIALOG_DATA) public data: TongyongshujuInput
  ) {
    setGlobal("tongyongshujuDialog", this);
  }

  ngOnInit() {
    if (!this.data) {
      return;
    }
    this.refresh(0);
  }

  async refresh(i?: number, j?: number) {
    this.tableData = await this.http.queryMySql<TongyongshujuData>({table: "p_tongyongshujuluru"}, {spinner: this.tabelListLoader});
    if (typeof i === "number" && this.tableData.length > i) {
      await this.clickTableListItem(i);
    }
    const {activeItem, activeItemPrev} = this;
    if (activeItem) {
      if (activeItemPrev && activeItemPrev.index === activeItem.index) {
        let maxVid1 = -1;
        let maxVid2 = -1;
        let maxVid2Index = -1;
        for (const item of activeItemPrev.data) {
          if (item.vid > maxVid1) {
            maxVid1 = item.vid;
          }
        }
        for (const [k, item] of activeItem.data.entries()) {
          if (item.vid > maxVid2) {
            maxVid2 = item.vid;
            maxVid2Index = k;
          }
        }
        if (maxVid2 > maxVid1) {
          j = maxVid2Index;
        }
      }
      if (typeof j === "number") {
        await this.clickActiveItem(activeItem.index, j);
      }
    }
  }

  close() {
    this.dialogRef.close();
  }

  replaceCadStr(str: string, index?: number) {
    const {activeItem} = this;
    const replaceFrom = "当前选项";
    const shouldReplace = str.includes(replaceFrom);
    if (!shouldReplace) {
      return str;
    }
    if (typeof index === "number") {
      const data = activeItem?.data[index];
      if (data?.mingzi) {
        return str.replaceAll(replaceFrom, data.mingzi);
      }
    }
    this.message.error("没有当前选项");
    return null;
  }

  isDataHaveCad(item: TongyongshujuData) {
    const {xuyaocad} = item;
    return xuyaocad === "需要" || xuyaocad === "可以没有";
  }

  async setActiveItem(index: number) {
    const item = this.tableData[index];
    this.activeItemPrev = this.activeItem;
    this.activeItem = null;
    if (item.active && item.xiaodaohang) {
      const struct = await this.http.getXiaodaohangStructure(item.xiaodaohang, {spinner: this.activeItemLoader});
      if (struct?.table) {
        const data = await this.http.queryMySql({table: struct.table, fields: ["mingzi"]}, {spinner: this.activeItemLoader});
        this.activeItem = {
          data: data.map<TongyongshujuActiveItem["data"][number]>((v) => {
            return {...v, active: false};
          }),
          index
        };
        this.activeCadList = null;
      } else {
        this.activeItem = {data: [], index};
        await this.setActiveCadList(item);
      }
    }
  }

  refreshActiveCadList() {
    const {activeItem, activeCadList} = this;
    if (!activeItem || !activeCadList) {
      return;
    }
    return this.setActiveCadList(this.tableData[activeItem.index], activeCadList.index);
  }

  async setActiveCadList(item: TongyongshujuData, index?: number) {
    const {activeItem} = this;
    if (!activeItem) {
      return;
    }
    this.activeCadList = null;
    if (item.active && this.isDataHaveCad(item)) {
      let $where: string | null = item.cadshaixuanyaoqiu;
      $where = this.replaceCadStr($where, index);
      if (!$where) {
        return;
      }
      const cads = await this.http.queryMongodb(
        {collection: this.collection, fields: ["_id", "名字", "选项"], where: {$where}},
        {spinner: this.cadListLoader}
      );
      this.activeCadList = {
        index,
        data: cads
      };
    }
  }

  async clickTableListItem(i: number) {
    for (const [j, item] of this.tableData.entries()) {
      if (i === j) {
        item.active = true;
        await this.setActiveItem(i);
      } else {
        item.active = false;
      }
    }
  }

  async editTableListItem(i: number) {
    const item = this.tableData[i];
    if (!item.xiaodaohang) {
      return;
    }
    let url: string | null;
    if (item.url) {
      url = item.url;
    } else {
      url = await this.http.getShortUrl(item.xiaodaohang);
      item.url = url || "";
    }
    if (url) {
      window.open(url, "_blank");
      if (await this.message.newTabConfirm()) {
        this.refresh(this.activeItem?.index, this.activeCadList?.index);
      }
    } else {
      this.message.error("没有对应的表");
    }
  }

  helpTableListItem(i: number) {
    const item = this.tableData[i];
    if (!item.bangzhuwendang) {
      return;
    }
    window.open(item.bangzhuwendang, "_blank");
  }

  async clickActiveItem(i: number, j: number) {
    for (const [k, item] of (this.activeItem?.data || []).entries()) {
      if (j === k) {
        item.active = true;
        await this.setActiveCadList(this.tableData[i], j);
      } else {
        item.active = false;
      }
    }
  }

  async addCad() {
    const {collection, tableData, activeItem, activeCadList} = this;
    if (!activeItem || !activeCadList) {
      return;
    }
    const item = tableData[activeItem.index];
    if (!this.isDataHaveCad(item)) {
      return;
    }
    const data: Partial<HoutaiCad> = {名字: ""};
    const form: InputInfo<typeof data>[] = [];

    const name = this.replaceCadStr(item.cadmingziyaoqiu, activeCadList.index);
    if (name === null) {
      return;
    }
    const names = name.split("+");
    if (names.length > 1) {
      form.push({
        type: "select",
        label: "名字",
        model: {data, key: "名字"},
        options: names.map((name) => ({label: name, value: name})),
        validators: Validators.required
      });
    } else {
      data.名字 = name;
      form.push({type: "string", label: "名字", model: {data, key: "名字"}, readonly: !!name, validators: Validators.required});
    }

    if (item.cadyaoqiu) {
      data.分类 = item.cadyaoqiu;
    }
    if (item.cadxuanxiangyaoqiu) {
      data.选项 = {};
      for (const str of item.cadxuanxiangyaoqiu.split(";")) {
        const [key, value] = str.split("=");
        if (key && value) {
          const value2 = this.replaceCadStr(value, activeCadList.index);
          if (!value2) {
            return;
          }
          data.选项[key] = value2;
        }
      }
    }

    const result = await this.message.form(form);
    if (result) {
      const success = await this.http.mongodbInsert(collection, data, {spinner: this.cadListLoader});
      if (success) {
        await this.refreshActiveCadList();
      }
    }
  }

  editCad(item: TongyongshujuCadItem) {
    this.status.openCadInNewTab(item._id, this.collection);
  }

  async copyCad(item: TongyongshujuCadItem) {
    if (!(await this.message.confirm("确定复制该CAD吗？"))) {
      return;
    }
    const success = await this.http.mongodbCopy(this.collection, [item._id], {spinner: this.cadListLoader});
    if (success) {
      await this.refreshActiveCadList();
    }
  }

  async deleteCad(item: TongyongshujuCadItem) {
    if (!(await this.message.confirm("确定删除该CAD吗？"))) {
      return;
    }
    const success = await this.http.mongodbDelete(this.collection, {id: item._id}, {spinner: this.cadListLoader});
    if (success) {
      await this.refreshActiveCadList();
    }
  }

  returnZero() {
    return 0;
  }
}

export const openTongyongshujuDialog = getOpenDialogFunc<TongyongshujuDialogComponent, TongyongshujuInput, TongyongshujuOutput>(
  TongyongshujuDialogComponent,
  {width: "100%", height: "100%"}
);
