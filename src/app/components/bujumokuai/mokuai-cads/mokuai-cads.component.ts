import {ChangeDetectionStrategy, Component, computed, HostBinding, inject, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {setGlobal} from "@app/app.common";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {openCadEditorDialog} from "@app/components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadItemComponent} from "@app/components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemIsOnlineInfo} from "@app/components/lurushuju/cad-item/cad-item.types";
import {getCadInfoInputs2} from "@app/modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {DataListNavNode} from "@app/modules/data-list/components/data-list/data-list.utils";
import {DataListModule} from "@app/modules/data-list/data-list.module";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {getHoutaiCad} from "@app/modules/http/services/cad-data.service.utils";
import {MessageService} from "@app/modules/message/services/message.service";
import {AppStatusService} from "@app/services/app-status.service";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {MokuaiCadItemInfo} from "./mokuai-cads.types";

@Component({
  selector: "app-mokuai-cads",
  standalone: true,
  imports: [CadItemComponent, DataListModule, MatButtonModule],
  templateUrl: "./mokuai-cads.component.html",
  styleUrl: "./mokuai-cads.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MokuaiCadsComponent implements OnInit {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  navDataName = signal("配件库分类");
  cadsAll = signal<CadData[]>([]);
  cads = signal<CadData[]>([]);
  activeNavNode = signal<DataListNavNode | null>(null);
  collection: CadCollection = "peijianku";
  cadYaoqiu = signal<Cad数据要求 | undefined>(undefined);
  cadsIsOnline: ObjectOf<CadItemIsOnlineInfo<MokuaiCadItemInfo>> = {};
  cadItemButtons = computed(() => {
    const buttons: CadItemButton<MokuaiCadItemInfo>[] = [
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.removeCad.bind(this)}
    ];
    return buttons;
  });

  constructor() {
    setGlobal("mkcads", this);
  }

  async ngOnInit() {
    await this.getCadYaoqiu();
    await this.getCadsAll();
  }

  async getCadYaoqiu() {
    await this.status.fetchCad数据要求List();
    const yaoqiu = this.status.getCad数据要求("配件库");
    this.cadYaoqiu.set(yaoqiu);
  }
  async getCadsAll() {
    const yaoqiu = this.cadYaoqiu();
    const fields = new Set<string>(["json.id", "json.name", "json.type"]);
    if (yaoqiu) {
      for (const item of yaoqiu.CAD弹窗修改属性) {
        if (item.cadKey) {
          fields.add(`json.${item.cadKey}`);
        }
      }
    }
    const cads = (await this.http.getCad({collection: this.collection, fields: Array.from(fields)})).cads;
    this.cadsAll.set(cads);
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
  }

  cadsEditMode = signal(false);
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
        await this.getCadsAll();
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
    await this.getCadsAll();
  }
  async removeCad(component: CadItemComponent<MokuaiCadItemInfo>) {
    const {index} = component.customInfo;
    const cad = this.cads()[index];
    if (!(await this.message.confirm(`是否确定删除【${cad.name}】？`))) {
      return;
    }
    const result = await this.http.mongodbDelete(this.collection, {id: cad.id});
    if (result) {
      await this.getCadsAll();
    }
  }
  afterEditCad() {
    this.cads.update((v) => [...v]);
  }
}
