import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  signal,
  viewChild
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {getSortedItems} from "@app/utils/sort-items";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, RowSelectionChange} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {OptionsService} from "@services/options.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  XhmrmsbjSbjbItem,
  xhmrmsbjSbjbItemCadKeys,
  XhmrmsbjSbjbItemOptionalKey,
  xhmrmsbjSbjbItemOptionalKeys,
  XhmrmsbjSbjbItemSbjbCadInfo,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";
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
      data: {collection: "peijianCad", selectMode: "single", yaoqiu, checkedItems: [cad.id], addCadFn: () => this.addSbjbItemSbjbCad(name)}
    });
    const cad2 = result?.[0];
    if (cad2) {
      const name2 = name as XhmrmsbjSbjbItemOptionalKey;
      if (xhmrmsbjSbjbItemOptionalKeys.includes(name2)) {
        item[name2] = cad2.name;
      } else if (name === "锁边" || name === "铰边") {
        item[name].名字 = cad2.name;
      }
      item.CAD数据[customInfo.index].cad = getHoutaiCad(cad2);
      this.refreshItems();
    }
  }
  async addSbjbItemSbjbCad(name: string) {
    const table = name;
    const items = await this.http.queryMySql({table, fields: ["mingzi"]});
    const itemNames = items.map((v) => v.mingzi);
    const data = {mingzi: ""};
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "mingzi"},
        validators: [
          Validators.required,
          (control) => {
            const val = control.value;
            if (itemNames.includes(val)) {
              return {名字不能重复: true};
            }
            return null;
          }
        ]
      }
    ];
    const result = await this.message.form(form);
    if (!result) {
      return null;
    }
    const resData = await this.http.getData<{cad: HoutaiCad}>("shuju/api/addSuobianjiaobianData", {table, data, type: name});
    if (!resData) {
      return null;
    }
    return new CadData(resData.cad.json);
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
  activeSbjbItem = computed(() => {
    const tableItem = this.sbjbItemTableInfo()?.data[this.activeSbjbItemIndex()];
    if (tableItem) {
      return this.activeItem()?.锁边铰边数据?.[tableItem.originalIndex] || null;
    }
    return null;
  });
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
    const {item} = event;
    const rowIdx = item.originalIndex;
    switch (event.button.event) {
      case "edit":
        {
          const item3 = await getXhmrmsbjSbjbItemSbjbForm(this.message, this.options, item);
          if (item3) {
            item2.锁边铰边数据[rowIdx] = item3;
            if (item3.默认值) {
              for (const [i, item4] of item2.锁边铰边数据.entries()) {
                if (i === rowIdx) {
                  continue;
                }
                delete item4.默认值;
              }
            }
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
        if (item.默认值) {
          for (const item3 of item2.锁边铰边数据) {
            delete item3.默认值;
          }
        }
        item.CAD数据 = [];
        for (const name of xhmrmsbjSbjbItemCadKeys[item2.产品分类] || []) {
          item.CAD数据.push({name, cad: getHoutaiCad(new CadData({name}))});
        }
        item2.锁边铰边数据.unshift(item);
        this.refreshItems();
      }
    }
  }

  sbjbItemTableContainer = viewChild<ElementRef<HTMLElement>>("sbjbItemTableContainer");
  async validate() {
    const items = this.items();
    const errItems: {i: number; j: number; errKeys: string[]}[] = [];
    for (const [i, item] of items.entries()) {
      const items2 = getSortedItems(item.锁边铰边数据, (v) => v.排序 ?? 0);
      for (const [j, item2] of items2.entries()) {
        const errKeys: string[] = [];
        for (const key of xhmrmsbjSbjbItemCadKeys[item.产品分类] || []) {
          if (key === "锁边" || key === "铰边") {
            if (!item2[key].名字) {
              errKeys.push(key);
            }
          } else if (!item2[key]) {
            errKeys.push(key);
          }
        }
        if (errKeys.length > 0) {
          errItems.push({i, j, errKeys});
        }
      }
    }
    if (errItems.length > 0) {
      await this.message.error({
        content: "数据有误",
        details: errItems.map(({i, errKeys}) => {
          const item = items[i];
          const str = errKeys.map((v) => `【${v}】`).join("");
          return `${item.产品分类}: 缺少选项${str}`;
        })
      });
      const errItem = errItems[0];
      this.activeItemIndex.set(errItem.i);
      setTimeout(() => {
        this.activeSbjbItemIndex.set(errItem.j);
        const sbjbItemTableContainer = this.sbjbItemTableContainer()?.nativeElement;
        if (sbjbItemTableContainer) {
          const row = sbjbItemTableContainer.querySelectorAll("app-table mat-table mat-row")[errItem.j];
          console.log(row);
          if (row) {
            row.scrollIntoView({block: "center"});
          }
        }
      }, 0);
      return false;
    }
    return true;
  }
  async save() {
    const isValid = await this.validate();
    if (!isValid) {
      return false;
    }
    const items0 = this.items();
    const items = items0.map((item) => ({...item, 锁边铰边数据: item.锁边铰边数据.map((v) => ({...v, CAD数据: undefined}))}));
    await this.http.getData("shuju/api/saveSuobianjiaobianData", {xinghao: this.xinghaoName(), data: items});
    return true;
  }
}
