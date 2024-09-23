import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, input, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, RowSelectionChange} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {OptionsService} from "@services/options.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {XhmrmsbjSbjbItem, XhmrmsbjSbjbItemSbjb} from "./xhmrmsbj-sbjb.types";
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
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private options = inject(OptionsService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghaoName = input.required<string>();

  items = signal<XhmrmsbjSbjbItem[]>([]);
  activeItemIndex = signal<number>(0);
  activeItem = computed(() => {
    const item = this.items().at(this.activeItemIndex());
    return item ? {...item} : null;
  });
  cadYaoiu = signal<Cad数据要求 | undefined>(undefined);
  cads = computed(() => {
    const cads: CadData[] = [];
    const item = this.activeItem();
    if (item) {
      for (const i of this.activeSbjbItemIndexs()) {
        const item2 = item.锁边铰边数据[i];
        for (const info of item2.CAD数据 || []) {
          const cad = new CadData(info.cad?.json);
          cad.name = info.name;
          cads.push(cad);
        }
      }
    }
    return cads;
  });
  fetchDataEff = effect(() => this.fetchData(), {allowSignalWrites: true});
  async fetchData() {
    const items = await this.http.getData<XhmrmsbjSbjbItem[]>("shuju/api/getsuobianjiaobianData", {xinghao: this.xinghaoName()});
    this.items.set(items || []);
    await this.status.fetchCad数据要求List();
    this.cadYaoiu.set(this.status.getCad数据要求(""));
  }
  clickItem(i: number) {
    this.activeItemIndex.set(i);
  }

  activeSbjbItemIndexs = signal<number[]>([]);
  sbjbItemTableInfo = computed(() => {
    const item = this.activeItem();
    if (!item) {
      return null;
    }
    return getXhmrmsbjSbjbItemTableInfo(item.锁边铰边数据, item.产品分类);
  });
  async onSbjbItemTableRow(event: RowButtonEvent<XhmrmsbjSbjbItemSbjb>) {
    const {item, rowIdx} = event;
    const fenlei = this.activeItem()?.产品分类 || "";
    switch (event.button.event) {
      case "edit":
        {
          const item2 = await getXhmrmsbjSbjbItemSbjbForm(this.message, this.options, fenlei, item);
          if (item2) {
            Object.assign(item, item2);
            this.items.update((v) => [...v]);
          }
        }
        break;
      case "delete":
        if (await this.message.confirm("确定删除吗？")) {
          const item2 = this.activeItem();
          if (item2) {
            item2.锁边铰边数据.splice(rowIdx, 1);
            this.items.update((v) => [...v]);
          }
        }
        break;
      case "copy":
        {
          const item2 = this.activeItem();
          if (item2) {
            item2.锁边铰边数据.push(cloneDeep(item));
            this.items.update((v) => [...v]);
          }
        }
        break;
    }
  }
  onSbjbItemTableRowSelect(event: RowSelectionChange) {
    this.activeSbjbItemIndexs.set(event.indexs);
  }
  async addSbjbItemSbjb() {
    const fenlei = this.activeItem()?.产品分类 || "";
    const item = await getXhmrmsbjSbjbItemSbjbForm(this.message, this.options, fenlei);
    if (item) {
      const item2 = this.activeItem();
      if (item2) {
        item2.锁边铰边数据.push(item);
        this.items.update((v) => [...v]);
      }
    }
  }

  async save() {
    const items0 = this.items();
    const items = items0.map((item) => ({...item, 锁边铰边数据: item.锁边铰边数据.map((v) => ({...v, CAD数据: undefined}))}));
    await this.http.getData("shuju/api/saveSuobianjiaobianData", {xinghao: this.xinghaoName(), data: items});
  }
}
