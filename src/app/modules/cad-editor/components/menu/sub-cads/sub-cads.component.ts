import {Component, computed, effect, forwardRef, inject, OnDestroy, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTooltipModule} from "@angular/material/tooltip";
import {imgCadEmpty, timer} from "@app/app.common";
import {setCadData} from "@app/cad/cad-data-transform";
import {Cad数据要求, getCadQueryFields} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {uploadAndReplaceCad} from "@app/cad/utils";
import {getNamesStr} from "@app/utils/error-message";
import {matchOptionsFn} from "@app/utils/mongo";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemForm} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData, CadEntities, CadEventCallBack} from "@lucilor/cad-viewer";
import {downloadByString, Matrix, ObjectOf, Point, selectFiles} from "@lucilor/utils";
import {ContextMenuModule} from "@modules/context-menu/context-menu.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusAssemble, CadStatusNormal} from "@services/cad-status";
import {cloneDeep, difference, union} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, filter, lastValueFrom} from "rxjs";
import {getCadInfoInputs2} from "../cad-info/cad-info.utils";
import {MubanCadItemInfo} from "./sub-cads.types";

interface CadNode {
  data: CadData;
  checked: boolean;
}

type ContextMenuCadField = "main" | "component";

@Component({
  selector: "app-sub-cads",
  templateUrl: "./sub-cads.component.html",
  styleUrls: ["./sub-cads.component.scss"],
  imports: [
    CadItemComponent,
    ContextMenuModule,
    forwardRef(() => CadImageComponent),
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
    NgScrollbar
  ]
})
export class SubCadsComponent implements OnInit, OnDestroy {
  private config = inject(AppConfigService);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  main = signal<CadNode | null>(null);
  checkedIndex = -1;
  needsReload: string | null = null;
  contextMenu = viewChild.required(MatMenuTrigger);
  contextMenuCad?: {field: ContextMenuCadField; data: CadData};
  private lastPointer: Point | null = null;
  private entitiesToMove?: CadEntities;
  private entitiesNotToMove?: CadEntities;
  private entitiesNeedRender = false;

  collection = this.status.collection;

  ngOnInit() {
    this.updateData();

    const cad = this.status.cad;
    cad.on("pointerdown", this._onPointerDown);
    cad.on("pointermove", this._onPointerMove);
    cad.on("pointerup", this.onPointerUp);
  }
  ngOnDestroy() {
    const cad = this.status.cad;
    cad.off("pointerdown", this._onPointerDown);
    cad.off("pointermove", this._onPointerMove);
    cad.off("pointerup", this.onPointerUp);
  }

  openCadOptionsEff = effect(() => {
    this.status.openCadOptions();
    this.updateData();
  });

  private _onPointerDown: CadEventCallBack<"pointerdown"> = (event) => {
    const {clientX, clientY, shiftKey, button} = event;
    if (this.config.getConfig("dragAxis") !== "" || (button !== 1 && !(shiftKey && button === 0))) {
      return;
    }
    this.lastPointer = new Point(clientX, clientY);
    this.entitiesToMove = new CadEntities();
    this.entitiesNotToMove = new CadEntities();
    const components = this.status.components.selected();
    components.forEach((v) => this.entitiesToMove?.merge(v.getAllEntities()));
    const ids: string[] = [];
    this.entitiesToMove.forEach((e) => ids.push(e.id));
    this.status.cad.data.getAllEntities().forEach((e) => {
      if (!ids.includes(e.id)) {
        this.entitiesNotToMove?.add(e);
      }
    });
  };

  private _onPointerMove: CadEventCallBack<"pointermove"> = (event) => {
    if (!this.lastPointer) {
      return;
    }
    const {clientX, clientY} = event;
    const cad = this.status.cad;
    const components = this.status.components.selected();
    const pointer = new Point(clientX, clientY);
    const translate = this.lastPointer.sub(pointer).divide(cad.zoom());
    translate.x = -translate.x;
    if (components.length) {
      components.forEach((v) => {
        cad.data.moveComponent(v, translate, false);
      });
      this.entitiesNeedRender = true;
    } else if (this.entitiesToMove && this.entitiesNotToMove) {
      cad.moveEntities(this.entitiesToMove, this.entitiesNotToMove, translate.x, translate.y);
      this.entitiesNeedRender = true;
    }
    this.lastPointer.copy(pointer);
  };

