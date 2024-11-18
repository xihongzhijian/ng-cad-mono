import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, input, signal, viewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {getValueString} from "@app/app.common";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {getSortedItems} from "@app/utils/sort-items";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemFormExtraText} from "@components/lurushuju/cad-item/cad-item.types";
import {OptionsAll2} from "@components/lurushuju/services/lrsj-status.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ExcelSheet, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellEvent, FilterAfterEvent, RowButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {cloneDeep} from "lodash";
import {DateTime} from "luxon";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  XhmrmsbjSbjbCadInfo,
  XhmrmsbjSbjbCadInfoGrouped,
  XhmrmsbjSbjbItem,
  XhmrmsbjSbjbItemCopyMode,
  xhmrmsbjSbjbItemCopyModes,
  XhmrmsbjSbjbItemSbjbCadInfo,
  XhmrmsbjSbjbItemSbjbItem,
  XhmrmsbjSbjbItemSbjbSorted,
  XhmrmsbjSbjbResponseData
} from "./xhmrmsbj-sbjb.types";
import {
  convertXhmrmsbjSbjbItem,
  exportXhmrmsbjSbjbItemSbjbs,
  getXhmrmsbjSbjbItemCadKeys,
  getXhmrmsbjSbjbItemOptionalKeys2,
  getXhmrmsbjSbjbItemOptions,
  getXhmrmsbjSbjbItemSbjbCad,
  getXhmrmsbjSbjbItemSbjbForm,
  getXhmrmsbjSbjbItemSbjbItem,
  getXhmrmsbjSbjbItemSbjbItemForm,
  getXhmrmsbjSbjbItemTableInfo,
  importXhmrmsbjSbjbItemSbjbs,
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

  xinghao = input.required<MrbcjfzXinghaoInfo | null>();

  xinghaoName = computed(() => this.xinghao()?.raw.mingzi);
  items = signal<XhmrmsbjSbjbItem[]>([]);
  refreshItems() {
    this.items.update((v) => v.map((v2) => ({...v2, 锁边铰边数据: v2.锁边铰边数据.map((v3) => ({...v3}))})));
  }
  activeItemIndex = signal<number>(0);
  activeItem = computed(() => this.items().at(this.activeItemIndex()));

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
    const infos: XhmrmsbjSbjbCadInfo[] = [];
    const item = this.activeSbjbItem();
    if (item) {
      for (const item2 of item.CAD数据 || []) {
        const info: XhmrmsbjSbjbCadInfo = {...item2, cadForm: {noDefaultTexts: true}};
        if (item2.cadId) {
          const cad = this.cadMap.get(item2.cadId);
          if (cad) {
            info.cad = cad;
          }
        }
        const title = info.title;
        if (isXhmrmsbjSbjbItemOptionalKeys2(title)) {
          const extraTexts: CadItemFormExtraText[] = [];
          const keys: (keyof XhmrmsbjSbjbItemSbjbItem)[] = [
            "正面宽",
            "正面宽取值范围",
            "正面宽可改",
            "背面宽",
            "背面宽取值范围",
            "背面宽可改",
            "正背面同时改变",
            "使用正面分体",
            "使用背面分体"
          ];
          for (const key of keys) {
            extraTexts.push({key, value: getValueString(item[title]?.[key])});
          }
          info.cadForm.extraTexts = extraTexts;
          info.cadForm.onEdit = ({customInfo}) => this.editSbjbItemSbjbItem(customInfo.index);
        }
        infos.push(info);
      }
    }
    return infos;
  });
  cadInfoGroups = computed(() => {
    const group1: XhmrmsbjSbjbCadInfoGrouped[] = [];
    const group2: XhmrmsbjSbjbCadInfoGrouped[] = [];
    const group1Keys = ["锁框", "铰框", "顶框"];
    for (const [i, info] of this.cadInfos().entries()) {
      if (group1Keys.includes(info.name)) {
        group1.push({...info, originalIndex: i});
      } else {
        group2.push({...info, originalIndex: i});
      }
    }
    return [group1, group2];
  });
  cadButtons2 = computed(() => {
    const buttons: CadItemButton<XhmrmsbjSbjbItemSbjbCadInfo>[] = [
      {name: "选择", onClick: ({customInfo}) => this.selectSbjbItemSbjbCad(customInfo.index)},
      {name: "删除", onClick: ({customInfo}) => this.deselectSbjbItemSbjbCad(customInfo.index)}
    ];
    return buttons;
  });
  async editSbjbItemSbjbItem(index: number) {
    const item = this.activeSbjbItem();
    if (!item) {
      return;
    }
    const info = this.cadInfos().at(index);
    const name = info?.name;
    if (!name || !isXhmrmsbjSbjbItemOptionalKeys2(name)) {
      return;
    }
    const title = `${info.title}：${item[name]?.名字 || ""}`;
    const result = await getXhmrmsbjSbjbItemSbjbItemForm(this.message, title, item[name]);
    if (result) {
      item[name] = result;
      this.refreshItems();
    }
  }
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
  async fetchData(peizhi?: XhmrmsbjSbjbResponseData) {
    const xinghao = this.xinghaoName();
    if (!xinghao) {
      return;
    }
    const data = await this.http.getData<{锁边铰边: XhmrmsbjSbjbItem[]; CAD数据map: ObjectOf<HoutaiCad>; 选项: OptionsAll2}>(
      "shuju/api/getsuobianjiaobianData",
      {xinghao, peizhi}
    );
    if (data) {
      for (const item of data.锁边铰边) {
        for (const item2 of item.锁边铰边数据) {
          for (const key of getXhmrmsbjSbjbItemOptionalKeys2(item.产品分类)) {
            item2[key] = getXhmrmsbjSbjbItemSbjbItem(item2[key]);
          }
        }
      }
      this.items.set(data.锁边铰边);
      this.cadMap.clear();
      for (const key in data.CAD数据map) {
        this.cadMap.set(key, new CadData(data.CAD数据map[key].json));
      }
      this.options.set(data.选项);
    }
  }
  clickItem(i: number) {
    this.activeItemIndex.set(i);
  }

  activeSbjbItemIndex = signal<number>(-1);
  activeSbjbItem = computed(() => {
    const items = this.activeItem()?.锁边铰边数据;
    if (!items) {
      return null;
    }
    return items[this.activeSbjbItemIndex()];
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
  onSbjbItemTableCellClick({item}: CellEvent<XhmrmsbjSbjbItemSbjbSorted>) {
    this.activeSbjbItemIndex.set(item.originalIndex);
  }
  onSbjbItemTableFilterAfter({dataSource}: FilterAfterEvent<XhmrmsbjSbjbItemSbjbSorted>) {
    const index = this.activeSbjbItemIndex();
    const items = dataSource.filteredData;
    const item = items.find((v) => v.originalIndex === index);
    if (!item) {
      if (items.length > 0) {
        this.activeSbjbItemIndex.set(items[0].originalIndex);
        setTimeout(() => {
          this.sbjbItemTable()?.scrollToRow(0);
        }, 0);
      } else {
        this.activeSbjbItemIndex.set(-1);
      }
    }
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

  async getExportData() {
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
      return [];
    }
    data.from.sort((a, b) => (indexMap.get(a.产品分类) ?? 0) - (indexMap.get(b.产品分类) ?? 0));
    return data.from;
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

    const exportItems = data.from;
    exportItems.sort((a, b) => (indexMap.get(a.产品分类) ?? 0) - (indexMap.get(b.产品分类) ?? 0));
    const sheets: ExcelSheet[] = [];
    for (const item of exportItems) {
      const {产品分类, 锁边铰边数据} = item;
      sheets.push({title: 产品分类, dataArray: exportXhmrmsbjSbjbItemSbjbs(产品分类, 锁边铰边数据)});
    }
    const name = [this.xinghaoName(), "锁边铰边", DateTime.now().toFormat("yyyyMMdd")].join("_");
    await this.http.exportExcel({data: {name, sheets}});
  }
  async import() {
    const files = await selectFiles({accept: ".xlsx"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const excelData = await this.http.importExcel({file});
    const sheets = excelData?.sheets;
    if (!sheets) {
      return;
    }
    const items: XhmrmsbjSbjbItem[] = [];
    for (const sheet of sheets) {
      if (!sheet.dataArray || sheet.dataArray.length < 1) {
        continue;
      }
      const 产品分类 = sheet.title || "";
      items.push({产品分类, 锁边铰边数据: importXhmrmsbjSbjbItemSbjbs(产品分类, sheet.dataArray)});
    }

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
      return;
    }
    const itemsCurr = this.items();
    for (const item of data.from) {
      const item2 = itemsCurr.find((v) => v.产品分类 === item.产品分类);
      if (item2) {
        if (mode === "清空原有数据并全部替换为新数据") {
          item2.锁边铰边数据 = item.锁边铰边数据;
        } else {
          item2.锁边铰边数据.push(...item.锁边铰边数据);
        }
      }
    }
    this.fetchData(itemsCurr);
  }

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
        this.sbjbItemTable()?.scrollToRow(errItem.j);
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
