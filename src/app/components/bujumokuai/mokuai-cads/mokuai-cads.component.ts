import {
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  model,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {setGlobal} from "@app/app.common";
import {setCadData} from "@app/cad/cad-shujuyaoqiu";
import {getNameWithSuffix} from "@app/utils/get-value";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemIsOnlineInfo, CadItemSelectable} from "@components/lurushuju/cad-item/cad-item.types";
import {isSbjbType} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, timeout} from "@lucilor/utils";
import {openCadForm} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {DataListComponent} from "@modules/data-list/components/data-list/data-list.component";
import {DataListNavNameChangeEvent, DataListQueryItemField} from "@modules/data-list/components/data-list/data-list.types";
import {DataListNavNode} from "@modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@modules/data-list/data-list.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad, MongodbUpdateData} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {openExportPage} from "@views/export/export.utils";
import {ImportCache} from "@views/import/import.types";
import {openImportPage} from "@views/import/import.utils";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {BjmkStatusService} from "../services/bjmk-status.service";
import {MokuaiCadItemInfo} from "./mokuai-cads.types";

@Component({
  selector: "app-mokuai-cads",
  imports: [
    CadImageComponent,
    CadItemComponent,
    DataListModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    NgScrollbarModule
  ],
  templateUrl: "./mokuai-cads.component.html",
  styleUrl: "./mokuai-cads.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MokuaiCadsComponent {
  private bjmkStatus = inject(BjmkStatusService);
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  selectable = input(false, {transform: booleanAttribute});
  selectedCads = model<CadData[]>([]);

  navDataName = signal("配件库分类");
  queryItemFieldInfos = computed(() => {
    const fields: DataListQueryItemField<CadData>[] = [];
    for (const item of this.cadYaoqiu()?.CAD弹窗修改属性 || []) {
      if (item.cadKey) {
        fields.push({field: item.cadKey, title: item.key});
      }
    }
    return fields;
  });
  cads = signal<CadData[]>([]);
  activeNavNode = signal<DataListNavNode | null>(null);
  cadsIsOnline: ObjectOf<CadItemIsOnlineInfo<MokuaiCadItemInfo>> = {};
  cadItemButtons = computed(() => {
    const buttons: CadItemButton<MokuaiCadItemInfo>[] = [
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.removeCad.bind(this)}
    ];
    return buttons;
  });
  async onNavNameChange({before, after}: DataListNavNameChangeEvent) {
    const success = await this.http.updateItemType(this.bjmkStatus.collection, "分类", before, after);
    if (!success) {
      return;
    }
    const cads = this.cadsAll().filter((v) => v.type === before);
    for (const cad of cads) {
      if (cad.type === before) {
        cad.type = after;
      }
    }
    this.bjmkStatus.cadsManager.refresh({update: cads});
  }

  selectedCadIndexs = signal<number[]>([]);
  selectedCadIndexsEff = effect(() => {
    this.cads();
    this.selectedCadIndexs.set([]);
  });
  cadsSelectInfo = computed(() => {
    const infos: CadItemSelectable<MokuaiCadItemInfo>[] = [];
    const indexs = this.selectedCadIndexs();
    for (const [i] of this.cads().entries()) {
      infos.push({
        selected: indexs.includes(i),
        onChange: () => {
          const indexs2 = this.selectedCadIndexs();
          if (indexs2.includes(i)) {
            this.selectedCadIndexs.set(indexs2.filter((v) => v !== i));
          } else {
            this.selectedCadIndexs.set([...indexs2, i]);
          }
        }
      });
    }
    return infos;
  });

  dataList = viewChild(DataListComponent);
  selectedCadsScrollbar = viewChild<NgScrollbar>("selectedCadsScrollbar");

  constructor() {
    setGlobal("mkcads", this);
  }

  cadsAllEff = effect(() => {
    const cads = this.cadsAll();
    const cadsIsOnlineOld = this.cadsIsOnline;
    const cadsIsOnline: typeof this.cadsIsOnline = {};
    this.cadsIsOnline = cadsIsOnline;
    for (const cad of cads) {
      const id = cad.id;
      if (cadsIsOnlineOld[id]) {
        cadsIsOnline[id] = cadsIsOnlineOld[id];
      } else {
        cadsIsOnline[id] = {
          isFetched: false,
          afterFetch: () => {
            cadsIsOnline[id].isFetched = true;
          }
        };
      }
    }
  });

  cadsEditMode = signal(false);
  cadItemEditable = computed(() => {
    if (this.selectable()) {
      return this.cadsEditMode();
    } else {
      return true;
    }
  });
  toggleCadsEditMode() {
    this.cadsEditMode.update((v) => !v);
  }

  cadsAll = this.bjmkStatus.cadsManager.items;
  collection = this.bjmkStatus.collection;
  cadYaoqiu = computed(() => {
    const type = this.activeNavNode()?.name || "";
    return this.status.getCadYaoqiu(type);
  });
  downloadApi = this.http.getUrl("ngcad/downloadFile");
  async getCadItem(data?: CadData) {
    const yaoqiu = this.cadYaoqiu();
    if (!yaoqiu) {
      return null;
    }
    const collection = this.collection;
    return await openCadForm(yaoqiu, collection, data, this.http, this.dialog, this.status, this.message, true);
  }
  async addCad() {
    const data = await this.getCadItem();
    if (data) {
      const resData = await this.http.mongodbInsert<HoutaiCad>(this.collection, getHoutaiCad(data));
      if (resData) {
        this.bjmkStatus.cadsManager.refresh({add: [new CadData(resData.json)]});
      }
    }
  }
  async copyCad(component: CadItemComponent<MokuaiCadItemInfo>) {
    const {index} = component.customInfo();
    const cad = this.cads()[index];
    const collection = this.collection;
    const items = await this.http.mongodbCopy<HoutaiCad>(collection, [cad.id]);
    if (items?.[0]) {
      const data = new CadData(items[0].json);
      this.bjmkStatus.cadsManager.refresh({add: [data]});
    }
  }
  async removeCad(component: CadItemComponent<MokuaiCadItemInfo>) {
    const {index} = component.customInfo();
    const cad = this.cads()[index];
    if (!(await this.message.confirm(`是否确定删除【${cad.name}】？`))) {
      return;
    }
    const result = await this.http.mongodbDelete(this.collection, {id: cad.id});
    if (result) {
      this.bjmkStatus.cadsManager.refresh({remove: [cad]});
    }
  }
  private async _getSelectedCads() {
    const indexs = this.selectedCadIndexs();
    if (indexs.length < 1) {
      await this.message.alert("请先选择CAD");
      return null;
    }
    const cads = this.cads();
    return indexs.map((i) => cads[i]);
  }
  async copyCads() {
    const cads = await this._getSelectedCads();
    if (!cads) {
      return;
    }
    const ids = cads.map((v) => v.id);
    const items = await this.http.mongodbCopy<HoutaiCad>(this.bjmkStatus.collection, ids);
    if (items) {
      this.bjmkStatus.cadsManager.refresh({add: items.map((v) => new CadData(v.json))});
    }
  }
  async removeCads() {
    const cads = await this._getSelectedCads();
    if (!cads || !(await this.message.confirm(`是否确定删除？`))) {
      return;
    }
    const ids = cads.map((v) => v.id);
    const success = await this.http.mongodbDelete(this.bjmkStatus.collection, {ids});
    if (success) {
      this.bjmkStatus.cadsManager.refresh({remove: cads});
    }
  }
  canMoveCads = computed(() => {
    const dataList = this.dataList();
    if (!dataList) {
      return false;
    }
    const node = this.activeNavNode();
    if (!node) {
      return false;
    }
    return !isSbjbType(node.name);
  });
  async moveCads() {
    const cads = await this._getSelectedCads();
    const dataList = this.dataList();
    if (!cads || !dataList) {
      return;
    }
    const node = this.activeNavNode();
    if (!node) {
      await this.message.alert("请先选择分类");
      return;
    }
    const title = `CAD：${cads.map((v) => v.name).join("，")} `;
    const {node: node2, submit} = await dataList.selectNode("leaf", title, node);
    if (!submit || !node2) {
      return;
    }
    const datas: MongodbUpdateData<HoutaiCad>[] = [];
    for (const cad of cads) {
      cad.type = node2.name;
      datas.push({_id: cad.id, 分类: cad.type});
    }
    await this.http.mongodbUpdateMulti(this.bjmkStatus.collection, datas);
    this.bjmkStatus.cadsManager.refresh({update: cads});
  }
  refreshCads() {
    this.bjmkStatus.cadsManager.fetch(true);
  }
  async afterEditCad(id: string) {
    const dataList = this.dataList();
    const i = dataList?.getItemIndex((v) => v.id === id) ?? -1;
    this.cads.update((v) => [...v]);
    this.bjmkStatus.cadsManager.refresh();
    await timeout(0);
    const j = dataList?.getItemIndex((v) => v.id === id) ?? -1;
    if (i >= 0 && j >= 0 && i !== j) {
      this.dataList()?.scrollToItemWithId(id);
    }
  }
  clickCad(i: number) {
    if (this.selectable() && !this.cadItemEditable()) {
      this.selectCad(i);
    }
  }

  async selectCad(i: number) {
    const cads = this.cads();
    let cad0 = cads[i];
    if (!this.cadsIsOnline[cad0.id].isFetched) {
      cad0 = (await this.http.getCad({collection: this.bjmkStatus.collection, id: cad0.id})).cads[0];
      if (cad0) {
        cads[i] = cad0;
        this.cads.update((v) => [...v]);
        this.cadsIsOnline[cad0.id].isFetched = true;
      } else {
        return;
      }
    }
    const cad = cad0.clone(true);
    cad.info.isLocal = true;
    delete cad.info.imgId;
    delete cad.info.incomplete;
    delete cad.info.isOnline;
    const yaoqiu = this.cadYaoqiu();
    setCadData(cad, yaoqiu, "set");
    const names = this.selectedCads().map((v) => v.name);
    cad.name = getNameWithSuffix(names, cad.name, "_", 1);
    this.selectedCads.update((v) => [...v, cad]);
    setTimeout(() => {
      this.selectedCadsScrollbar()?.scrollTo({bottom: 0});
      this.cd.markForCheck();
    }, 0);
  }
  unselectCad(i: number) {
    this.selectedCads.update((v) => v.filter((_, index) => index !== i));
  }
  selectAllCads() {
    const indexs = this.selectedCadIndexs();
    const cads = this.cads();
    if (indexs.length === cads.length) {
      this.selectedCadIndexs.set([]);
    } else {
      this.selectedCadIndexs.set(cads.map((_, i) => i));
    }
  }

  async openImportPage() {
    const collection = this.bjmkStatus.collection;
    const data: ImportCache = {collection, yaoqiu: this.cadYaoqiu(), lurushuju: true};
    if (data.yaoqiu && !data.yaoqiu.新建CAD要求.some((v) => v.cadKey === "type")) {
      data.yaoqiu.新建CAD要求.push({
        cadKey: "type",
        key: "分类",
        readonly: true,
        override: true,
        value: this.activeNavNode()?.name || ""
      });
    }
    openImportPage(this.status, data);
    if (await this.message.newTabConfirm()) {
      this.refreshCads();
    }
  }
  openExportPage() {
    const cads = this.cads();
    const ids = cads.map((v) => v.id);
    const selectedIds = this.selectedCadIndexs().map((v) => cads[v].id);
    const collection = this.bjmkStatus.collection;
    openExportPage(this.status, {collection, ids: selectedIds, search: {_id: {$in: ids}}, lurushuju: true});
  }
}
