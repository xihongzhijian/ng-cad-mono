import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, input, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, RowSelectionChange} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {OptionsService} from "@services/options.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {XhmrmsbjSbjbItem, XhmrmsbjSbjbItemSbjbCadInfo, XhmrmsbjSbjbItemSbjbSorted} from "./xhmrmsbj-sbjb.types";
import {getXhmrmsbjSbjbItemSbjbForm, getXhmrmsbjSbjbItemTableInfo} from "./xhmrmsbj-sbjb.utils";

@Component({
  selector: "app-xhmrmsbj-sbjb",
  standalone: true,
  imports: [CadItemComponent, MatButtonModule, MatDividerModule, NgScrollbarModule, TableComponent],
  templateUrl: "./xhmrmsbj-sbjb.component.html",
  styleUrl: "./xhmrmsbj-sbjb.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XhmrmsbjSbjbComponent {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private options = inject(OptionsService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghaoName = input.required<string>();

  items = signal<XhmrmsbjSbjbItem[]>([]);
  refreshItems() {
    this.items.update((v) => v.map((v2) => ({...v2, 锁边铰边数据: v2.锁边铰边数据.map((v3) => ({...v3}))})));
  }
  activeItemIndex = signal<number>(0);
  activeItem = computed(() => this.items().at(this.activeItemIndex()));

  cadYaoqius = computed(() => {
    const yaoqius: ObjectOf<Cad数据要求 | undefined> = {};
    const item = this.activeSbjbItem();
    for (const info of item?.CAD数据 || []) {
      yaoqius[info.name] = this.status.getCad数据要求(info.name);
    }
    return yaoqius;
  });
  cads = computed(() => {
    const cads: CadData[] = [];
    const item = this.activeSbjbItem();
    if (item) {
      for (const info of item.CAD数据 || []) {
        const cad = new CadData(info.cad?.json);
        cad.type = info.fenlei || info.name;
        cads.push(cad);
      }
    }
    return cads;
  });
  cadButtons2 = computed(() => {
    const buttons: CadItemButton<XhmrmsbjSbjbItemSbjbCadInfo>[] = [{name: "选择", onClick: this.selectSbjbItemSbjbCad.bind(this)}];
    return buttons;
  });
  async selectSbjbItemSbjbCad({customInfo}: CadItemComponent<XhmrmsbjSbjbItemSbjbCadInfo>) {
    const item = this.activeSbjbItem();
    if (!item) {
      return;
    }
    if (!Array.isArray(item.CAD数据)) {
      item.CAD数据 = [];
    }
    const cad = this.cads()[customInfo.index];
    const name = cad.type;
    const yaoqiu = this.cadYaoqius()[name];
    const result = await openCadListDialog(this.dialog, {
      data: {collection: "peijianCad", selectMode: "single", yaoqiu, checkedItems: [cad.id]}
    });
    const cad2 = result?.[0];
    if (cad2) {
      if (name === "锁框" || name === "铰框" || name === "顶框") {
        item[name] = cad2.name;
      } else if (name === "锁边" || name === "铰边") {
        item[name].名字 = cad2.name;
      }
      item.CAD数据[customInfo.index].cad = getHoutaiCad(cad2);
      this.refreshItems();
    }
  }

  fetchDataEff = effect(() => this.fetchData(), {allowSignalWrites: true});
  async fetchData() {
    const items = await this.http.getData<XhmrmsbjSbjbItem[]>("shuju/api/getsuobianjiaobianData", {xinghao: this.xinghaoName()});
    this.items.set(items || []);
    await this.status.fetchCad数据要求List();
  }
  clickItem(i: number) {
    this.activeItemIndex.set(i);
  }

  activeSbjbItemIndex = signal<number>(0);
  activeSbjbItemIndexEff = effect(
    () => {
      this.activeItemIndex();
      this.activeSbjbItemIndex.set(0);
    },
    {allowSignalWrites: true}
  );
  activeSbjbItem = computed(() => this.activeItem()?.锁边铰边数据[this.activeSbjbItemIndex()]);
  sbjbItemTableInfo = computed(() => {
    const item = this.activeItem();
    if (!item) {
      return null;
    }
    return getXhmrmsbjSbjbItemTableInfo(item.锁边铰边数据, item.产品分类, this.activeSbjbItemIndex());
  });
  async onSbjbItemTableRow(event: RowButtonEvent<XhmrmsbjSbjbItemSbjbSorted>) {
    const item2 = this.activeItem();
    if (!item2) {
      return;
    }
    const {item, rowIdx} = event;
    switch (event.button.event) {
      case "edit":
        {
          const item3 = await getXhmrmsbjSbjbItemSbjbForm(this.message, this.options, item);
          if (item3) {
            item2.锁边铰边数据[rowIdx] = item3;
            this.refreshItems();
          }
        }
        break;
      case "delete":
        if (await this.message.confirm("确定删除吗？")) {
          item2.锁边铰边数据.splice(rowIdx, 1);
          this.refreshItems();
        }
        break;
      case "copy":
        {
          item2.锁边铰边数据.push(cloneDeep(item));
          this.refreshItems();
        }
        break;
    }
  }
  onSbjbItemTableRowSelect(event: RowSelectionChange) {
    this.activeSbjbItemIndex.set(event.indexs[0] ?? -1);
  }
  async addSbjbItemSbjb() {
    const item = await getXhmrmsbjSbjbItemSbjbForm(this.message, this.options);
    if (item) {
      const item2 = this.activeItem();
      if (item2) {
        item2.锁边铰边数据.push(item);
        this.refreshItems();
      }
    }
  }

  async save() {
    const items0 = this.items();
    const items = items0.map((item) => ({...item, 锁边铰边数据: item.锁边铰边数据.map((v) => ({...v, CAD数据: undefined}))}));
    await this.http.getData("shuju/api/saveSuobianjiaobianData", {xinghao: this.xinghaoName(), data: items});
  }
}
