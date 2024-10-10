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
import {Cad数据要求, setCadData} from "@app/cad/cad-shujuyaoqiu";
import {getSortedItems} from "@app/utils/sort-items";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {getCadInfoInputs2} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
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
import {DateTime} from "luxon";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  XhmrmsbjSbjbItem,
  xhmrmsbjSbjbItemCadKeys,
  XhmrmsbjSbjbItemCopyMode,
  xhmrmsbjSbjbItemCopyModes,
  XhmrmsbjSbjbItemOptionalKey,
  xhmrmsbjSbjbItemOptionalKeys,
  XhmrmsbjSbjbItemSbjbCadInfo,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";
import {getXhmrmsbjSbjbItemOptions, getXhmrmsbjSbjbItemSbjbForm, getXhmrmsbjSbjbItemTableInfo} from "./xhmrmsbj-sbjb.utils";

@Component({
  selector: "app-xhmrmsbj-sbjb",
  standalone: true,
  imports: [CadItemComponent, ClickStopPropagationDirective, MatButtonModule, MatDividerModule, NgScrollbarModule, TableComponent],
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

  cadWidth = 300;
  cadHeight = 150;
  cadYaoqius = computed(() => {
    const yaoqius: ObjectOf<Cad数据要求 | undefined> = {};
    const item = this.activeItem();
    if (item) {
      const keys = xhmrmsbjSbjbItemCadKeys[item.产品分类] || [];
      for (const key of keys) {
        yaoqius[key] = this.status.getCadYaoqiu(key);
      }
    }
    return yaoqius;
  });
  cadInfos = computed(() => {
    const infos: {cad: CadData | null; type: string}[] = [];
    const item = this.activeSbjbItem();
    if (item) {
      for (const {name, fenlei, cad} of item.CAD数据 || []) {
        const info: (typeof infos)[0] = {cad: null, type: fenlei || name};
        if (cad) {
          info.cad = new CadData(cad.json);
        }
        infos.push(info);
      }
    }
    return infos;
  });
  cadButtons2 = computed(() => {
    const buttons: CadItemButton<XhmrmsbjSbjbItemSbjbCadInfo>[] = [
      {name: "选择", onClick: ({customInfo}) => this.selectSbjbItemSbjbCad(customInfo.index)}
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
    const {cad, type} = cadInfo;
    const yaoqiu = this.cadYaoqius()[type];
    const result = await openCadListDialog(this.dialog, {
      data: {
        collection: "peijianCad",
        selectMode: "single",
        yaoqiu,
        options: {开启: item.开启},
        checkedItems: cad ? [cad.id] : [],
        addCadFn: () => this.addSbjbItemSbjbCad(type),
        toolbarBtns: [
          {
            name: "后台编辑",
            onClick: async (component) => {
              const url = await this.http.getShortUrl(type, {search: {shujufenlei: type}});
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
    if (cad2) {
      const name2 = type as XhmrmsbjSbjbItemOptionalKey;
      const type2 = this.status.cadYaoqiuNamesMap[type] || type;
      if (xhmrmsbjSbjbItemOptionalKeys.includes(name2)) {
        item[name2] = cad2.options[type2];
      } else if (type === "锁边" || type === "铰边") {
        item[type].名字 = cad2.options[type2];
      }
      item.CAD数据[index].cad = getHoutaiCad(cad2);
      this.refreshItems();
    }
  }
  async addSbjbItemSbjbCad(type: string) {
    const table = type;
    const items = await this.http.queryMySql({table, fields: ["mingzi"]});
    const itemNames = items.map((v) => v.mingzi);
    const yaoqiu = this.cadYaoqius()[type];
    const yaoqiuItems = yaoqiu?.新建CAD要求 || [];
    const yaoqiuItems2 = yaoqiu?.选中CAD要求 || [];
    const cadData = new CadData();
    setCadData(cadData, yaoqiuItems);
    const form = getCadInfoInputs2(yaoqiuItems, yaoqiuItems2, cadData, this.dialog, this.status, true, []);
    const nameInput = form.find((v) => v.model?.key === "name");
    if (nameInput) {
      nameInput.validators = [
        Validators.required,
        (control) => {
          const val = control.value;
          if (itemNames.includes(val)) {
            return {名字不能重复: true};
          }
          return null;
        }
      ];
    }
    cadData.type = type;
    const result = await this.message.form(form);
    if (!result) {
      return null;
    }
    cadData.options[type] = cadData.name;
    const data = getHoutaiCad(cadData);
    const resData = await this.http.getData<{cad: HoutaiCad}>("shuju/api/addSuobianjiaobianData", {table, data});
    if (!resData) {
      return null;
    }
    return new CadData(resData.cad.json);
  }

  fetchDataEff = effect(() => this.fetchData(), {allowSignalWrites: true});
  async fetchData() {
    const items = await this.http.getData<XhmrmsbjSbjbItem[]>("shuju/api/getsuobianjiaobianData", {xinghao: this.xinghaoName()});
    this.items.set(items || []);
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
          item.CAD数据.push({name});
        }
        item2.锁边铰边数据.unshift(item);
        this.refreshItems();
      }
    }
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
    const fromItems = cloneDeep(from.锁边铰边数据);
    if (mode === "全部替换") {
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
          label: "选择产品分类",
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
          if (mode === "全部替换") {
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
    const form: InputInfo<typeof data>[] = [
      {
        type: "select",
        label: "选择产品分类",
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
