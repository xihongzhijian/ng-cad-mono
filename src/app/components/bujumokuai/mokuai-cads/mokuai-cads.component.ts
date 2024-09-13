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
  OnInit,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getNameWithSuffix, setGlobal} from "@app/app.common";
import {setCadData} from "@app/cad/cad-shujuyaoqiu";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemIsOnlineInfo} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, timeout} from "@lucilor/utils";
import {getCadInfoInputs2} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {DataListComponent} from "@modules/data-list/components/data-list/data-list.component";
import {DataListNavNameChangeEvent} from "@modules/data-list/components/data-list/data-list.types";
import {DataListNavNode} from "@modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@modules/data-list/data-list.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {BjmkStatusService} from "../services/bjmk-status.service";
import {MokuaiCadItemInfo} from "./mokuai-cads.types";

@Component({
  selector: "app-mokuai-cads",
  standalone: true,
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
export class MokuaiCadsComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  selectable = input(false, {transform: booleanAttribute});
  selectedCads = model<CadData[]>([]);

  cadsAll = this.bjmkStatus.cads;
  collection = this.bjmkStatus.collection;
  cadYaoqiu = this.bjmkStatus.cadYaoqiu;

  navDataName = signal("配件库分类");
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
    for (const cad of this.cads()) {
      if (cad.type === before) {
        cad.type = after;
      }
    }
    this.bjmkStatus.refreshCads();
  }

  dataList = viewChild(DataListComponent);
  selectedCadsScrollbar = viewChild<NgScrollbar>("selectedCadsScrollbar");

  constructor() {
    setGlobal("mkcads", this);
  }

  async ngOnInit() {
    await this.bjmkStatus.fetchCads();
  }

  cadsAllEff = effect(() => {
    const cads = this.cadsAll();
    const cadsIsOnlineOld = this.cadsIsOnline;
    const cadsIsOnline: typeof this.cadsIsOnline = {};
    this.cadsIsOnline = cadsIsOnline;
    for (const cad of cads) {
      const id = cad.id;
      cadsIsOnline[id] = cadsIsOnlineOld[id] ?? {
        collection: this.collection,
        isFetched: false,
        afterFetch: () => (cadsIsOnline[id].isFetched = true)
      };
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

  async getCadItem(data?: CadData) {
    const yaoqiu = this.cadYaoqiu();
    if (!yaoqiu) {
      return null;
    }
    const {CAD弹窗修改属性: items, 选中CAD要求: items2} = yaoqiu;
    if (data) {
      data = data.clone(true);
    } else {
      data = new CadData();
    }
    const type = this.activeNavNode()?.name;
    if (type) {
      data.type = type;
    }
    const form = getCadInfoInputs2(items, items2, data, this.dialog, this.status, true, null);
    const result = await this.message.form(form);
    if (result) {
      return data;
    }
    return null;
  }
  async addCad() {
    const data = await this.getCadItem();
    if (data) {
      const id = await this.http.mongodbInsert(this.collection, getHoutaiCad(data));
      if (id) {
        await this.bjmkStatus.fetchCads(true);
      }
    }
  }
  async copyCad(component: CadItemComponent<MokuaiCadItemInfo>) {
    const {index} = component.customInfo;
    const cad = this.cads()[index];
    const collection = this.collection;
    const ids = await this.http.mongodbCopy(collection, [cad.id]);
    if (!ids?.[0]) {
      return;
    }
    if (await this.message.confirm("是否编辑新的CAD？")) {
      const {cads} = await this.http.getCad({collection, ids});
      const data = cads[0];
      if (data) {
        await openCadEditorDialog(this.dialog, {data: {data, collection, center: true}});
      }
    }
    await this.bjmkStatus.fetchCads(true);
  }
  async removeCad(component: CadItemComponent<MokuaiCadItemInfo>) {
    const {index} = component.customInfo;
    const cad = this.cads()[index];
    if (!(await this.message.confirm(`是否确定删除【${cad.name}】？`))) {
      return;
    }
    const result = await this.http.mongodbDelete(this.collection, {id: cad.id});
    if (result) {
      await this.bjmkStatus.fetchCads(true);
    }
  }
  async afterEditCad(id: string) {
    const dataList = this.dataList();
    const i = dataList?.getItemIndex((v) => v.id === id) ?? -1;
    this.cads.update((v) => [...v]);
    this.bjmkStatus.refreshCads();
    await timeout(0);
    const j = dataList?.getItemIndex((v) => v.id === id) ?? -1;
    if (i >= 0 && j >= 0 && i !== j) {
      this.dataList()?.scrollToItem(`[data-id="${id}"]`);
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
    const yaoqiu = this.bjmkStatus.cadYaoqiu();
    const yaoqiuItems = yaoqiu?.选中CAD要求 || [];
    setCadData(cad, yaoqiuItems);
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
}
