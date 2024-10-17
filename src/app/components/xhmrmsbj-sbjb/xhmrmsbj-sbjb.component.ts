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
import {OptionsAll2} from "@components/lurushuju/services/lrsj-status.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellEvent, RowButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {DateTime} from "luxon";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  XhmrmsbjSbjbItem,
  XhmrmsbjSbjbItemCopyMode,
  xhmrmsbjSbjbItemCopyModes,
  XhmrmsbjSbjbItemSbjbCad,
  XhmrmsbjSbjbItemSbjbCadInfo,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";
import {
  convertXhmrmsbjSbjbItem,
  getXhmrmsbjSbjbItemCadKeys,
  getXhmrmsbjSbjbItemOptions,
  getXhmrmsbjSbjbItemSbjbCad,
  getXhmrmsbjSbjbItemSbjbForm,
  getXhmrmsbjSbjbItemSbjbItem,
  getXhmrmsbjSbjbItemTableInfo,
  isXhmrmsbjSbjbItemOptionalKeys1,
  isXhmrmsbjSbjbItemOptionalKeys2
} from "./xhmrmsbj-sbjb.utils";

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
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghaoName = input.required<string>();

  items = signal<XhmrmsbjSbjbItem[]>([]);
  refreshItems() {
    this.items.update((v) => v.map((v2) => ({...v2, 锁边铰边数据: v2.锁边铰边数据.map((v3) => ({...v3}))})));
  }
  activeItemIndex = signal<number>(0);
  activeItem = computed(() => this.items().at(this.activeItemIndex()));

  cadWidth = 300;
  cadHeight = 150;
  cadYaoqius = computed(() => {
    const yaoqius: ObjectOf<Cad数据要求 | undefined> = {};
    const item = this.activeItem();
    if (item) {
      for (const key of getXhmrmsbjSbjbItemCadKeys(item.产品分类)) {
        yaoqius[key] = this.status.getCadYaoqiu(key);
      }
    }
    return yaoqius;
  });
  cadMap = new Map<string, CadData>();
  cadInfos = computed(() => {
    const infos: (Omit<XhmrmsbjSbjbItemSbjbCad, "cad"> & {cad?: CadData})[] = [];
    const item = this.activeSbjbItem();
    if (item) {
      for (const item2 of item.CAD数据 || []) {
        const info: (typeof infos)[0] = {...item2};
        if (item2.cadId) {
          const cad = this.cadMap.get(item2.cadId);
          if (cad) {
            info.cad = cad;
          }
        }
        infos.push(info);
      }
    }
    return infos;
  });
  cadButtons2 = computed(() => {
    const buttons: CadItemButton<XhmrmsbjSbjbItemSbjbCadInfo>[] = [
      {name: "选择", onClick: ({customInfo}) => this.selectSbjbItemSbjbCad(customInfo.index)},
      {name: "删除", onClick: ({customInfo}) => this.deselectSbjbItemSbjbCad(customInfo.index)}
    ];
    return buttons;
  });
  async selectSbjbItemSbjbCad(index: number) {
    const item = this.activeSbjbItem();
    if (!item) {
      return;
    }
    if (!Array.isArray(item.CAD数据)) {
      item.CAD数据 = [];
    }
    const cadInfo = this.cadInfos()[index];
    const {cad, name, title} = cadInfo;
    const yaoqiu = this.cadYaoqius()[name];
    const cadNamesMap = new Map<string, {nameBefore: string; data: HoutaiCad}>();
    const result = await openCadListDialog(this.dialog, {
      data: {
        collection: "peijianCad",
        selectMode: "single",
        yaoqiu,
        options: {开启: item.开启},
        checkedItems: cad ? [cad.id] : [],
        beforeEditCad: (data) => {
          if (!cadNamesMap.has(data._id)) {
            cadNamesMap.set(data._id, {nameBefore: data.名字, data});
          }
        },
        title,
        toolbarBtns: [
          {
            name: "后台编辑",
            onClick: async (component) => {
              const url = await this.http.getShortUrl(name, {search: {shujufenlei: name}});
              if (url) {
                open(url);
                if (await this.message.newTabConfirm()) {
                  component.search();
                }
              }
            }
          }
        ]
      }
    });
    const cad2 = result?.[0];
    let needsRefresh = false;
    cadNamesMap.forEach(({nameBefore, data}) => {
      if (nameBefore === data.名字) {
        return;
      }
      const type = data.分类;
      const isKeys1 = isXhmrmsbjSbjbItemOptionalKeys1(type);
      const isKeys2 = isXhmrmsbjSbjbItemOptionalKeys2(type);
      if (!isKeys1 && !isKeys2) {
        return;
      }
      for (const item of this.items()) {
        for (const item2 of item.锁边铰边数据) {
          if (isKeys1 && item2[type] === nameBefore) {
            item2[type] = data.名字;
            needsRefresh = true;
            if (Array.isArray(item2.CAD数据)) {
              for (let i = 0; i < item2.CAD数据.length; i++) {
                if (item2.CAD数据[i].name === type) {
                  item2.CAD数据[i].cadId = data._id;
                }
              }
            }
          }
        }
      }
    });
    if (cad2) {
      if (isXhmrmsbjSbjbItemOptionalKeys1(title)) {
        item[title] = cad2.name;
      } else if (isXhmrmsbjSbjbItemOptionalKeys2(title)) {
        if (!item[title]) {
          item[title] = getXhmrmsbjSbjbItemSbjbItem();
        }
        item[title].名字 = cad2.name;
      }
      item.CAD数据[index].cadId = cad2.id;
      this.cadMap.set(cad2.id, cad2);
      this.purgeCadMap();
      needsRefresh = true;
    }
    if (needsRefresh) {
      this.refreshItems();
    }
  }
  async deselectSbjbItemSbjbCad(index: number) {
    const item = this.activeSbjbItem();
    if (!item) {
      return;
    }
    if (!Array.isArray(item.CAD数据)) {
      item.CAD数据 = [];
    }
    const cadInfo = this.cadInfos()[index];
    const {title} = cadInfo;
    if (isXhmrmsbjSbjbItemOptionalKeys1(title)) {
      item[title] = "";
    } else if (isXhmrmsbjSbjbItemOptionalKeys2(title)) {
      if (!item[title]) {
        item[title] = getXhmrmsbjSbjbItemSbjbItem();
      }
      item[title].名字 = "";
    }
    delete item.CAD数据[index].cadId;
    this.purgeCadMap();
    this.refreshItems();
  }
  purgeCadMap() {
    const ids = new Set<string>();
    for (const item of this.items()) {
      for (const item2 of item.锁边铰边数据) {
        for (const cadItem of item2.CAD数据 || []) {
          if (cadItem.cadId) {
            ids.add(cadItem.cadId);
          }
        }
      }
    }
    for (const id of this.cadMap.keys()) {
      if (!ids.has(id)) {
        this.cadMap.delete(id);
      }
    }
  }

  options = signal<OptionsAll2>({});

  fetchDataEff = effect(() => this.fetchData(), {allowSignalWrites: true});
  async fetchData() {
    const data = await this.http.getData<{锁边铰边: XhmrmsbjSbjbItem[]; CAD数据map: ObjectOf<HoutaiCad>; 选项: OptionsAll2}>(
      "shuju/api/getsuobianjiaobianData",
      {xinghao: this.xinghaoName()}
    );
    if (data) {
      this.items.set(data.锁边铰边);
      for (const key in data.CAD数据map) {
        this.cadMap.set(key, new CadData(data.CAD数据map[key].json));
      }
      this.options.set(data.选项);
    }
    await this.status.cadYaoqiusManager.fetch();
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

  sbjbItemTable = viewChild<TableComponent<XhmrmsbjSbjbItemSbjbSorted>>("sbjbItemTable");
  sbjbItemTableInfo = computed(() => {
    const item = this.activeItem();
    if (!item) {
      return null;
    }
    return getXhmrmsbjSbjbItemTableInfo(item.锁边铰边数据, item.产品分类, this.activeSbjbItemIndex);
  });
  async onSbjbItemTableRow({item, button}: RowButtonEvent<XhmrmsbjSbjbItemSbjbSorted>) {
    const item2 = this.activeItem();
    if (!item2) {
      return;
    }
    const rowIdx = item.originalIndex;
    switch (button.event) {
      case "edit":
        {
          const options = this.options();
          const item3 = await getXhmrmsbjSbjbItemSbjbForm(this.message, options, item2.产品分类, item);
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
  onSbjbItemTableCellClick({rowIdx}: CellEvent<XhmrmsbjSbjbItemSbjbSorted>) {
    this.activeSbjbItemIndex.set(rowIdx);
  }
  async addSbjbItemSbjb() {
    const options = this.options();
    const item2 = this.activeItem();
    if (!item2) {
      return;
    }
    const item = await getXhmrmsbjSbjbItemSbjbForm(this.message, options, item2.产品分类);
    if (item) {
      if (item.默认值) {
        for (const item3 of item2.锁边铰边数据) {
          delete item3.默认值;
        }
      }
      item.CAD数据 = getXhmrmsbjSbjbItemCadKeys(item2.产品分类).map((key) => getXhmrmsbjSbjbItemSbjbCad(key));
      item2.锁边铰边数据.unshift(item);
      this.refreshItems();
    }
  }
  async removeSbjbItemSbjbs() {
    const table = this.sbjbItemTable();
    const item2 = this.activeItem();
    if (!table || !item2) {
      return;
    }
    const selected = table.rowSelection.selected;
    if (selected.length < 1) {
      await this.message.error("请先选择要删除的数据");
      return;
    }
    if (!(await this.message.confirm(`确定删除${selected.length}条数据吗？`))) {
      return;
    }
    item2.锁边铰边数据 = item2.锁边铰边数据.filter((_, i) => !selected.includes(i));
    this.refreshItems();
  }

  async copySbjbItems(to: XhmrmsbjSbjbItem) {
    const items = this.items().filter((v) => v !== to);
    const itemOptions = getXhmrmsbjSbjbItemOptions(items);
    const data: {from: XhmrmsbjSbjbItem | null; mode: XhmrmsbjSbjbItemCopyMode} = {from: null, mode: "添加到原有数据"};
    const form: InputInfo<typeof data>[] = [
      {type: "select", label: "从哪里复制", options: itemOptions, model: {data, key: "from"}, validators: Validators.required},
      {
        type: "select",
        label: "复制方式",
        options: xhmrmsbjSbjbItemCopyModes.slice(),
        model: {data, key: "mode"},
        validators: Validators.required
      }
    ];
    const result = await this.message.form(form);
    const {from, mode} = data;
    if (!result || !from) {
      return;
    }
    const fromItems = from.锁边铰边数据.map((v) => convertXhmrmsbjSbjbItem(from.产品分类, to.产品分类, v));
    if (mode === "清空原有数据并全部替换为新数据") {
      to.锁边铰边数据 = fromItems;
    } else {
      to.锁边铰边数据.push(...fromItems);
    }
    this.refreshItems();
  }

  import() {
    this.message.importData(async (items: XhmrmsbjSbjbItem[]) => {
      const itemOptions = getXhmrmsbjSbjbItemOptions(items);
      const data: {from: XhmrmsbjSbjbItem[]; mode: XhmrmsbjSbjbItemCopyMode} = {from: [], mode: "添加到原有数据"};
      const form: InputInfo<typeof data>[] = [
        {
          type: "select",
          label: "选择导入哪些产品分类",
          multiple: true,
          options: itemOptions,
          appearance: "list",
          model: {data, key: "from"},
          validators: Validators.required
        },
        {
          type: "select",
          label: "导入方式",
          options: xhmrmsbjSbjbItemCopyModes.slice(),
          model: {data, key: "mode"},
          validators: Validators.required
        }
      ];
      const result = await this.message.form(form);
      const {from, mode} = data;
      if (!result || from.length < 1) {
        return false;
      }
      for (const item of data.from) {
        const item2 = this.items().find((v) => v.产品分类 === item.产品分类);
        if (item2) {
          if (mode === "清空原有数据并全部替换为新数据") {
            item2.锁边铰边数据 = item.锁边铰边数据;
          } else {
            item2.锁边铰边数据.push(...item.锁边铰边数据);
          }
        }
      }
      this.refreshItems();
      return true;
    });
  }
  async export() {
    const items = this.items();
    const itemOptions = getXhmrmsbjSbjbItemOptions(items);
    const data = {from: Array<XhmrmsbjSbjbItem>()};
    const indexMap = new Map(items.map((v, i) => [v.产品分类, i]));
    const form: InputInfo<typeof data>[] = [
      {
        type: "select",
        label: "选择导出哪些产品分类",
        multiple: true,
        options: itemOptions,
        appearance: "list",
        model: {data, key: "from"},
        validators: Validators.required
      }
    ];
    const result = await this.message.form(form);
    if (!result) {
      return;
    }
    data.from.sort((a, b) => (indexMap.get(a.产品分类) ?? 0) - (indexMap.get(b.产品分类) ?? 0));
    const title = [this.xinghaoName(), "锁边铰边", DateTime.now().toFormat("yyyyMMdd")].join("_");
    await this.message.exportData(data.from, title);
  }

  sbjbItemTableContainer = viewChild<ElementRef<HTMLElement>>("sbjbItemTableContainer");
  async validate() {
    const items = this.items();
    const errItems: {i: number; j: number; errKeys: string[]}[] = [];
    for (const [i, item] of items.entries()) {
      const items2 = getSortedItems(item.锁边铰边数据, (v) => v.排序 ?? 0);
      for (const [j, item2] of items2.entries()) {
        const errKeys: string[] = [];
        for (const key of getXhmrmsbjSbjbItemCadKeys(item.产品分类)) {
          if (key === "锁边" || key === "铰边") {
            if (!item2[key]?.名字) {
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
        content: "锁边铰边数据有误",
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
