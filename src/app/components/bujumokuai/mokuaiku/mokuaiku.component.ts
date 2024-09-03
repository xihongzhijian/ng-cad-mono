import {NgTemplateOutlet} from "@angular/common";
import {ChangeDetectionStrategy, Component, effect, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule} from "@angular/material/tree";
import {session, setGlobal} from "@app/app.common";
import {environment} from "@env";
import {DataListComponent} from "@modules/data-list/components/data-list/data-list.component";
import {DataListNavNode} from "@modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@modules/data-list/data-list.module";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {NgScrollbarModule} from "ngx-scrollbar";
import {MokuaiItemComponent} from "../mokuai-item/mokuai-item.component";
import {MokuaiItem} from "../mokuai-item/mokuai-item.types";
import {BjmkStatusService} from "../services/bjmk-status.service";

@Component({
  selector: "app-mokuaiku",
  standalone: true,
  imports: [
    DataListModule,
    FloatingDialogModule,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTreeModule,
    MokuaiItemComponent,
    NgScrollbarModule,
    NgTemplateOutlet,
    TypedTemplateDirective
  ],
  templateUrl: "./mokuaiku.component.html",
  styleUrl: "./mokuaiku.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MokuaikuComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);
  private http = inject(CadDataService);

  @HostBinding("class") class = ["ng-page"];

  production = environment.production;

  constructor() {
    setGlobal("mkk", this);
  }

  async ngOnInit() {
    await this.bjmkStatus.fetchMokuais();
    this._saveInfoLock.set(true);
    if (!this.production) {
      this.loadInfo();
    }
  }

  navDataName = "模块库分类";
  mokuaiActiveNavNode = signal<DataListNavNode | null>(null);
  mokuaiActiveItem = signal<MokuaiItem | null>(null);
  mokuaisAll = this.bjmkStatus.mokuais;
  mokuais = signal<MokuaiItem[]>([]);
  imgPrefix = this.bjmkStatus.imgPrefix;
  dataList = viewChild(DataListComponent);

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
      await this.bjmkStatus.fetchMokuais(true);
      if (mokuai2.type) {
        this.dataList()?.updateActiveNavNode(mokuai2.type);
      }
      this.enterMokuai(mokuai2);
    }
  }
  async editMokuai(mokuai: MokuaiItem) {
    await this.bjmkStatus.editMokuai(mokuai);
  }
  async copyMokuai(item: MokuaiItem) {
    await this.bjmkStatus.copyMokuai(item);
  }
  async removeMokuai(item: MokuaiItem) {
    await this.bjmkStatus.removeMokuai(item);
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
  saveInfoEff = effect(() => this.saveInfo());
  loadInfo() {
    const info = session.load(this._infoKey);
    if (info) {
      this.setInfo(info);
    }
  }
}
