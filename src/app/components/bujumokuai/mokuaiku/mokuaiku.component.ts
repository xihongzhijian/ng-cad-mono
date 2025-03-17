import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule} from "@angular/material/tree";
import {ActivatedRoute} from "@angular/router";
import {session, setGlobal} from "@app/app.common";
import {environment} from "@env";
import {timeout} from "@lucilor/utils";
import {DataListComponent} from "@modules/data-list/components/data-list/data-list.component";
import {DataListNavNameChangeEvent, DataListSelectMode} from "@modules/data-list/components/data-list/data-list.types";
import {DataListNavNode, findDataListNavNode} from "@modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@modules/data-list/data-list.module";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {MokuaiItemComponent} from "../mokuai-item/mokuai-item.component";
import {MokuaiItem} from "../mokuai-item/mokuai-item.types";
import {BjmkStatusService} from "../services/bjmk-status.service";
import {MokuaikuCloseEvent} from "./mokuaiku.types";

@Component({
  selector: "app-mokuaiku",
  imports: [
    DataListModule,
    FloatingDialogModule,
    ImageComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatIconModule,
    MatTreeModule,
    MokuaiItemComponent,
    NgScrollbarModule
  ],
  templateUrl: "./mokuaiku.component.html",
  styleUrl: "./mokuaiku.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MokuaikuComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);

  @HostBinding("class") class = ["ng-page"];

  selectable = input(false, {transform: booleanAttribute});
  selectedMokuaiIdsIn = input<number[]>([], {alias: "selectedMokuaiIds"});
  closeOut = output<MokuaikuCloseEvent>({alias: "close"});

  production = environment.production;

  constructor() {
    setGlobal("mkk", this);
    this.bjmkStatus.mokuaisManager.fetchManager.noFetch = true;
  }

  async ngOnInit() {
    this._saveInfoLock.set(true);
    if (!this.production) {
      this.loadInfo();
    }
    this.route.queryParams.subscribe((params) => {
      const {mokuaiId} = params;
      if (mokuaiId) {
        this.enterMokuai(Number(mokuaiId), false);
      } else {
        this.bjmkStatus.mokuaisManager.fetchManager.noFetch = false;
        this.bjmkStatus.mokuaisManager.fetch();
      }
    });
  }

  navDataName = "模块库分类";
  mokuaiActiveNavNode = signal<DataListNavNode | null>(null);
  mokuaiActiveItem = signal<MokuaiItem | null>(null);
  mokuaisAll = this.bjmkStatus.mokuaisManager.items;
  navNodeSelectMode = signal<DataListSelectMode>("none");
  navNodesSelected = signal<DataListNavNode[]>([]);
  mokuais = signal<MokuaiItem[]>([]);
  imgPrefix = this.bjmkStatus.imgPrefix;
  dataList = viewChild(DataListComponent);
  async onNavNameChange({before, after}: DataListNavNameChangeEvent) {
    const success = await this.http.updateItemType("p_peijianmokuai", "fenlei", before, after);
    if (!success) {
      return;
    }
    for (const mokuai of this.mokuaisAll()) {
      if (mokuai.type === before) {
        mokuai.type = after;
      }
    }
    this.bjmkStatus.mokuaisManager.refresh();
  }

  mokuaiEditMode = signal(false);
  toggleMokuaiEditMode() {
    this.mokuaiEditMode.update((v) => !v);
  }

  openedMokuai = signal<{id: number; closable: boolean; item?: MokuaiItem} | null>(null);
  async enterMokuai(id: number | MokuaiItem, closable: boolean) {
    if (!this.bancaiListData()) {
      await this.getBancaiListData();
    }
    if (typeof id === "object") {
      this.openedMokuai.set({id: id.id, closable, item: id});
    } else {
      this.openedMokuai.set({id, closable});
    }
  }
  closeMokuai() {
    const openedMokuai = this.openedMokuai();
    const type = this.mokuaiActiveNavNode()?.name;
    if (type && openedMokuai?.item && type !== openedMokuai.item.type) {
      this.dataList()?.updateActiveNavNode(openedMokuai.item.type);
    }
    this.openedMokuai.set(null);
  }

  async addMukuai(mokuai?: Partial<MokuaiItem>) {
    const dataList = this.dataList();
    const activeNode = this.mokuaiActiveNavNode();
    if (!activeNode) {
      await this.message.alert("请先选择分类");
      return;
    }
    const mokuai2 = await this.bjmkStatus.addMukuai(mokuai, {mokuaiOverride: {type: activeNode.name}, dataList});
    if (mokuai2) {
      if (mokuai2.type) {
        dataList?.updateActiveNavNode(mokuai2.type);
      }
      this.enterMokuai(mokuai2, true);
    }
  }
  async editMokuai(mokuai: MokuaiItem) {
    const dataList = this.dataList();
    const i = dataList?.getItemIndex((v) => v.id === mokuai.id) ?? -1;
    await this.bjmkStatus.editMokuai(mokuai, {isCompact: true});
    await timeout(0);
    const j = dataList?.getItemIndex((v) => v.id === mokuai.id) ?? -1;
    if (i >= 0 && j >= 0 && i !== j) {
      dataList?.scrollToItemWithId(String(mokuai.id));
    }
  }
  async copyMokuai(item: MokuaiItem) {
    await this.bjmkStatus.copyMokuai(item);
  }
  async removeMokuai(item: MokuaiItem) {
    await this.bjmkStatus.removeMokuai(item);
  }
  async removeMokuais() {
    const items = this.selectedMokuais();
    await this.bjmkStatus.removeMokuais(items);
  }
  async moveMokuais() {
    const items = this.selectedMokuais();
    if (items.length < 1) {
      await this.message.alert("请选择要移动的模块");
      return;
    }
    const dataList = this.dataList();
    if (!dataList) {
      return;
    }
    const node = this.mokuaiActiveNavNode();
    if (!node) {
      await this.message.alert("请先选择分类");
      return;
    }
    const title = `模块：${items.map((v) => v.name).join("，")} `;
    const {node: node2, submit} = await dataList.selectNode("leaf", title, node);
    if (!submit || !node2) {
      return;
    }
    const mokuais: Partial<MokuaiItem>[] = items.map((v) => ({id: v.id, type: node2.name}));
    await this.bjmkStatus.editMokuais(mokuais);
  }
  refreshMokuais() {
    this.bjmkStatus.mokuaisManager.fetch(true);
  }
  clickMokuaiItem(item: MokuaiItem) {
    this.mokuaiActiveItem.set(item);
  }

  mokuaisSelectedIndexs = signal<number[]>([]);
  mokuaisSelectedIndexsEff = effect(() => {
    this.mokuais();
    this.mokuaisSelectedIndexs.set([]);
  });
  toggleMokuaisSelected(index: number) {
    const indexs = this.mokuaisSelectedIndexs();
    if (indexs.includes(index)) {
      this.mokuaisSelectedIndexs.set(indexs.filter((i) => i !== index));
    } else {
      this.mokuaisSelectedIndexs.set([...indexs, index]);
    }
  }
  selectAllMokuais() {
    const indexs = this.mokuaisSelectedIndexs();
    const mokuais = this.mokuais();
    if (indexs.length === mokuais.length) {
      this.mokuaisSelectedIndexs.set([]);
    } else {
      this.mokuaisSelectedIndexs.set(mokuais.map((_, i) => i));
    }
  }

  exportMokuais() {
    const mokuais = this.mokuais();
    let ids = this.mokuaisSelectedIndexs().map((i) => mokuais[i].id);
    if (ids.length < 1) {
      const mode = this.navNodeSelectMode();
      if (mode === "none") {
        this.navNodeSelectMode.set("multiple");
        this.navNodesSelected.set([]);
        return;
      } else {
        const nodeNames = this.navNodesSelected().map((v) => v.name);
        ids = [];
        for (const mokuai of this.mokuaisAll()) {
          if (nodeNames.includes(mokuai.type)) {
            ids.push(mokuai.id);
          }
        }
        this.navNodeSelectMode.set("none");
        this.navNodesSelected.set([]);
        if (ids.length < 1) {
          return;
        }
      }
    }
    this.bjmkStatus.exportMokuais(ids);
  }
  importMokuais() {
    this.bjmkStatus.importMokuais();
  }

  bancaiListData = signal<BancaiListData | null>(null);
  bancaiListDataRefresh = signal(() => this.http.getBancaiList());
  async getBancaiListData() {
    const result = await this.http.getBancaiList();
    if (result) {
      this.bancaiListData.set(result);
    }
  }

  getInfo() {
    const dataList = this.dataList();
    return {
      navQuery: dataList?.navQuery() || "",
      navEditMode: dataList?.navEditMode() || false,
      mokuaiActiveItemType: this.mokuaiActiveNavNode(),
      mokuaiEditMode: this.mokuaiEditMode(),
      mokuaiItemQuery: dataList?.itemQuery() || "",
      currMokuaiItem: this.openedMokuai()?.id
    };
  }
  setInfo(info: ReturnType<typeof this.getInfo>) {
    const dataList = this.dataList();
    if (dataList) {
      dataList.navQuery.set(info.navQuery);
      dataList.navEditMode.set(info.navEditMode);
      if (info.mokuaiActiveItemType && this.mokuaiActiveNavNode() !== info.mokuaiActiveItemType) {
        this.mokuaiActiveNavNode.set(info.mokuaiActiveItemType);
      }
      dataList.itemQuery.set(info.mokuaiItemQuery);
    }
    this.mokuaiEditMode.set(info.mokuaiEditMode);
    const item = this.mokuaisAll().find((v) => v.id === info.currMokuaiItem);
    if (item) {
      this.enterMokuai(item, true);
    }
  }
  private _infoKey = "mokuaikuInfo";
  private _saveInfoLock = signal(false);
  saveInfo() {
    if (!this._saveInfoLock()) {
      return;
    }
    session.save(this._infoKey, this.getInfo());
  }
  saveInfoEff = effect(() => {
    this.saveInfo();
  });
  loadInfo() {
    const info = session.load(this._infoKey);
    if (info) {
      this.setInfo(info);
    }
  }

  selectedMokuaiIdsInEff = effect(() => {
    this.selectedMokuaiIds.set(this.selectedMokuaiIdsIn());
  });
  selectedMokuaiIds = signal<number[]>([]);
  selectedMokuais = computed(() => {
    if (this.selectable()) {
      const mokuais = this.mokuaisAll();
      const ids = this.selectedMokuaiIds();
      const selectedMokuais: MokuaiItem[] = [];
      for (const id of ids) {
        const mokuai = mokuais.find((v) => v.id === id);
        if (mokuai) {
          selectedMokuais.push(mokuai);
        }
      }
      return selectedMokuais;
    } else {
      const mokuais = this.mokuais();
      const indexs = this.mokuaisSelectedIndexs();
      return indexs.map((i) => mokuais[i]);
    }
  });
  close(submit = false) {
    if (!this.selectable()) {
      return;
    }
    const selectedMokuais = submit ? this.selectedMokuais() : null;
    this.closeOut.emit({selectedMokuais});
  }
  clickMokuai(mokuai: MokuaiItem) {
    if (this.selectable()) {
      this.selectMokuai(mokuai);
    } else {
      this.enterMokuai(mokuai, true);
    }
  }
  selectMokuai(mokuai: MokuaiItem) {
    if (this.selectedMokuaiIds().includes(mokuai.id)) {
      this.unselectMokuai(mokuai);
    } else {
      this.selectedMokuaiIds.update((v) => [...v, mokuai.id]);
    }
  }
  unselectMokuai(mokuai: MokuaiItem) {
    this.selectedMokuaiIds.update((v) => v.filter((v2) => v2 !== mokuai.id));
  }
  async locateMokuai(mokuai: MokuaiItem) {
    const dataList = this.dataList();
    if (!dataList) {
      return;
    }
    const nodes = dataList.navNodes();
    const node = findDataListNavNode(nodes, (v) => v.name === mokuai.type);
    if (node) {
      dataList.clickNavNode(node);
    }
    await timeout(0);
    dataList.scrollToItemWithId(String(mokuai.id));
    this.mokuaiActiveItem.set(mokuai);
  }

  showXhmrmsbjsUsingMokuai(mokuai: MokuaiItem) {
    this.bjmkStatus.showXhmrmsbjsUsingMokuai(mokuai.id);
  }
}
