import {NgTemplateOutlet} from "@angular/common";
import {Component, computed, effect, HostBinding, inject, input, signal, viewChild, viewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {alertError, ErrorItem, getNamesStr, ResultWithErrors} from "@app/utils/error-message";
import {getCopyName, getDateTimeString, getValueString} from "@app/utils/get-value";
import {ItemsManager} from "@app/utils/items-manager";
import {getSortedItems} from "@app/utils/sort-items";
import {Qiliao, QiliaoTableData} from "@app/utils/table-data/table-data.qiliao";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemFormExtraText} from "@components/lurushuju/cad-item/cad-item.types";
import {OptionsAll2} from "@components/lurushuju/services/lrsj-status.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, selectFiles} from "@lucilor/utils";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ExcelSheet, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {getErrorMsgs, InputInfoWithDataGetter, validateForm, validateValue} from "@modules/input/components/input.utils";
import {getMessageImportModeOptions, MessageImportMode, MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellEvent, FilterAfterEvent, RowButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {clone, cloneDeep, difference, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  FentiCadTemplateData,
  fentiCadTemplateTitles,
  SbjbItemSbjbItemForm,
  XhmrmsbjSbjbCadInfo,
  XhmrmsbjSbjbCadInfoGrouped,
  XhmrmsbjSbjbItem,
  XhmrmsbjSbjbItemSbjb,
  XhmrmsbjSbjbItemSbjbCadInfo,
  XhmrmsbjSbjbItemSbjbCadsData,
  XhmrmsbjSbjbItemSbjbFentiCadInfo,
  XhmrmsbjSbjbItemSbjbItem,
  XhmrmsbjSbjbItemSbjbSorted,
  XhmrmsbjSbjbResponseData
} from "./xhmrmsbj-sbjb.types";
import {
  convertXhmrmsbjSbjbItem,
  exportXhmrmsbjSbjbItemSbjbs,
  getSbjbItemCadKeys,
  getSbjbItemOptionalKeys2,
  getSbjbItemSbjbItem,
  getXhmrmsbjSbjbItemOptions,
  getXhmrmsbjSbjbItemSbjbCad,
  getXhmrmsbjSbjbItemSbjbForm,
  getXhmrmsbjSbjbItemSbjbFormResult,
  getXhmrmsbjSbjbItemSbjbItemForm,
  getXhmrmsbjSbjbItemTableInfo,
  importXhmrmsbjSbjbItemSbjbs,
  isSbjbItemOptionalKeys1,
  isSbjbItemOptionalKeys2,
  isSbjbItemOptionalKeys3
} from "./xhmrmsbj-sbjb.utils";

@Component({
  selector: "app-xhmrmsbj-sbjb",
  imports: [
    CadItemComponent,
    FloatingDialogModule,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    NgScrollbarModule,
    NgTemplateOutlet,
    TableComponent,
    TypedTemplateDirective
  ],
  templateUrl: "./xhmrmsbj-sbjb.component.html",
  styleUrl: "./xhmrmsbj-sbjb.component.scss"
})
export class XhmrmsbjSbjbComponent {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghao = input.required<MrbcjfzXinghaoInfo | null>();

  xinghaoName = computed(() => this.xinghao()?.name);
  items = signal<XhmrmsbjSbjbItem[]>([]);
  refreshItems() {
    this.items.update((v) => v.map((v2) => ({...v2, 锁边铰边数据: v2.锁边铰边数据.map((v3) => ({...v3}))})));
  }
  activeItemIndex = signal<number>(0);
  activeItem = computed(() => this.items().at(this.activeItemIndex()));

  cadCollection: CadCollection = "peijianCad";
  cadYaoqius = computed(() => {
    const yaoqius: ObjectOf<Cad数据要求 | undefined> = {};
    const item = this.activeItem();
    if (item) {
      for (const key of getSbjbItemCadKeys(item.产品分类)) {
        yaoqius[key] = this.status.getCadYaoqiu(key);
      }
    }
    return yaoqius;
  });
  cadMap = new Map<string, CadData>();
  cadsFetched = signal(new Set<string>());
  showCadFormDefaultTexts = signal(false);
  toggleShowCadFormDefaultTexts() {
    this.showCadFormDefaultTexts.update((v) => !v);
  }
  cadInfos = computed(() => {
    const infos: XhmrmsbjSbjbCadInfo[] = [];
    const item = this.activeSbjbItem();
    const cadsFetched = this.cadsFetched();
    if (item) {
      const qiliaos = this.qiliaosManager.items();
      for (const cadItem of item.CAD数据 || []) {
        const info: XhmrmsbjSbjbCadInfo = {...cadItem, cadForm: {noDefaultTexts: !this.showCadFormDefaultTexts()}};
        if (cadItem.cadId) {
          info.isFetched = cadsFetched.has(cadItem.cadId);
          const cad = this.cadMap.get(cadItem.cadId);
          if (cad) {
            info.cad = cad;
          }
        }
        const title = info.title;
        if (isSbjbItemOptionalKeys2(title)) {
          const extraTexts: CadItemFormExtraText[] = [];
          const keys: (keyof XhmrmsbjSbjbItemSbjbItem)[] = [
            "正面宽",
            "正面宽可改",
            "背面宽",
            "背面宽可改",
            "正背面同时改变",
            "使用正面分体",
            "使用背面分体"
          ];
          const item2 = item[title];
          for (const key of keys) {
            let key2 = key;
            if (key === "正面宽" || key === "背面宽") {
              key2 = (info.cad?.type || "") + key2;
            }
            extraTexts.push({key: key2, value: getValueString(item2?.[key])});
          }
          info.cadForm.extraTexts = extraTexts;
          info.cadForm.onEdit = (c) => this.editSbjbItemSbjbItem(c.customInfo().index);
          info.item2 = item2;
          info.qiliao = qiliaos.find((v) => v.name === item2?.名字);
        }
        infos.push(info);
      }
    }
    return infos;
  });
  cadInfoGroups = computed(() => {
    const group1: XhmrmsbjSbjbCadInfoGrouped[] = [];
    const group2: XhmrmsbjSbjbCadInfoGrouped[] = [];
    for (const [i, info] of this.cadInfos().entries()) {
      if (isSbjbItemOptionalKeys1(info.name)) {
        group1.push({...info, originalIndex: i});
      } else {
        group2.push({...info, originalIndex: i});
      }
    }
    return [group1, group2];
  });
  cadButtons2 = computed(() => {
    const buttons: CadItemButton<XhmrmsbjSbjbItemSbjbCadInfo>[] = [
      {name: "选择", onClick: (c) => this.selectSbjbItemSbjbCad(c.customInfo().index)},
      {name: "删除", onClick: (c) => this.deselectSbjbItemSbjbCad(c.customInfo().index)}
    ];
    return buttons;
  });
  cadItemFormTitleBtns = computed((): CadItemButton<XhmrmsbjSbjbItemSbjbCadInfo>[] => [
    {
      name: this.showXinghaosUsingSbjbCadBtnName,
      onClick: async (component) => {
        const cadName = component.cadName();
        if (cadName) {
          await this.showXinghaosUsingSbjbCad(cadName);
        } else {
          await this.message.error("没有Cad数据");
        }
      }
    }
  ]);
  afterFetchCad(cad: CadData) {
    this.cadMap.set(cad.id, cad);
    this.cadsFetched.update((v) => clone(v.add(cad.id)));
  }
  showXinghaosUsingSbjbCadBtnName = "哪些型号在用";
  async showXinghaosUsingSbjbCad(cadName: string) {
    const data = await this.http.getData<{url: string}>("shuju/api/showXinghaosUsingSbjbCad", {cadName});
    const url = data?.url;
    if (url) {
      open(url);
    }
  }
  async editSbjbItemSbjbItem(index: number) {
    const item = this.activeSbjbItem();
    if (!item) {
      return;
    }
    const info = this.cadInfos().at(index);
    const name = info?.title;
    if (!name || !isSbjbItemOptionalKeys2(name)) {
      return;
    }
    const item2 = item[name];
    const cadName = item2?.名字 || "";
    const title = `${name}：${cadName}`;
    const {form: inputInfos, data: item2New} = getXhmrmsbjSbjbItemSbjbItemForm(info.cad, item2);
    const qiliaoPrev = await this.findQiliao(cadName);
    const qiliaoCurr = cloneDeep(qiliaoPrev);
    const form: SbjbItemSbjbItemForm = {title, inputInfos, item, name, item2, item2New, qiliaoPrev, qiliaoCurr, cadName};
    if (qiliaoCurr) {
      if (qiliaoCurr.fenti1?.id) {
        form.fentiCad1 = this.qiliaoCadMap.get(qiliaoCurr.fenti1.id);
      }
      if (qiliaoCurr.fenti2?.id) {
        form.fentiCad2 = this.qiliaoCadMap.get(qiliaoCurr.fenti2.id);
      }
    }
    this.sbjbItemSbjbItemForm.set(form);
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
        collection: this.cadCollection,
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
        ],
        cadItemFormTitleBtns: this.cadItemFormTitleBtns()
      }
    });
    const cad2 = result?.[0];
    let needsRefresh = false;
    cadNamesMap.forEach(({nameBefore, data}) => {
      if (nameBefore === data.名字) {
        return;
      }
      const type = data.分类;
      const isKeys1 = isSbjbItemOptionalKeys1(type);
      const isKeys2 = isSbjbItemOptionalKeys2(type);
      if (!isKeys1 && !isKeys2) {
        return;
      }
      for (const item2 of this.items()) {
        for (const item3 of item2.锁边铰边数据) {
          if (isKeys1 && item3[type] === nameBefore) {
            item3[type] = data.名字;
            needsRefresh = true;
            if (Array.isArray(item3.CAD数据)) {
              for (let i = 0; i < item3.CAD数据.length; i++) {
                if (item3.CAD数据[i].name === type) {
                  item3.CAD数据[i].cadId = data._id;
                }
              }
            }
          }
        }
      }
    });
    if (cad2) {
      if (isSbjbItemOptionalKeys1(title)) {
        item[title] = cad2.name;
      } else if (isSbjbItemOptionalKeys2(title)) {
        if (!item[title]) {
          item[title] = getSbjbItemSbjbItem();
        }
        item[title].名字 = cad2.name;
      }
      item.CAD数据[index].cadId = cad2.id;
      this.cadMap.set(cad2.id, cad2);
      this.purgeCadMap();
      await this.findQiliao(cad2.name);
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
    if (isSbjbItemOptionalKeys1(title)) {
      item[title] = "";
    } else if (isSbjbItemOptionalKeys2(title)) {
      if (!item[title]) {
        item[title] = getSbjbItemSbjbItem();
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

  sbjbItemSbjbItemForm = signal<SbjbItemSbjbItemForm | null>(null);
  sbjbItemSbjbItemFormInputs = viewChildren<InputComponent>("sbjbItemSbjbItemFormInputs");
  async closeSbjbItemSbjbItemForm(submit: boolean) {
    const form = this.sbjbItemSbjbItemForm();
    if (!form) {
      return;
    }
    if (submit) {
      const inputs = this.sbjbItemSbjbItemFormInputs();
      const result = await validateForm(inputs);
      const error: ErrorItem = {content: "", details: []};
      if (result.errorMsg) {
        error.details.push([{text: result.errorMsg}]);
      }
      const {item, name, item2New, qiliaoPrev, qiliaoCurr, fentiCad1, fentiCad2} = form;
      if (await alertError(this.message, error)) {
        return;
      }
      item[name] = item2New;
      if (qiliaoCurr && !isEqual(qiliaoPrev?.raw, qiliaoCurr.raw)) {
        await this.updateQiliao(qiliaoCurr);
      }
      for (const cad of [fentiCad1, fentiCad2]) {
        if (cad) {
          this.qiliaoCadMap.set(cad.id, cad);
        }
      }
      this.refreshItems();
    }
    this.sbjbItemSbjbItemForm.set(null);
  }

  qiliaosManager = new ItemsManager<Qiliao>(
    () => [],
    (a, b) => a.id === b.id
  );
  qiliaoCadMap = new Map<string, CadData>();
  qiliaoCadMapEff = effect(async () => {
    const qiliaos = this.qiliaosManager.items();
    const cadIdsNew: string[] = [];
    for (const qiliao of qiliaos) {
      const ids = [qiliao.fenti1?.id, qiliao.fenti2?.id];
      for (const id of ids) {
        if (!id || cadIdsNew.includes(id)) {
          continue;
        }
        cadIdsNew.push(id);
      }
    }
    const cadIdsOld = Array.from(this.qiliaoCadMap.keys());
    for (const id of difference(cadIdsOld, cadIdsNew)) {
      this.qiliaoCadMap.delete(id);
    }
    const cadIdsToFetch = difference(cadIdsNew, cadIdsOld);
    if (cadIdsToFetch.length > 0) {
      const cadsNew = await this.http.getCad({collection: this.cadCollection, ids: cadIdsToFetch});
      for (const cad of cadsNew.cads) {
        this.qiliaoCadMap.set(cad.id, cad);
      }
    }
  });
  qiliaosChanged: Qiliao[] = [];
  async updateQiliao(qiliao: Qiliao) {
    this.qiliaosManager.refresh({update: [qiliao]});
    if (!this.qiliaosChanged.some((v) => this.qiliaosManager.compareFn(v, qiliao))) {
      this.qiliaosChanged.push(qiliao);
    }
  }
  qiliaoTable = "p_qiliao";
  async findQiliao(name: string) {
    if (!name) {
      return null;
    }
    const qiliao = this.qiliaosManager.items().find((v) => v.name === name);
    if (qiliao) {
      return qiliao;
    }
    const qiliaos = await this.http.queryMySql<QiliaoTableData>(
      {table: this.qiliaoTable, filter: {where: {mingzi: name}}},
      {spinner: false}
    );
    if (qiliaos[0]) {
      const qiliao2 = new Qiliao(qiliaos[0]);
      this.qiliaosManager.refresh({add: [qiliao2]});
      return qiliao2;
    } else {
      return await this.addQiliaoTableItem(name);
    }
  }
  async addQiliaoTableItem(name: string) {
    const result = await this.http.tableInsert<QiliaoTableData>({table: this.qiliaoTable, data: {mingzi: name}}, {spinner: false});
    if (result) {
      const qiliao = new Qiliao(result);
      this.qiliaosManager.refresh({add: [qiliao]});
      return qiliao;
    }
    return null;
  }

  fentiCadTemplateData!: {$implicit: FentiCadTemplateData};
  fentiCadTemplateTitles = fentiCadTemplateTitles;
  getFentiCadTemplateInfo({data, title}: XhmrmsbjSbjbItemSbjbFentiCadInfo) {
    const {qiliao, form} = data;
    let cad: CadData | undefined;
    if (form) {
      cad = form[title === "分体1" ? "fentiCad1" : "fentiCad2"];
    } else {
      const id = qiliao?.[title === "分体1" ? "fenti1" : "fenti2"]?.id;
      if (id) {
        cad = this.qiliaoCadMap.get(id);
      }
    }
    if (!cad) {
      return null;
    }
    const isFetched = this.cadsFetched().has(cad.id);
    return {cad, isFetched};
  }
  fentiCadButtons2 = computed(() => {
    const buttons: CadItemButton<XhmrmsbjSbjbItemSbjbFentiCadInfo>[] = [
      {name: "选择", onClick: (c) => this.chooseFentiCad(c.customInfo())},
      {name: "删除", onClick: (c) => this.removeFentiCad(c.customInfo())}
    ];
    return buttons;
  });
  fentiCadYaoqiu = computed(() => this.status.getCadYaoqiu("企料分体"));
  async chooseFentiCad({data, title}: XhmrmsbjSbjbItemSbjbFentiCadInfo) {
    const item = this.activeSbjbItem();
    const item2 = item?.[data.key];
    const key = title === "分体1" ? "fenti1" : "fenti2";
    let qiliao: Qiliao | undefined | null;
    const {form} = data;
    if (form) {
      qiliao = form?.qiliaoCurr;
    } else {
      qiliao = await this.findQiliao(item2?.名字 || "");
    }
    const checkedItems: string[] = [];
    if (qiliao?.[key]?.id) {
      checkedItems.push(qiliao[key].id);
    }
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "single",
        collection: this.cadCollection,
        yaoqiu: this.fentiCadYaoqiu(),
        checkedItems
      }
    });
    const cad = result?.[0];
    if (cad) {
      if (form) {
        const formFentiKey = title === "分体1" ? "fentiCad1" : "fentiCad2";
        form[formFentiKey] = cad;
        if (form.qiliaoCurr) {
          form.qiliaoCurr[key] = {id: cad.id, 唯一码: cad.info.唯一码};
        }
        this.sbjbItemSbjbItemForm.set({...form});
      } else {
        if (qiliao) {
          qiliao[key] = {id: cad.id, 唯一码: cad.info.唯一码};
          this.qiliaoCadMap.set(cad.id, cad);
          this.updateQiliao(qiliao);
        }
      }
    }
  }
  removeFentiCad({data, title}: XhmrmsbjSbjbItemSbjbFentiCadInfo) {
    const key = title === "分体1" ? "fenti1" : "fenti2";
    const {form} = data;
    if (form) {
      const formFentiKey = title === "分体1" ? "fentiCad1" : "fentiCad2";
      delete form[formFentiKey];
      if (form.qiliaoCurr) {
        form.qiliaoCurr[key] = null;
      }
      this.sbjbItemSbjbItemForm.set({...form});
    } else {
      const item = this.activeSbjbItem();
      const item2 = item?.[data.key];
      const qiliao = this.qiliaosManager.items().find((v) => v.name === item2?.名字);
      if (qiliao) {
        qiliao[key] = null;
        this.updateQiliao(qiliao);
      }
    }
  }

  options = signal<OptionsAll2>({});

  fetchDataEff = effect(() => this.fetchData());
  async fetchData(peizhi?: XhmrmsbjSbjbResponseData) {
    const xinghao = this.xinghaoName();
    if (!xinghao) {
      return;
    }
    const data = await this.http.getData<{
      锁边铰边: XhmrmsbjSbjbItem[];
      CAD数据map: ObjectOf<HoutaiCad>;
      选项: OptionsAll2;
      qiliaos: QiliaoTableData[];
    }>("shuju/api/getsuobianjiaobianData", {xinghao, peizhi});
    if (data) {
      for (const item of data.锁边铰边) {
        for (const item2 of item.锁边铰边数据) {
          for (const key of getSbjbItemOptionalKeys2(item.产品分类)) {
            item2[key] = getSbjbItemSbjbItem(item2[key]);
          }
        }
      }
      this.items.set(data.锁边铰边);
      this.qiliaosManager.refresh({
        remove: this.qiliaosManager.items(),
        add: data.qiliaos.map((v) => new Qiliao(v))
      });
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
        await this.editSbjbItemSbjb(rowIdx);
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
    const item = await getXhmrmsbjSbjbItemSbjbFormResult(this.message, options, item2.产品分类);
    if (item) {
      if (item.默认值) {
        for (const item3 of item2.锁边铰边数据) {
          delete item3.默认值;
        }
      }
      item.CAD数据 = getSbjbItemCadKeys(item2.产品分类).map((key) => getXhmrmsbjSbjbItemSbjbCad(key));
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
    const selected = table.getSelectedItems().map((v) => v.originalIndex);
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
  async editSbjbItemSbjb(index: number) {
    const item2 = this.activeItem();
    if (!item2) {
      return;
    }
    const options = this.options();
    const item3 = await getXhmrmsbjSbjbItemSbjbFormResult(this.message, options, item2.产品分类, item2.锁边铰边数据[index]);
    if (item3) {
      item2.锁边铰边数据[index] = item3;
      if (item3.默认值) {
        for (const [i, item4] of item2.锁边铰边数据.entries()) {
          if (i === index) {
            continue;
          }
          delete item4.默认值;
        }
      }
      this.refreshItems();
    }
  }

  async copySbjbItems(to: XhmrmsbjSbjbItem) {
    const items = this.items().filter((v) => v !== to);
    const itemOptions = getXhmrmsbjSbjbItemOptions(items);
    const data: {from: XhmrmsbjSbjbItem | null; mode: MessageImportMode} = {from: null, mode: "append"};
    const getter = new InputInfoWithDataGetter(data);
    const result = await this.message.form([
      getter.selectSingle("from", itemOptions, {label: "从哪里复制", validators: Validators.required}),
      getter.selectSingle("mode", getMessageImportModeOptions(), {label: "复制方式", validators: Validators.required})
    ]);
    const {from, mode} = data;
    if (!result || !from) {
      return;
    }
    const fromItems = from.锁边铰边数据.map((v) => convertXhmrmsbjSbjbItem(from.产品分类, to.产品分类, v));
    if (mode === "replace") {
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
    const data = await this.message.getExportFrom(items, (v) => v.产品分类, "产品分类");
    if (!data) {
      return;
    }
    const exportItems = data.from;
    const indexMap = new Map(items.map((v, i) => [v.产品分类, i]));
    exportItems.sort((a, b) => (indexMap.get(a.产品分类) ?? 0) - (indexMap.get(b.产品分类) ?? 0));
    const sheets: ExcelSheet[] = [];
    for (const item of exportItems) {
      const {产品分类, 锁边铰边数据} = item;
      sheets.push({title: 产品分类, dataArray: exportXhmrmsbjSbjbItemSbjbs(产品分类, 锁边铰边数据)});
    }
    const name = [this.xinghaoName(), "锁边铰边", getDateTimeString()].join("_");
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

    const data = await this.message.getImportFrom(items, (v) => v.产品分类, "产品分类");
    if (!data) {
      return;
    }
    const {from, mode} = data;
    const itemsCurr = this.items();
    for (const item of from) {
      const item2 = itemsCurr.find((v) => v.产品分类 === item.产品分类);
      if (item2) {
        if (mode === "replace") {
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
    const result = new ResultWithErrors(null);
    const options = this.options();
    let sbjbItemSbjbItemToEdit: {i: number; j: number} | undefined;
    for (const [i, item] of items.entries()) {
      const items2 = getSortedItems(item.锁边铰边数据, (v) => v.排序 ?? 0);
      for (const [j, item2] of items2.entries()) {
        const {form} = getXhmrmsbjSbjbItemSbjbForm(options, item.产品分类, item2);
        for (const info of form) {
          const key = info.model?.key;
          if (typeof key === "string") {
            const errors = validateValue(info, (item2 as any)[key]);
            const errorMsgs = getErrorMsgs(errors);
            if (errorMsgs.length > 0) {
              if (!sbjbItemSbjbItemToEdit) {
                sbjbItemSbjbItemToEdit = {i, j};
              }
              for (const msg of getErrorMsgs(errors)) {
                const names = [`${item.产品分类}第${j + 1}条`, info.label || ""];
                result.addErrorStr(`${getNamesStr(names)}:${msg}`);
              }
            }
          }
        }
        const errKeys: string[] = [];
        for (const key of getSbjbItemCadKeys(item.产品分类)) {
          if (isSbjbItemOptionalKeys2(key)) {
            if (!item2[key]?.名字) {
              errKeys.push(key);
            }
          } else if (!item2[key]) {
            errKeys.push(key);
          }
        }
        if (errKeys.length > 0) {
          result.addErrorStr(`缺少选项${getNamesStr(errKeys)}`);
        }
      }
    }
    await result.alertError(this.message);
    if (sbjbItemSbjbItemToEdit) {
      const {i, j} = sbjbItemSbjbItemToEdit;
      this.activeItemIndex.set(i);
      this.activeSbjbItemIndex.set(j);
      this.editSbjbItemSbjb(j);
    }
    return !result.hasError();
  }
  async save() {
    const isValid = await this.validate();
    if (!isValid) {
      return false;
    }
    const items0 = this.items();
    const items = items0.map((item) => ({...item, 锁边铰边数据: item.锁边铰边数据.map((v) => ({...v, CAD数据: undefined}))}));
    const qiliaosChanged = this.qiliaosChanged.map((v) => v.raw);
    const response = await this.http.post("shuju/api/saveSuobianjiaobianData", {xinghao: this.xinghaoName(), data: items, qiliaosChanged});
    if (response?.code === 0) {
      this.qiliaosChanged = [];
    }
    return true;
  }

  async importItemCads() {
    await this.message.importData<XhmrmsbjSbjbItemSbjbCadsData>(false, async (data) => {
      const result = new ResultWithErrors(null);
      const item = this.activeItem();
      const item2 = this.activeSbjbItem();
      if (!item || !item2) {
        return result.addWarningStr("当前页面数据为空");
      }
      const resetCads = await this.message.button({content: "是否新建CAD？", buttons: ["是", "否"] as const});
      if (resetCads === "取消") {
        return result.addWarningStr("取消导入");
      }
      const idMap = new Map<string, string>();
      let cadNames: string[] = [];
      if (resetCads) {
        const cads = await this.http.queryMongodb({collection: this.cadCollection, fields: ["名字"]});
        cadNames = cads.map((v) => v.名字);
      }
      for (const cad of data.cads) {
        const cadData = new CadData(cad);
        const idOld = cadData.id;
        if (resetCads === "是") {
          cadData.resetIds();
          cadData.name = getCopyName(cadNames, cadData.name);
          cadNames.push(cadData.name);
        }
        const cad2 = await this.http.setCad({collection: this.cadCollection, cadData, force: true}, false, {
          silent: true
        });
        if (cad2) {
          this.cadMap.set(cad2.id, cad2);
          if (idOld !== cad2.id) {
            idMap.set(idOld, cad2.id);
          }
        } else {
          result.addErrorStr("导入CAD出错<br>" + this.http.lastResponse?.msg);
          return result;
        }
      }
      for (const cadInfo of data.item.CAD数据 || []) {
        if (cadInfo.cadId) {
          cadInfo.cadId = idMap.get(cadInfo.cadId) || cadInfo.cadId;
        }
      }
      item.锁边铰边数据[this.activeSbjbItemIndex()] = convertXhmrmsbjSbjbItem(data.fenlei, item.产品分类, {...item2, ...data.item});
      this.refreshItems();
      return result;
    });
  }
  async exportItemCads() {
    const item = this.activeItem();
    const item2 = this.activeSbjbItem();
    if (!item || !item2) {
      return;
    }
    const fenlei = item.产品分类;
    const cadIds = new Set<string>();
    for (const info of item2.CAD数据 || []) {
      if (info.cadId) {
        cadIds.add(info.cadId);
      }
    }
    const cads = (await this.http.getCad({collection: this.cadCollection, ids: Array.from(cadIds)})).cads;
    const item3: Partial<XhmrmsbjSbjbItemSbjb> = {CAD数据: item2.CAD数据};
    for (const key in item2) {
      if (isSbjbItemOptionalKeys3(key)) {
        item3[key] = item2[key] as any;
      }
    }
    const data: XhmrmsbjSbjbItemSbjbCadsData = {fenlei, item: item3, cads: cads.map((v) => v.export())};
    const title = [this.xinghaoName(), fenlei, this.activeSbjbItemIndex() + 1].join("_");
    await this.message.exportData(data, title);
  }
}
