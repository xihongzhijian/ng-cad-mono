import {NgTemplateOutlet} from "@angular/common";
import {ChangeDetectionStrategy, Component, effect, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule} from "@angular/material/tree";
import {filePathUrl, getCopyName, session, setGlobal} from "@app/app.common";
import {DataListComponent} from "@app/modules/data-list/components/data-list/data-list.component";
import {DataListNavNode} from "@app/modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@app/modules/data-list/data-list.module";
import {TypedTemplateDirective} from "@app/modules/directives/typed-template.directive";
import {FloatingDialogModule} from "@app/modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {BancaiListData} from "@app/modules/http/services/cad-data.service.types";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {environment} from "@env";
import {cloneDeep} from "lodash";
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
  private message = inject(MessageService);

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
  imgPrefix = signal(filePathUrl);
  dataList = viewChild(DataListComponent);

  mokuaiEditMode = signal(false);
  toggleMokuaiEditMode() {
    this.mokuaiEditMode.update((v) => !v);
  }

  currMokuaiItem = signal<MokuaiItem | null>(null);
  closeMokuaiItem() {
    this.currMokuaiItem.set(null);
  }
  submitMokuaiItem() {}
  async getMukuaiItem(item?: MokuaiItem, itemOverride?: Partial<MokuaiItem>) {
    const type = this.mokuaiActiveNavNode()?.name;
    const data: Partial<MokuaiItem> = item ? cloneDeep(item) : {name: "", type, order: 0};
    if (itemOverride) {
      Object.assign(data, itemOverride);
    }
    const allNames = new Set(this.mokuaisAll().map((v) => v.name));
    if (item) {
      allNames.delete(item.name);
    }
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "name"},
        validators: [Validators.required, (control) => (allNames.has(control.value) ? {名字不能重复: true} : null)]
      },
      {type: "string", label: "分类", model: {data, key: "type"}, validators: Validators.required},
      {type: "number", label: "排序", model: {data, key: "order"}},
      {
        type: "image",
        label: "效果图",
        value: data.xiaoguotu,
        prefix: this.imgPrefix(),
        onChange: async (val, info) => {
          if (val) {
            const uploadResult = await this.http.uploadImage(val);
            if (uploadResult) {
              data.xiaoguotu = uploadResult.url;
            } else {
              data.xiaoguotu = "";
            }
          } else {
            data.xiaoguotu = "";
          }
          info.value = data.xiaoguotu;
        }
      }
    ];
    const result = await this.message.form(form);
    if (result) {
      return data;
    }
    return null;
  }
  async addMukuaiItem(item?: Partial<MokuaiItem>) {
    let item2: Partial<MokuaiItem> | undefined | null = item;
    if (!item2) {
      item2 = await this.getMukuaiItem();
    }
    if (item2) {
      delete item2.id;
      const item3 = await this.http.getData<MokuaiItem>("ngcad/addPeijianmokuai", {item: item2});
      if (item3) {
        await this.bjmkStatus.fetchMokuais(true);
        if (item2.type) {
          this.dataList()?.updateActiveNavNode(item2.type);
        }
        const item4 = this.mokuaisAll().find((v) => v.id === item3.id);
        if (item4) {
          this.enterMokuaiItem(item4);
        }
      }
    }
  }
  async editMokuaiItem(item: MokuaiItem) {
    const item2 = await this.getMukuaiItem(item);
    if (item2) {
      const item3 = await this.http.getData<MokuaiItem>("ngcad/editPeijianmokuai", {item: item2});
      if (item3) {
        await this.bjmkStatus.fetchMokuais(true);
      }
    }
  }
  async copyMokuaiItem(item: MokuaiItem) {
    const names = this.mokuaisAll().map((v) => v.name);
    const item2 = await this.getMukuaiItem(item, {name: getCopyName(names, item.name)});
    if (item2) {
      await this.addMukuaiItem(item2);
    }
  }
  async removeMokuaiItem(item: MokuaiItem) {
    if (!(await this.message.confirm(`是否确定删除【${item.name}】?`))) {
      return;
    }
    const result = await this.http.getData<boolean>("ngcad/removePeijianmokuai", {item});
    if (result) {
      await this.bjmkStatus.fetchMokuais(true);
    }
  }
  clickMokuaiItem(item: MokuaiItem) {
    this.mokuaiActiveItem.set(item);
  }
  async enterMokuaiItem(item: MokuaiItem) {
    if (!this.bancaiListData()) {
      await this.getBancaiListData();
    }
    this.currMokuaiItem.set(cloneDeep(item));
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
      currMokuaiItem: this.currMokuaiItem()?.id
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
      this.enterMokuaiItem(item);
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
