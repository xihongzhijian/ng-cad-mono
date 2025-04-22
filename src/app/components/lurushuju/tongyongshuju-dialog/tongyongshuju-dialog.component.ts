import {ChangeDetectionStrategy, Component, HostBinding, inject, Inject, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {setGlobal} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppStatusService} from "@services/app-status.service";
import {uniqueId} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {CadItemButton} from "../cad-item/cad-item.types";
import {
  TongyongshujuActiveCadList,
  TongyongshujuActiveItem,
  TongyongshujuCadItemInfo,
  TongyongshujuData,
  TongyongshujuInput,
  TongyongshujuOutput
} from "./tongyongshuju-dialog.types";

@Component({
  selector: "app-tongyongshuju-dialog",
  templateUrl: "./tongyongshuju-dialog.component.html",
  styleUrl: "./tongyongshuju-dialog.component.scss",
  imports: [CadItemComponent, MatButtonModule, MatDividerModule, NgScrollbarModule, SpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TongyongshujuDialogComponent implements OnInit {
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);
  private http = inject(CadDataService);

  @HostBinding("class") class = "ng-page";

  collection: CadCollection = "cad";
  tableData = signal<TongyongshujuData[]>([]);
  activeItem = signal<TongyongshujuActiveItem | null>(null);
  activeItemPrev = signal<TongyongshujuActiveItem | null>(null);
  activeCadList = signal<TongyongshujuActiveCadList | null>(null);
  cadItemButtons: CadItemButton<TongyongshujuCadItemInfo>[];

  tabelListLoader = uniqueId("tabelListLoader");
  activeItemLoader = uniqueId("activeItemLoader");
  cadListLoader = uniqueId("cadListLoader");

  constructor(
    public dialogRef: MatDialogRef<TongyongshujuDialogComponent, TongyongshujuOutput>,
    @Inject(MAT_DIALOG_DATA) public data: TongyongshujuInput
  ) {
    setGlobal("tongyongshujuDialog", this);
    this.cadItemButtons = [
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.deleteCad.bind(this)}
    ];
  }

  ngOnInit() {
    if (!this.data) {
      return;
    }
    this.refresh(0);
  }

  async refresh(i?: number, j?: number) {
    const data = await this.http.queryMySql<TongyongshujuData>({table: "p_tongyongshujuluru"}, {spinner: this.tabelListLoader});
    this.tableData.set(data);
    if (typeof i === "number" && data.length > i) {
      await this.clickTableListItem(i);
    }
    const activeItem = this.activeItem();
    const activeItemPrev = this.activeItemPrev();
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
    const activeItem = this.activeItem();
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
    const item = this.tableData()[index];
    this.activeItemPrev.set(this.activeItem());
    this.activeItem.set(null);
    if (item.active && item.xiaodaohang) {
      const struct = await this.http.getXiaodaohangStructure(item.xiaodaohang, {spinner: this.activeItemLoader});
      if (struct?.table) {
        const data = await this.http.queryMySql({table: struct.table, fields: ["mingzi"]}, {spinner: this.activeItemLoader});
        this.activeItem.set({
          data: data.map<TongyongshujuActiveItem["data"][number]>((v) => {
            return {...v, active: false};
          }),
          index
        });
        this.activeCadList.set(null);
      } else {
        this.activeItem.set({data: [], index});
        await this.setActiveCadList(item);
      }
    }
  }

  refreshActiveCadList() {
    const activeItem = this.activeItem();
    const activeCadList = this.activeCadList();
    if (!activeItem || !activeCadList) {
      return;
    }
    return this.setActiveCadList(this.tableData()[activeItem.index], activeCadList.index);
  }

  async setActiveCadList(item: TongyongshujuData, index?: number) {
    const activeItem = this.activeItem();
    if (!activeItem) {
      return;
    }
    this.activeCadList.set(null);
    if (item.active && this.isDataHaveCad(item)) {
      let $where: string | null = item.cadshaixuanyaoqiu;
      $where = this.replaceCadStr($where, index);
      if (!$where) {
        return;
      }
      const cads = await this.http.queryMongodb<HoutaiCad>({collection: this.collection, where: {$where}}, {spinner: this.cadListLoader});
      this.activeCadList.set({
        index,
        data: cads
      });
    }
  }

  async clickTableListItem(i: number) {
    for (const [j, item] of this.tableData().entries()) {
      if (i === j) {
        item.active = true;
        await this.setActiveItem(i);
      } else {
        item.active = false;
      }
    }
  }

  async editTableListItem(i: number) {
    const item = this.tableData()[i];
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
        this.refresh(this.activeItem()?.index, this.activeCadList()?.index);
      }
    } else {
      this.message.error("没有对应的表");
    }
  }

  helpTableListItem(i: number) {
    const item = this.tableData()[i];
    if (!item.bangzhuwendang) {
      return;
    }
    window.open(item.bangzhuwendang, "_blank");
  }

  async clickActiveItem(i: number, j: number) {
    for (const [k, item] of (this.activeItem()?.data || []).entries()) {
      if (j === k) {
        item.active = true;
        await this.setActiveCadList(this.tableData()[i], j);
      } else {
        item.active = false;
      }
    }
  }

  getShujuyaoqiu(item: TongyongshujuData) {
    return this.status.getCadYaoqiu(item.cadyaoqiu);
  }

  async addCadFromList() {
    const item = this.tableData()[this.activeItem()?.index ?? -1];
    const item2 = this.activeItem()?.data[this.activeCadList()?.index ?? -1];
    if (!item || !item2) {
      return;
    }
    const yaoqiu = this.getShujuyaoqiu(item);
    const result = await openCadListDialog(this.dialog, {
      data: {collection: "cad", selectMode: "single", checkedItemsLimit: 1, yaoqiu, vars: {当前选项: item2.mingzi}}
    });
    if (result) {
      const {collection} = this;
      for (const cad of result) {
        cad.id = "";
        cad.options[item.mingzi] = item2.mingzi;
        await this.http.mongodbInsert(collection, getHoutaiCad(cad), {force: true}, {spinner: this.cadListLoader});
        await this.refreshActiveCadList();
      }
    }
  }

  async copyCad(component: CadItemComponent<TongyongshujuCadItemInfo>) {
    const item = this.activeCadList()?.data[component.customInfo().index];
    if (!item || !(await this.message.confirm("确定复制该CAD吗？"))) {
      return;
    }
    const success = await this.http.mongodbCopy(this.collection, [item._id], {}, {spinner: this.cadListLoader});
    if (success) {
      await this.refreshActiveCadList();
    }
  }

  async deleteCad(component: CadItemComponent<TongyongshujuCadItemInfo>) {
    const item = this.activeCadList()?.data[component.customInfo().index];
    if (!item || !(await this.message.confirm("确定删除该CAD吗？"))) {
      return;
    }
    const success = await this.http.mongodbDelete(this.collection, {id: item._id}, {spinner: this.cadListLoader});
    if (success) {
      await this.refreshActiveCadList();
    }
  }

  editCad(item: HoutaiCad) {
    this.http.mongodbUpdate(this.collection, item, {}, {spinner: this.cadListLoader});
  }
}

export const openTongyongshujuDialog = getOpenDialogFunc<TongyongshujuDialogComponent, TongyongshujuInput, TongyongshujuOutput>(
  TongyongshujuDialogComponent,
  {width: "100%", height: "100%"}
);