  private onPointerUp: CadEventCallBack<"pointerup"> = () => {
    if (this.lastPointer) {
      this.lastPointer = null;
      if (this.entitiesNeedRender) {
        this.status.cad.render();
      }
    }
  };

  private _getCadNode(data: CadData) {
    const node: CadNode = {data, checked: false};
    return node;
  }

  componentsSelectable = this.status.components.selectable;
  componentsMultiSelect = this.status.components.multiSelect;
  toggleComponentsMultiSelect() {
    this.componentsMultiSelect.update((v) => !v);
    if (!this.componentsMultiSelect()) {
      const selectedComponents = this.status.components.selected();
      if (selectedComponents.length > 1) {
        this.status.components.selected.set([selectedComponents[0]]);
      }
    }
  }

  components = signal<CadData[]>([]);
  componentsSelected = this.status.components.selected;
  componentsExpanded = signal(true);
  selectComponent(index: number) {
    if (!this.componentsSelectable()) {
      return;
    }
    const data = this.components()[index];
    const componentsSelected = this.componentsSelected();
    if (componentsSelected.includes(data)) {
      this.componentsSelected.set(difference(componentsSelected, [data]));
    } else {
      if (this.componentsMultiSelect()) {
        this.componentsSelected.set(union(componentsSelected, [data]));
      } else {
        this.componentsSelected.set([data]);
      }
    }
  }
  selectAllComponents() {
    const list1 = this.componentsSelected();
    const list2 = this.status.cad.data.components.data;
    if (list1.length === list2.length) {
      this.status.components.selected.set([]);
    } else {
      this.status.components.selected.set(list2);
    }
  }
  selectedComponentsEff = effect(() => {
    if (this.status.hasOtherCadStatus((v) => v instanceof CadStatusNormal || v instanceof CadStatusAssemble)) {
      return;
    }
    const componentsSelected = this.componentsSelected();
    const cad = this.status.cad;
    if (componentsSelected.length < 1) {
      this.status.focus();
      this.config.setConfig("dragAxis", "xy");
    } else {
      this.status.blur();
      this.config.setConfig("dragAxis", "");
      this.components().forEach((v) => {
        if (componentsSelected.some((vv) => vv.id === v.id)) {
          this.status.focus(v.getAllEntities());
        }
      });
    }
    cad.render();
  });

  updateData() {
    const cad = this.status.cad;
    this.main.set(this._getCadNode(cad.data));
    this.components.set(cad.data.components.data.slice());
    this.componentsExpanded.set(this.components().length > 0);
    this.status.components.selected.set([]);
    this.updateKailiaoInfo();
  }

  onContextMenu(data: CadData, field: ContextMenuCadField) {
    if (!this.componentsSelectable) {
      return;
    }
    this.contextMenuCad = {field, data};
  }

