import {KeyValuePipe} from "@angular/common";
import {Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {CadCollection} from "@app/cad/collections";
import {cadOptions} from "@app/cad/options";
import {exportCadData, openCadLineInfoForm} from "@app/cad/utils";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadData, CadLineLike, CadMtext, CadViewer, CadZhankai, generateLineTexts} from "@lucilor/cad-viewer";
import {ObjectOf, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import {CadItemButton, typeOptions} from "./cad-item.types";

@Component({
  selector: "app-cad-item",
  standalone: true,
  imports: [InputComponent, KeyValuePipe, MatButtonModule, MatIconModule],
  templateUrl: "./cad-item.component.html",
  styleUrl: "./cad-item.component.scss"
})
export class CadItemComponent<T = undefined> implements OnChanges, OnDestroy {
  @Input() cadWidth = 360;
  cadHeight = 0;
  @Input({required: true}) cad: HoutaiCad = getHoutaiCad();
  @Input({required: true}) buttons: CadItemButton<T>[] = [];
  @Input({required: true}) customInfo: T = undefined as T;
  @Input() fentiCads?: ObjectOf<HoutaiCad | null | undefined>;
  @Input() mubanExtraData: Partial<CadData> = {};
  @Input() openCadOptions?: OpenCadOptions;
  @Input() noMuban?: boolean;
  @Input() noZhankai?: boolean;
  @Output() afterEditCad = new EventEmitter<void>();

  @ViewChild("cadContainer") cadContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("mubanContainer") mubanContainer?: ElementRef<HTMLDivElement>;
  cadViewer?: CadViewer;
  mubanViewer?: CadViewer;
  mubanData?: CadData;
  get mubanId() {
    return this.cad?.json?.zhankai?.[0]?.kailiaomuban || "";
  }
  set mubanId(value: string) {
    const {cad} = this;
    if (!cad) {
      return;
    }
    if (!cad.json) {
      cad.json = {};
    }
    if (!cad.json.zhankai) {
      cad.json.zhankai = [];
    }
    if (!cad.json.zhankai[0]) {
      cad.json.zhankai[0] = {};
    }
    cad.json.zhankai[0].kailiaomuban = value;
  }

  cadInputs: InputInfo[][] = [];
  zhankaiInputs: {width: InputInfo; height: InputInfo; num: InputInfo}[] = [];
  mubanInputs: InputInfo[][] = [];
  showMuban: boolean;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    status: AppStatusService
  ) {
    this.showMuban = status.projectConfig.getBoolean("新版本做数据可以做激光开料");
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.cad) {
      setTimeout(() => {
        this.update();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.cadViewer?.destroy();
    this.mubanViewer?.destroy();
  }

  centerCad() {
    this.cadViewer?.center();
  }

  async editCad() {
    const {cad} = this;
    if (!cad) {
      return;
    }
    const cadData = new CadData(cad.json);
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        data: cadData,
        center: true,
        isLocal: true,
        ...this.openCadOptions
      }
    });
    if (result?.isSaved) {
      Object.assign(cad, getHoutaiCad(cadData), {_id: cad._id});
      this.initCadViewer();
      this.afterEditCad.emit();
    }
  }

  async editCadName() {
    const {cad} = this;
    if (!cad) {
      return;
    }
    const name = await this.message.prompt({
      type: "string",
      label: "CAD名字",
      value: cad.名字,
      validators: Validators.required
    });
    if (!name) {
      return;
    }
    cad.名字 = name;
    cad.json.name = name;
  }

  centerMuban() {
    this.mubanViewer?.center();
  }

  async uploadMuban() {
    const files = await selectFiles({accept: ".dxf"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const cadData = await this.http.uploadDxf(file);
    if (!cadData) {
      return;
    }
    const {cad, mubanId, mubanExtraData} = this;
    if (mubanId) {
      cadData.id = mubanId;
    }
    cadData.name = cad?.名字 || "模板";
    cadData.type = typeOptions[0];
    if (mubanExtraData) {
      Object.assign(cadData, mubanExtraData);
    }
    const result = await this.http.setCad({collection: "kailiaocadmuban", cadData, force: true}, true);
    if (!result) {
      return;
    }
    this.mubanId = result.id;
    this.mubanData = result;
    this.initMubanViewer();
  }

  async editMuban() {
    const {mubanData} = this;
    if (!mubanData) {
      return;
    }
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        data: mubanData,
        center: true,
        collection: "kailiaocadmuban",
        ...this.openCadOptions
      }
    });
    if (result?.isSaved) {
      this.initMubanViewer();
    }
  }

  async removeMuban() {
    const {mubanData} = this;
    if (!mubanData) {
      return;
    }
    if (!(await this.message.confirm(`确定删除模板【${mubanData.name}】吗？`))) {
      return;
    }
    if (await this.http.mongodbDelete("kailiaocadmuban", {id: mubanData.id})) {
      this.mubanId = "";
      this.mubanData = undefined;
      this.initMubanViewer();
    }
  }

  update() {
    delete this.mubanData;
    this.initCadViewer();
    this.initMubanViewer();
  }

  initCadViewer0(collection: CadCollection, data: CadData, containerEl: HTMLDivElement, afterDblClickForm: () => void) {
    const width = this.cadWidth;
    const height = (width / 300) * 150;
    this.cadHeight = height;
    const cadViewer = new CadViewer(data, {
      width,
      height,
      backgroundColor: "black",
      enableZoom: false,
      dragAxis: "xy",
      selectMode: "single",
      entityDraggable: false,
      lineGongshi: 24
    });
    cadViewer.appendTo(containerEl);
    cadViewer.on("entitydblclick", async (_, entity) => {
      if (entity instanceof CadMtext && entity.parent) {
        entity = entity.parent;
      }
      if (!(entity instanceof CadLineLike)) {
        return;
      }
      const result = await openCadLineInfoForm(collection, this.message, cadViewer, entity);
      if (result) {
        afterDblClickForm();
      }
    });
    cadViewer.on("click", () => {
      cadViewer.setConfig("enableZoom", true);
    });
    cadViewer.on("pointerleave", () => {
      cadViewer.setConfig("enableZoom", false);
    });
    setTimeout(() => {
      cadViewer.center();
    }, 0);
    return cadViewer;
  }

  initCadViewer() {
    this.cadViewer?.destroy();
    const {cad, cadContainer} = this;
    if (!cad || !cadContainer) {
      return;
    }
    const containerEl = cadContainer.nativeElement;
    containerEl.innerHTML = "";
    const data = new CadData(cad.json);
    generateLineTexts(data);
    const cadViewer = this.initCadViewer0("cad", data, containerEl, () => {
      cad.json = exportCadData(data, true);
    });
    this.cadViewer = cadViewer;
    this.updateCadInputs();
    this.updateZhankaiInputs();
  }

  async initMubanViewer() {
    this.mubanViewer?.destroy();
    if (!this.showMuban) {
      return;
    }
    const {cad, mubanContainer, mubanId} = this;
    let {mubanData} = this;
    if (!cad || !mubanContainer) {
      return;
    }
    if (!mubanData && mubanId) {
      const resultData = await this.http.getCad({collection: "kailiaocadmuban", id: mubanId}, {silent: true});
      mubanData = resultData?.cads[0];
      this.mubanData = mubanData;
    }
    if (!mubanData) {
      this.mubanId = "";
      return;
    }
    const containerEl = mubanContainer.nativeElement;
    containerEl.innerHTML = "";
    generateLineTexts(mubanData);
    const cadViewer = this.initCadViewer0("CADmuban", mubanData, containerEl, () => {});
    this.mubanViewer = cadViewer;
    await this.updateMubanInputs();
  }

  updateCadInputs() {
    const json = this.cad?.json;
    if (!json) {
      return;
    }
    this.cadInputs = [
      [
        {
          type: "select",
          label: "算料处理",
          model: {data: json, key: "suanliaochuli"},
          options: cadOptions.suanliaochuli.values.slice()
        },
        {
          type: "select",
          label: "算料单显示",
          model: {data: json, key: "suanliaodanxianshi"},
          options: cadOptions.suanliaodanxianshi.values.slice()
        }
      ]
    ];
  }

  updateZhankaiInputs() {
    const json = this.cad?.json;
    if (!json) {
      return;
    }
    if (!Array.isArray(json.zhankai)) {
      json.zhankai = [];
    }
    const zhankais = json.zhankai;
    this.zhankaiInputs = [];
    if (zhankais.length < 1) {
      zhankais.push(new CadZhankai({name: json.name}).export());
    }
    for (const zhankai of zhankais) {
      this.zhankaiInputs.push({
        width: {type: "string", label: "宽", model: {data: zhankai, key: "zhankaikuan"}},
        height: {type: "string", label: "高", model: {data: zhankai, key: "zhankaigao"}},
        num: {type: "string", label: "数量", model: {data: zhankai, key: "shuliang"}}
      });
    }
  }

  async updateMubanInputs() {
    this.mubanInputs = [];
    const {cad, mubanData} = this;
    if (!cad || !mubanData) {
      return;
    }
    if (!cad.json) {
      cad.json = {};
    }
    if (!cad.json.zhankai) {
      cad.json.zhankai = [];
    }
    if (!cad.json.zhankai[0]) {
      cad.json.zhankai[0] = {};
    }
    const zhankai = cad.json.zhankai[0];
    if (!zhankai.flip || !zhankai.flip[0]) {
      zhankai.flip = [{chanpinfenlei: "", fanzhuanfangshi: "", kaiqi: ""}];
    }
    const flip = zhankai.flip[0];
    const updateMuban = async (silent?: boolean) => {
      return await this.http.setCad(
        {collection: "kailiaocadmuban", cadData: mubanData, force: true},
        true,
        silent ? {silent: true} : {spinner: false}
      );
    };
    if (!mubanData.type) {
      mubanData.type = typeOptions[0];
      await updateMuban(true);
    }
    this.mubanInputs = [
      [
        {
          type: "select",
          label: "翻转",
          model: {data: flip, key: "fanzhuanfangshi"},
          options: [
            {label: "无", value: ""},
            {label: "水平翻转", value: "h"},
            {label: "垂直翻转", value: "v"}
          ]
        },
        {
          type: "select",
          label: "分类",
          model: {data: mubanData, key: "type"},
          options: typeOptions.map((v) => ({
            label: v.replace("+模板", ""),
            value: v
          })),
          onChange: async () => {
            const result = await updateMuban();
            if (result) {
              this.message.snack("已保存");
            }
          }
        }
      ]
    ];
  }

  addZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i + 1, 0, new CadZhankai().export());
    this.update();
  }

  removeZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i, 1);
    this.update();
  }

  returnZero() {
    return 0;
  }

  async selectFentiCad() {
    const {fentiCads} = this;
    if (!fentiCads) {
      return;
    }
    const search: ObjectOf<any> = {分类: "企料分体"};
    const keys = Object.keys(fentiCads);
    const checkedItems = Object.values(fentiCads)
      .map((v) => v?._id || "")
      .filter(Boolean);
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "multiple",
        checkedItems,
        checkedItemsLimit: keys.length,
        collection: "cad",
        search,
        addCadData: search,
        hideCadInfo: true
      }
    });
    if (!result || !result.length) {
      return;
    }
    for (const [i, key] of keys.entries()) {
      fentiCads[key] = getHoutaiCad(result[i]);
    }
  }

  async clearFentiCads() {
    const {fentiCads} = this;
    if (!fentiCads) {
      return;
    }
    if (!(await this.message.confirm("确定清空分体CAD吗？"))) {
      return;
    }
    for (const key in fentiCads) {
      fentiCads[key] = null;
    }
  }
}
