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
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule} from "@angular/material/tree";
import {ActivatedRoute} from "@angular/router";
import {session, setGlobal} from "@app/app.common";
import {environment} from "@env";
import {timeout} from "@lucilor/utils";
import {DataListComponent} from "@modules/data-list/components/data-list/data-list.component";
import {DataListNavNameChangeEvent} from "@modules/data-list/components/data-list/data-list.types";
import {DataListNavNode} from "@modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@modules/data-list/data-list.module";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
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
  private route = inject(ActivatedRoute);

  @HostBinding("class") class = ["ng-page"];

  selectable = input(false, {transform: booleanAttribute});
  selectedMokuaiIdsIn = input<number[]>([], {alias: "selectedMokuaiIds"});
  closeOut = output<MokuaikuCloseEvent>({alias: "close"});

  production = environment.production;

  constructor() {
    setGlobal("mkk", this);
  }

  async ngOnInit() {
    await this.bjmkStatus.mokuaisManager.fetch();
    this._saveInfoLock.set(true);
    if (!this.production) {
      this.loadInfo();
    }
    this.route.queryParams.subscribe((params) => {
      const {mokuaiId} = params;
      if (mokuaiId) {
        const mokuai = this.bjmkStatus.mokuaisManager.items().find((v) => v.id === +mokuaiId);
        if (mokuai) {
          this.dataList()?.updateActiveNavNode(mokuai.type);
          this.enterMokuai(mokuai);
        }
      }
    });
  }

  navDataName = "模块库分类";
  mokuaiActiveNavNode = signal<DataListNavNode | null>(null);
  mokuaiActiveItem = signal<MokuaiItem | null>(null);
  mokuaisAll = this.bjmkStatus.mokuaisManager.items;
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

  currMokuai = this.bjmkStatus.currMokuai;
  async enterMokuai(item: MokuaiItem) {
    if (!this.bancaiListData()) {
      await this.getBancaiListData();
    }
    this.currMokuai.set(await this.bjmkStatus.fetchMokuai(item.id));
  }
  closeMokuai() {
    const currMokuai = this.currMokuai();
    const type = this.mokuaiActiveNavNode()?.name;
    if (type && currMokuai && type !== currMokuai.type) {
      this.dataList()?.updateActiveNavNode(currMokuai.type);
    }
    this.currMokuai.set(null);
  }

  async addMukuai(mokuai?: Partial<MokuaiItem>) {
    const mokuai2 = await this.bjmkStatus.addMukuai(mokuai, {type: this.mokuaiActiveNavNode()?.name});
    if (mokuai2) {
      if (mokuai2.type) {
        this.dataList()?.updateActiveNavNode(mokuai2.type);
      }
      this.enterMokuai(mokuai2);
    }
  }
  async editMokuai(mokuai: MokuaiItem) {
    const dataList = this.dataList();
    const i = dataList?.getItemIndex((v) => v.id === mokuai.id) ?? -1;
    await this.bjmkStatus.editMokuai(mokuai);
    await timeout(0);
    const j = dataList?.getItemIndex((v) => v.id === mokuai.id) ?? -1;
    if (i >= 0 && j >= 0 && i !== j) {
      this.dataList()?.scrollToItem(`[data-id="${mokuai.id}"]`);
    }
  }
  async copyMokuai(item: MokuaiItem) {
    await this.bjmkStatus.copyMokuai(item);
  }
  async removeMokuai(item: MokuaiItem) {
    await this.bjmkStatus.removeMokuai(item);
  }
  refreshMokuais() {
    this.bjmkStatus.mokuaisManager.fetch(true);
  }
  clickMokuaiItem(item: MokuaiItem) {
    this.mokuaiActiveItem.set(item);
  }

  bancaiListData = signal<BancaiListData | null>(null);
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
      currMokuaiItem: this.currMokuai()?.id
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
      this.enterMokuai(item);
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
    const ids = this.selectedMokuaiIds();
    const mokuais = this.bjmkStatus.mokuaisManager.items();
    const selectedMokuais: MokuaiItem[] = [];
    for (const id of ids) {
      const mokuai = mokuais.find((v) => v.id === id);
      if (mokuai) {
        selectedMokuais.push(mokuai);
      }
    }
    return selectedMokuais;
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
      this.enterMokuai(mokuai);
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

  showXhmrmsbjsUsingMokuai(mokuai: MokuaiItem) {
    this.bjmkStatus.showXhmrmsbjsUsingMokuai(mokuai.id);
  }
}