  async fetchComponentCads(data: CadData, custom?: boolean) {
    let sourceData: CadData[] | undefined;
    if (custom) {
      const query = {id: "", 名字: ""};
      const form: InputInfo[] = [];
      const getter = new InputInfoWithDataGetter(query, {
        onChange: (_, info) => {
          for (const info2 of form) {
            if (info2.label !== info.label) {
              info2.forceValidateNum = (info2.forceValidateNum || 0) + 1;
            }
          }
        },
        validators: () => {
          const values = Object.values(query);
          if (values.every((v) => !v)) {
            return {查询不能为空: true};
          }
          return null;
        }
      });
      form.push(getter.string("id"), getter.string("名字"));
      const result = await this.message.form(form);
      if (!result) {
        return sourceData;
      }
      let search: ObjectOf<any>;
      if (query.id) {
        search = {_id: query.id};
      } else {
        search = {...query};
        delete search.id;
      }
      sourceData = (await this.http.getCad({collection: "cad", search}, {silent: true})).cads;
      return sourceData;
    }
    const specials: {type: string; options: string[]}[] = [
      {type: "罗马头模板", options: ["罗马头", "罗马柱"]},
      {type: "套门模板", options: ["套门"]}
    ];
    for (const {type, options} of specials) {
      if (data.type !== type) {
        continue;
      }
      const optionValues: ObjectOf<string> = {};
      for (const option of options) {
        const value = data.options[option];
        if (value) {
          optionValues[option] = value;
        }
      }
      const optionsDiff = difference(options, Object.keys(data.options));
      if (optionsDiff.length > 0) {
        this.message.error(`${type}缺少选项：${optionsDiff.join("，")}`);
        return;
      }
      const result = await this.http.getCad({collection: "cad", options: optionValues, optionsMatchType: "or"}, {silent: true});
      sourceData = result.cads;
      break;
    }
    if (!sourceData) {
      const result = await this.http.getData<any[]>(
        "ngcad/getMenshanbujuCads",
        {
          xinghao: data.options.型号,
          flat: true,
          isMuban: true
        },
        {silent: true}
      );
      if (result) {
        sourceData = result.map((v) => new CadData(v));
      }
    }
    return sourceData;
  }

  async editComponents(custom?: boolean) {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.contextMenuCad.data;
    const checkedItems = data.components.data.map((v) => v.id);
    const qiliao = this.status.collection() === "qiliaozuhe";
    const feilei = [
      "铰框",
      "锁框",
      "顶框",
      "边铰料",
      "边锁料",
      "中铰料",
      "中锁料",
      "小铰料",
      "小锁料",
      "锁企料",
      "扇锁企料",
      "示意图",
      "装配示意图",
      "包边正面"
    ];
    let cads: Awaited<ReturnType<typeof openCadListDialog>>;
    const sourceData = await this.fetchComponentCads(data, custom);
    if (Array.isArray(sourceData)) {
      let source: CadData[] | undefined;
      if (sourceData.length > 0 || custom) {
        source = sourceData.map((v) => new CadData(v));
      }
      const where = `
      function fn() {
        var 选项 = ${JSON.stringify(data.options)};
        var matchOptionsFn = ${matchOptionsFn};
        return matchOptionsFn(选项, this.选项);
      }
      `;
      cads = await openCadListDialog(this.dialog, {
        data: {
          selectMode: "multiple",
          checkedItems,
          collection: "cad",
          qiliao,
          search: {
            _id: {$ne: data.id},
            分类: {$not: {$in: feilei}},
            $where: where
          },
          source
        }
      });
    } else {
      return;
    }
    const shouldReplace = (cad1: CadData, cad2: CadData) => cad1.id === cad2.id;
    if (Array.isArray(cads)) {
      const components = data.components.data;
      const timerName = "sub-cads-editChildren";
      timer.start(timerName);
      const rect1 = data.entities.getBoundingRect();
      for (const cad of cads) {
        const length = components.length;
        let shouldPush = true;
        for (let i = 0; i < length; i++) {
          if (shouldReplace(components[i], cad)) {
            components[i] = cad;
            shouldPush = false;
            break;
          }
        }
        if (shouldPush) {
          setCadData(cad, this.status.project, this.status.collection(), this.config.getConfig());
          const rect2 = cad.getBoundingRect();
          const translate = new Point(rect1.x - rect2.x, rect1.y - rect2.y);
          const matrix = new Matrix();
          if (Math.abs(translate.x) > 1500 || Math.abs(translate.y) > 1500) {
            translate.x += (rect1.width + rect2.width) / 2 + 15;
            matrix.transform({translate});
          }
          cad.transform(matrix, true);
          components.push(cad);
        }
      }
      let timerContent = "";
      data.updateComponents();
      timerContent = "编辑装配CAD";
      const resData = this.status.closeCad();
      await this.status.openCad({data: resData});
      timer.end(timerName, timerContent);
    }
  }

