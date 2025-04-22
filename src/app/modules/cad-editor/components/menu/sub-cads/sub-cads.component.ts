import {ChangeDetectionStrategy, Component, effect, forwardRef, inject, OnDestroy, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTooltipModule} from "@angular/material/tooltip";
import {timer} from "@app/app.common";
import {setCadData} from "@app/cad/cad-data-transform";
import {uploadAndReplaceCad} from "@app/cad/utils";
import {matchOptionsFn} from "@app/utils/mongo";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
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
import {difference, union} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";

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
    ContextMenuModule,
    forwardRef(() => CadImageComponent),
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
    NgScrollbar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
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
}
