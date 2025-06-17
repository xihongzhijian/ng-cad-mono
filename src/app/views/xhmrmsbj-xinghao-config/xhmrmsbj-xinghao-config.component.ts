import {NgTemplateOutlet} from "@angular/common";
import {Component, computed, effect, HostBinding, inject, input, model, signal, untracked, viewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {getNamesStr, ResultWithErrors} from "@app/utils/error-message";
import {BjmkStatusService} from "@components/bujumokuai/services/bjmk-status.service";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {ShuruTableDataSorted, XuanxiangTableData} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.types";
import {
  emptyXuanxiangItem,
  getShuruItem,
  getShuruTable,
  getXuanxiangItem,
  getXuanxiangTable
} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.utils";
import {sbjbItemOptionalKeys2} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.types";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf} from "@lucilor/utils";
import {SuanliaogongshiComponent} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, RowButtonEventBase, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {menshanKeys} from "@views/xhmrmsbj/xhmrmsbj.types";
import {XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {clone, cloneDeep, difference, isEqual, uniqWith} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  qiliaoFtwzxsNames,
  qiliaoPkwzNames,
  qiliaoQhfkNames,
  qiliaoXnqlflNames,
  SuanliaoConfigItem,
  SuanliaoConfigItemsGetter,
  SuanliaoConfigItemsSetter,
  suanliaoMszjbzxsNames,
  XhmrmsbjXinghaoConfigComponentType
} from "./xhmrmsbj-xinghao-config.types";
import {getSuanliaoConfigData, getSuanliaoConfigItemCadSearch} from "./xhmrmsbj-xinghao-config.utils";

@Component({
  selector: "app-xhmrmsbj-xinghao-config",
  imports: [
    CadImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    NgScrollbarModule,
    NgTemplateOutlet,
    SuanliaogongshiComponent,
    TableComponent,
    TypedTemplateDirective
  ],
  templateUrl: "./xhmrmsbj-xinghao-config.component.html",
  styleUrl: "./xhmrmsbj-xinghao-config.component.scss"
})
export class XhmrmsbjXinghaoConfigComponent {
  private bjmk = inject(BjmkStatusService);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  data = model.required<XhmrmsbjData | null>({alias: "data"});
  type = input.required<XhmrmsbjXinghaoConfigComponentType | null>();

  dataEff = effect(async () => {
    const data = this.data();
    if (!data) {
      return;
    }
    const options = await this.bjmk.xinghaoOptionsManager.fetch();
    const config = data.xinghaoConfig;
    const options2 = config.选项;
    config.选项 = [];
    for (const name of Object.keys(options)) {
      const optionFound = options2?.find((v) => v.名字 === name);
      if (optionFound) {
        config.选项.push(optionFound);
      } else {
        config.选项.push({名字: name, 可选项: []});
      }
    }
    for (const item of config.选项) {
      item.可选项 = uniqWith(item.可选项, (a, b) => a.vid === b.vid);
    }
    if (!isEqual(config.选项, options2)) {
      this.refreshData();
    }
  });
  refreshData() {
    this.data.update((v) => clone(v));
  }

  shurus = computed(() => this.data()?.xinghaoConfig.输入 || []);
  shuruTable = computed(() =>
    getShuruTable(
      this.shurus(),
      {add: this.addShuru.bind(this), edit: this.editShuru.bind(this), delete: this.deleteShuru.bind(this)},
      {title: "型号输入"}
    )
  );
  async addShuru() {
    const item = await getShuruItem(this.message, this.shurus());
    const data = this.data();
    if (item && data) {
      const config = data.xinghaoConfig;
      config.输入 = [...(config.输入 || []), item];
      this.refreshData();
    }
  }
  async editShuru(params: RowButtonEventBase<ShuruTableDataSorted>) {
    const data = this.data();
    const item = await getShuruItem(this.message, this.shurus(), params.item);
    if (item && data) {
      const config = data.xinghaoConfig;
      config.输入 = (config.输入 || []).map((v, i) => (i === params.item.originalIndex ? item : v));
      this.refreshData();
    }
  }
  async deleteShuru(params: RowButtonEventBase<ShuruTableDataSorted>) {
    if (await this.message.confirm(`确定删除【${params.item.名字}】吗？`)) {
      const config = this.data()?.xinghaoConfig;
      if (config) {
        config.输入 = config.输入.filter((_, i) => i !== params.item.originalIndex);
        this.refreshData();
      }
    }
  }

  xuanxiangs = computed(() => this.data()?.xinghaoConfig.选项 || []);
  xuanxiangTable = computed(() => getXuanxiangTable(this.xuanxiangs(), {title: "型号选项"}));
  async onXuanxiangToolbar(event: ToolbarButtonEvent) {
    const data = this.data();
    switch (event.button.event) {
      case "添加": {
        const options = await this.bjmk.xinghaoOptionsManager.fetch();
        const item = await getXuanxiangItem(this.message, options, this.xuanxiangs(), undefined, {useOptionOptions: true});
        if (item && data) {
          const config = data.xinghaoConfig;
          config.选项 = [...(config.选项 || []), item];
          this.refreshData();
        }
      }
    }
  }
  async onXuanxiangRow(event: RowButtonEvent<XuanxiangTableData>) {
    const data = this.data();
    switch (event.button.event) {
      case "编辑":
        {
          const options = await this.bjmk.xinghaoOptionsManager.fetch();
          const item = await getXuanxiangItem(this.message, options, this.xuanxiangs(), event.item, {useOptionOptions: true});
          if (item && data) {
            const config = data.xinghaoConfig;
            config.选项 = config.选项.map((v, i) => (i === event.rowIdx ? item : v));
            this.refreshData();
          }
        }
        break;
      case "清空数据":
        if (await emptyXuanxiangItem(this.message, event.item)) {
          const config = data?.xinghaoConfig;
          if (config) {
            config.选项 = [...config.选项];
            this.refreshData();
          }
        }
    }
  }

  gongshis = computed(() => this.data()?.xinghaoConfig.公式 || []);
  slgsInfo = computed<SuanliaogongshiInfo>(() => ({
    data: {算料公式: this.gongshis()},
    slgs: {
      title: "型号公式",
      docUrl: "https://kdocs.cn/l/cuAhAZuvkrpo"
    }
  }));
  onSlgsChange() {
    this.refreshData();
  }

  async addSuanliaoConfigItem<T extends SuanliaoConfigItem>(
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    names: T["名字"][],
    cad: T["cad"]
  ) {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig || names.length < 1) {
      return;
    }
    let name: T["名字"] | null = names[0];
    if (names.length > 1) {
      name = await this.message.prompt({
        type: "select",
        label: "名字",
        options: names,
        validators: [Validators.required]
      });
    }
    if (!name) {
      return;
    }
    const items = itemsGetter(xinghaoConfig).slice();
    items.push(getSuanliaoConfigData(name, [], cad));
    itemsSetter(xinghaoConfig, items);
    this.refreshData();
  }
  async removeSuanliaoConfigItem<T extends SuanliaoConfigItem>(
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    index: number
  ) {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig) {
      return;
    }
    const items = itemsGetter(xinghaoConfig).slice();
    const item = items[index];
    if (!item) {
      return;
    }
    if (!(await this.message.confirm(`确定删除【${item.名字}】吗？`))) {
      return;
    }
    items.splice(index, 1);
    itemsSetter(xinghaoConfig, items);
    this.refreshData();
  }
  copySuanliaoConfigItem<T extends SuanliaoConfigItem>(
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    index: number
  ) {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig) {
      return;
    }
    const items = itemsGetter(xinghaoConfig).slice();
    const item = items[index];
    if (!item) {
      return;
    }
    items.splice(index, 0, cloneDeep(item));
    itemsSetter(xinghaoConfig, items);
    this.refreshData();
  }
  async setSuanliaoConfigItemCad<T extends SuanliaoConfigItem>(
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    index: number,
    title: string
  ) {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig) {
      return;
    }
    const items = itemsGetter(xinghaoConfig).slice();
    const item = items[index];
    const cad = item?.cad;
    if (!cad) {
      return;
    }
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "single",
        checkedItems: cad.id ? [cad.id] : [],
        collection: "peijianCad",
        fixedSearch: getSuanliaoConfigItemCadSearch(title)
      }
    });
    const data = result?.[0];
    if (data) {
      item.cad = {id: data.id, 唯一码: data.info.唯一码};
      itemsSetter(xinghaoConfig, items);
      this.refreshData();
    }
  }
  async editSuanliaoConfigItemCad<T extends SuanliaoConfigItem>(
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    index: number
  ) {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig) {
      return;
    }
    const items = itemsGetter(xinghaoConfig).slice();
    const item = items[index];
    const id = item?.cad?.id;
    if (!id) {
      return;
    }
    const collection = this.bjmk.collection;
    const cads = await this.http.getCad({collection, id});
    const result = await openCadEditorDialog(this.dialog, {data: {collection, data: cads.cads[0], center: true}});
    if (result?.savedData) {
      item.cad = {id, 唯一码: result.savedData.info.唯一码};
      itemsSetter(xinghaoConfig, items);
      this.refreshData();
    }
  }
  async removeSuanliaoConfigItemCad<T extends SuanliaoConfigItem>(
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    index: number
  ) {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig) {
      return;
    }
    const items = itemsGetter(xinghaoConfig).slice();
    const item = items[index];
    const cad = item?.cad;
    if (!cad) {
      return;
    }
    item.cad = {};
    itemsSetter(xinghaoConfig, items);
    this.refreshData();
  }
  suanliaoConfigCadCollection = this.bjmk.collection;
  suanliaoConfigCadYaoqiu = this.bjmk.cadYaoqiu;

  cadMap = signal(new Map<string, CadData>());
  cadMapEff = effect(async () => {
    const map = new Map(untracked(() => this.cadMap()));
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (xinghaoConfig) {
      const ids = new Set<string>();
      for (const key of keysOf(xinghaoConfig.企料结构配置)) {
        const items = xinghaoConfig.企料结构配置[key];
        for (const item of items || []) {
          if (item.cad?.id && !map.has(item.cad.id)) {
            ids.add(item.cad.id);
          }
        }
      }
      if (ids.size > 0) {
        const cads = await this.http.getCad(
          {collection: this.suanliaoConfigCadCollection, ids: Array.from(ids), fields: ["_id", "名字"]},
          {silent: true}
        );
        const ids2 = cads.cads.map((v) => v.id);
        for (const cad of cads.cads) {
          map.set(cad.id, cad);
        }
        const missingIds = difference(Array.from(ids), ids2);
        if (missingIds.length > 0) {
          const msg = "配件库，以下企料封口CAD找不到，请检查封口CAD是否导入或者已经删除，请检查数据：";
          this.message.error(`${msg}<br>${getNamesStr(missingIds, "<br>")}`);
        }
      }
    }
    this.cadMap.set(map);
  });

  getSuanliaoConfigDataSet<T extends SuanliaoConfigItem>(
    title: string,
    itemsGetter: SuanliaoConfigItemsGetter<T>,
    itemsSetter: SuanliaoConfigItemsSetter<T>,
    names: T["名字"][],
    positions: T["位置"],
    cad: T["cad"]
  ) {
    let data = this.data();
    if (!data) {
      data = new XhmrmsbjData({vid: 1, mingzi: ""}, [], {}, []);
    }
    const xinghaoConfig = data.xinghaoConfig;
    const items = itemsGetter(xinghaoConfig);
    const infos: {item: T; inputInfos: InputInfo[]; cad?: CadData}[] = [];
    const cadMap = this.cadMap();
    for (const item of items) {
      const getter = new InputInfoWithDataGetter(item);
      const onChange = () => {
        this.refreshData();
      };
      infos.push({
        item,
        cad: cadMap.get(item.cad?.id || ""),
        inputInfos: [
          getter.selectMultiple("位置", positions, {onChange}),
          getter.object("选项", {onChange, optionType: "选项", optionMultiple: true, optionsDialog: {}}),
          getter.array("条件", {onChange})
        ]
      });
    }
    return {
      title,
      infos,
      add: () => this.addSuanliaoConfigItem(itemsGetter, itemsSetter, names, cad),
      remove: (index: number) => this.removeSuanliaoConfigItem(itemsGetter, itemsSetter, index),
      copy: (index: number) => this.copySuanliaoConfigItem(itemsGetter, itemsSetter, index),
      setCad: (index: number) => this.setSuanliaoConfigItemCad(itemsGetter, itemsSetter, index, title),
      editCad: (index: number) => this.editSuanliaoConfigItemCad(itemsGetter, itemsSetter, index),
      removeCad: (index: number) => this.removeSuanliaoConfigItemCad(itemsGetter, itemsSetter, index)
    };
  }
  suanliaoDataSets = computed(() => [
    this.getSuanliaoConfigDataSet(
      "门扇中间标注显示",
      (xinghaoConfig) => xinghaoConfig.算料单配置.门扇中间标注显示 || [],
      (xinghaoConfig, items) => (xinghaoConfig.算料单配置.门扇中间标注显示 = items),
      suanliaoMszjbzxsNames.slice(),
      menshanKeys.slice(),
      null
    )
  ]);
  qiliaoDataSets = computed(() => [
    this.getSuanliaoConfigDataSet(
      "企料前后封口",
      (xinghaoConfig) => xinghaoConfig.企料结构配置.企料前后封口 || [],
      (xinghaoConfig, items) => (xinghaoConfig.企料结构配置.企料前后封口 = items),
      qiliaoQhfkNames.slice(),
      sbjbItemOptionalKeys2.slice(),
      {}
    ),
    this.getSuanliaoConfigDataSet(
      "虚拟企料分类",
      (xinghaoConfig) => xinghaoConfig.企料结构配置.虚拟企料分类 || [],
      (xinghaoConfig, items) => (xinghaoConfig.企料结构配置.虚拟企料分类 = items),
      qiliaoXnqlflNames.slice(),
      sbjbItemOptionalKeys2.slice(),
      null
    ),
    this.getSuanliaoConfigDataSet(
      "企料刨坑位置",
      (xinghaoConfig) => xinghaoConfig.企料结构配置.企料刨坑位置 || [],
      (xinghaoConfig, items) => (xinghaoConfig.企料结构配置.企料刨坑位置 = items),
      qiliaoPkwzNames.slice(),
      sbjbItemOptionalKeys2.slice(),
      null
    ),
    this.getSuanliaoConfigDataSet(
      "企料分体位置显示",
      (xinghaoConfig) => xinghaoConfig.企料结构配置.企料分体位置显示 || [],
      (xinghaoConfig, items) => (xinghaoConfig.企料结构配置.企料分体位置显示 = items),
      qiliaoFtwzxsNames.slice(),
      sbjbItemOptionalKeys2.slice(),
      null
    )
  ]);

  slgsComponents = viewChildren(SuanliaogongshiComponent);
  async submit() {
    const xinghaoConfig = this.data()?.xinghaoConfig;
    if (!xinghaoConfig) {
      return true;
    }
    const result = new ResultWithErrors(null);
    for (const c of this.slgsComponents()) {
      const result2 = await c.submit(true);
      result.learnFrom(result2);
    }
    return await result.check(this.message);
  }
}