  downloadDxf() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    this.http.downloadDxf(data);
  }

  async uploadDxf(append: boolean, mainCad: boolean) {
    const files = await selectFiles({accept: ".dxf"});
    const file = files?.[0];
    if (!this.contextMenuCad || !file) {
      return;
    }
    const data = this.contextMenuCad.data;
    if (append) {
      const resData = await this.http.uploadDxf(file);
      if (resData) {
        const rect1 = data.getBoundingRect();
        const rect2 = resData.entities.getBoundingRect();
        if (rect1.isFinite && rect2.isFinite) {
          const dx = rect1.right + 10 - rect2.left;
          const dy = rect1.y - rect2.y;
          resData.entities.transform({translate: [dx, dy]}, true);
        }
        data.entities.merge(resData.entities);
        data.blocks = resData.blocks;
        await this.status.openCad();
      }
    } else {
      const success = await uploadAndReplaceCad(file, data, !!mainCad, this.message, this.http);
      if (success) {
        await this.status.openCad();
      }
    }
  }

  getJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    this.message.copyText(JSON.stringify(data.export()), {successText: "内容已复制"});
  }

  async setJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.contextMenuCad.data;
    const json = await navigator.clipboard.readText();
    if (!json) {
      this.message.alert("内容为空");
      return;
    }
    let obj: any;
    try {
      obj = JSON.parse(json);
    } catch {
      this.message.alert("内容不是有效的JSON");
    }
    obj.id = data.id;
    data.import(obj);
    this.status.openCad();
  }

  async downloadJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    downloadByString(JSON.stringify(data.export()), {filename: `${data.name}.json`});
  }

  async editJson() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.status.closeCad(this.contextMenuCad.data);
    const result = await this.message.json(this.dialog, data.export());
    if (result) {
      result.id = this.contextMenuCad.data.id;
      this.contextMenuCad.data.import(result);
      this.status.openCad();
    }
  }

  async deleteSelectedComponents() {
    const data = this.status.cad.data;
    const ids = this.status.components.selected().map((v) => v.id);
    data.components.data = data.components.data.filter((v) => !ids.includes(v.id));
    this.status.openCad();
  }

  async replaceData() {
    if (!this.contextMenuCad) {
      return;
    }
    const data = this.contextMenuCad.data;
    const cads = await openCadListDialog(this.dialog, {data: {selectMode: "single", options: data.options, collection: "cad"}});
    if (cads && cads[0]) {
      this.http.replaceData(data, cads[0].id, this.status.collection());
    }
  }

  imgCadEmpty = imgCadEmpty;
  mubanYaoqiu = computed(() => {
    const yaoqiu = new Cad数据要求({vid: 1, mingzi: "激光开料模板"});
    yaoqiu.CAD弹窗修改属性.push({key: "选项", cadKey: "options"});
    yaoqiu.选中CAD要求.push({key: "选项", remove: true});
    return yaoqiu;
  });
  mubansMap = new Map<string, CadData>();
  async fetchMubans(ids: string[], force?: boolean) {
    if (!force) {
      ids = ids.filter((v) => !this.mubansMap.has(v));
    }
    if (ids.length < 1) {
      return;
    }
    const result = await this.http.getCad({collection: "kailiaocadmuban", ids, fields: getCadQueryFields(this.mubanYaoqiu())});
    const kailiaoInfo = this.kailiaoInfo();
    for (const muban of result.cads) {
      const mubanInfo = kailiaoInfo.mubans.find((v) => v.id === muban.id);
      if (mubanInfo) {
        muban.options = {...mubanInfo.options};
      }
      this.mubansMap.set(muban.id, muban);
    }
  }

  kailiaoInfo = signal<{mubans: {id: string; weiyima?: string; options: CadData["options"]}[]}>({mubans: []});
  private _updateKailiaoInfoLock$ = new BehaviorSubject(false);
  async updateKailiaoInfo() {
    if (this._updateKailiaoInfoLock$.value) {
      await lastValueFrom(this._updateKailiaoInfoLock$.pipe(filter((v) => !v)));
    }
    this._updateKailiaoInfoLock$.next(true);
    const data = this.status.cad.data;
    let kailiaoInfo: ReturnType<typeof this.kailiaoInfo> = {mubans: []};
    if (data.info.kailiaoInfo) {
      kailiaoInfo = cloneDeep(data.info.kailiaoInfo);
    }
    this.kailiaoInfo.set(kailiaoInfo);

    const kailiaoMubanInfos: ReturnType<typeof this.kailiaoMubanInfos> = [];
    const ids: string[] = [];
    for (const muban of kailiaoInfo.mubans) {
      if (muban.id) {
        ids.push(muban.id);
      }
    }
    await this.fetchMubans(ids);
    for (const muban of kailiaoInfo.mubans) {
      const mubanData = this.mubansMap.get(muban.id) || new CadData();
      kailiaoMubanInfos.push({
        data: mubanData,
        cadForm: {
          onEdit: (component) => {
            const {index} = component.customInfo();
            this.editKailiaoMubanInfo(index);
          }
        }
      });
    }
    this.kailiaoMubanInfos.set(kailiaoMubanInfos);
    this._updateKailiaoInfoLock$.next(false);
  }
  setKailiaoInfo(info: ReturnType<typeof this.kailiaoInfo>) {
    const data = this.status.cad.data;
    data.info.kailiaoInfo = info;
    this.updateKailiaoInfo();
  }

  showKailiaoMubanInfos = computed(() => {
    const collection = this.status.collection();
    const skipCollections: CadCollection[] = ["CADmuban", "kailiaocadmuban"];
    return !skipCollections.includes(collection);
  });
  kailiaoMubanInfos = signal<{data: CadData; cadForm: CadItemForm<MubanCadItemInfo>}[]>([]);
  mubanCadButtons = computed(() => {
    const buttons: CadItemButton<MubanCadItemInfo>[] = [];
    buttons.push(
      {
        name: "打开",
        onClick: (component) => {
          const {index} = component.customInfo();
          const info = this.kailiaoInfo();
          const id = info.mubans[index].id;
          this.status.openCadInNewTab(id, "kailiaocadmuban");
        }
      },
      {
        name: "删除",
        onClick: (component) => {
          const {index} = component.customInfo();
          this.removeKailiaoMubanInfo(index);
        }
      }
    );
    return buttons;
  });
  async addKailiaoMubanInfo() {
    const kailiaoInfo = this.kailiaoInfo();
    const checkedItems = kailiaoInfo.mubans.map((v) => v.id);
    const result = await openCadListDialog(this.dialog, {data: {selectMode: "multiple", collection: "kailiaocadmuban", checkedItems}});
    if (result) {
      kailiaoInfo.mubans = [];
      for (const data of result) {
        data.options = {};
        this.mubansMap.set(data.id, data);
        kailiaoInfo.mubans.push({id: data.id, weiyima: data.info.唯一码, options: {}});
      }
      this.setKailiaoInfo(kailiaoInfo);
    }
  }
  async removeKailiaoMubanInfo(index: number) {
    const kailiaoInfo = this.kailiaoInfo();
    const id = kailiaoInfo.mubans[index].id;
    const data = this.mubansMap.get(id);
    if (!(await this.message.confirm(`是否确定删除${getNamesStr([data?.name || ""])}？`))) {
      return;
    }
    if (data) {
      this.mubansMap.delete(id);
    }
    kailiaoInfo.mubans = kailiaoInfo.mubans.filter((_, i) => i !== index);
    this.setKailiaoInfo(kailiaoInfo);
  }
  async editKailiaoMubanInfo(index: number) {
    const kailiaoInfo = this.kailiaoInfo();
    const id = kailiaoInfo.mubans[index].id;
    const dataRaw = this.mubansMap.get(id);
    if (!dataRaw) {
      return;
    }
    const data = dataRaw.clone();
    const mubanInfo = kailiaoInfo.mubans[index];
    data.options = mubanInfo.options;
    const yaoqiu = this.mubanYaoqiu();
    const form = await getCadInfoInputs2(yaoqiu, "set", "kailiaocadmuban", data, this.http, this.dialog, this.status, false);
    const result = await this.message.form(form);
    if (result) {
      dataRaw.options = data.options;
      mubanInfo.options = {...data.options};
      this.setKailiaoInfo(kailiaoInfo);
    }
  }
}
