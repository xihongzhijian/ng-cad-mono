import {KeyValuePipe} from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {getValueString, imgCadEmpty} from "@app/app.common";
import {CadPreviewRawParams, getCadPreview} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {exportCadData, generateLineTexts2, openCadDimensionForm, openCadLineForm} from "@app/cad/utils";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadData, CadDimensionLinear, CadLineLike, CadMtext, CadViewer, CadZhankai} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf, selectFiles} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {cadFields, getCadInfoInputs} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import {isEmpty} from "lodash";
import {BehaviorSubject} from "rxjs";
import {openFentiCadDialog} from "../fenti-cad-dialog/fenti-cad-dialog.component";
import {FentiCadDialogInput} from "../fenti-cad-dialog/fenti-cad-dialog.types";
import {Cad数据要求} from "../xinghao-data";
import {CadItemButton, typeOptions} from "./cad-item.types";

@Component({
  selector: "app-cad-item",
  standalone: true,
  imports: [InputComponent, KeyValuePipe, MatButtonModule, MatIconModule],
  templateUrl: "./cad-item.component.html",
  styleUrl: "./cad-item.component.scss"
})
export class CadItemComponent<T = undefined> extends Subscribed() implements OnChanges, OnDestroy {
  @Input() cadWidth = 360;
  cadHeight = 0;

  @HostBinding("style") style = {};

  @Input({required: true}) cad: HoutaiCad = getHoutaiCad();
  @Input({required: true}) buttons: CadItemButton<T>[] = [];
  @Input() buttons2: CadItemButton<T>[] = [];
  @Input({required: true}) customInfo!: T;
  @Input({required: true}) shujuyaoqiu: Cad数据要求 | undefined;
  @Input() fentiDialogInput?: FentiCadDialogInput;
  @Input() mubanExtraData: Partial<CadData> = {};
  @Input() openCadOptions?: OpenCadOptions;
  @Input() noMuban?: boolean;
  @Output() afterEditCad = new EventEmitter<void>();

  @ViewChild("cadContainer") cadContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("mubanContainer") mubanContainer?: ElementRef<HTMLDivElement>;
  @ViewChildren(InputComponent) inputComponents?: QueryList<InputComponent>;
  cadViewer?: CadViewer;
  mubanViewer?: CadViewer;
  mubanData?: CadData;
  imgCadEmpty = imgCadEmpty;
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

  mubanInputs: InputInfo[][] = [];
  showMuban: boolean;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    private status: AppStatusService,
    private config: AppConfigService
  ) {
    super();
    this.showMuban = status.projectConfig.getBoolean("新版本做数据可以做激光开料");
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.cad) {
      setTimeout(() => {
        this.update(false);
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.cadViewer?.destroy();
    this.mubanViewer?.destroy();
  }

  updateStyle() {
    this.style = {
      "--cad-preview-width": `${this.cadWidth}px`,
      "--cad-preview-height": `${this.cadHeight}px`
    };
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
      for (const e of cadData.entities.dimension) {
        e.calcBoundingRect = true;
      }
      Object.assign(cad, getHoutaiCad(cadData));
      this.initCadViewer(true);
      this.afterEditCad.emit();
    }
  }

  async editCadForm() {
    const {cad} = this;
    if (!cad) {
      return;
    }
    const ignoreKeys = ["entities"];
    const dataRaw: ObjectOf<any> = {};
    for (const key in cad.json) {
      if (!ignoreKeys.includes(key)) {
        dataRaw[key] = cad.json[key];
      }
    }
    const data = new CadData(dataRaw);
    const form = getCadInfoInputs(this.shujuyaoqiu?.CAD弹窗修改属性 || [], data, this.dialog, this.status);
    const result = await this.message.form(form);
    if (result) {
      const cad2 = getHoutaiCad(data);
      for (const key of keysOf(cad2)) {
        if (key === "json") {
          for (const key2 in cad2.json) {
            if (!ignoreKeys.includes(key2)) {
              cad.json[key2] = cad2.json[key2];
            }
          }
        } else {
          cad[key] = cad2[key] as any;
        }
      }
    }
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
    this.initMubanViewer(true);
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
      this.initMubanViewer(true);
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
      this.initMubanViewer(true);
    }
  }

  update(updateImg: boolean) {
    delete this.mubanData;
    this.initCadViewer(updateImg);
    this.initMubanViewer(updateImg);
    this.updateStyle();
  }

  initCadViewer0(
    collection: CadCollection,
    cad: HoutaiCad | CadData,
    containerEl: HTMLDivElement,
    updateImg: boolean,
    afterDblClickForm: (data: CadData) => void
  ) {
    const width = this.cadWidth;
    const height = (width / 300) * 150;
    this.cadHeight = height;
    const cadViewerSubject = new BehaviorSubject<CadViewer | undefined>(undefined);
    const getPreviewParams: CadPreviewRawParams = {
      ignoreShiyitu: true,
      config: {
        width,
        height,
        backgroundColor: "black",
        enableZoom: false,
        dragAxis: "xy",
        selectMode: "single",
        entityDraggable: false,
        lineGongshi: 24,
        hideLineGongshi: false,
        padding: [5]
      }
    };
    const init = () => {
      const cadViewer = new CadViewer(data, getPreviewParams.config);
      cadViewer.appendTo(containerEl);
      cadViewer.on("entitydblclick", async (_, entity) => {
        if (entity instanceof CadMtext && entity.parent) {
          entity = entity.parent;
        }
        if (entity instanceof CadLineLike) {
          const result = await openCadLineForm(collection, this.message, cadViewer, entity);
          if (result) {
            afterDblClickForm(data);
          }
        } else if (entity instanceof CadDimensionLinear) {
          const dimension2 = await openCadDimensionForm(collection, this.message, cadViewer, entity);
          if (dimension2) {
            afterDblClickForm(data);
          }
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
      cadViewerSubject.next(cadViewer);
    };
    let data: CadData;
    if (cad instanceof CadData) {
      data = cad;
    } else {
      data = new CadData(cad.json);
      generateLineTexts2(data);
    }
    if (this.showCadViewer) {
      containerEl.innerHTML = "";
      init();
    } else {
      (async () => {
        if (this.config.getConfig("forceUpdateCadItemImg")) {
          updateImg = true;
        }
        const imgId = data.info.imgId;
        let img: string | null = null;
        let onError: OnErrorEventHandler = null;
        const setCadImg = (id: string, img: string) => this.http.setCadImg(id, img, {silent: true});
        if (imgId) {
          if (updateImg) {
            img = await getCadPreview(collection, data, getPreviewParams);
            setCadImg(imgId, img);
          } else {
            img = this.http.getCadImgUrl(imgId);
          }
        } else {
          if (cad instanceof CadData) {
            img = this.http.getCadImgUrl(cad.id);
            onError = async function (this: HTMLImageElement) {
              const img2 = await getCadPreview(collection, data, getPreviewParams);
              setCadImg(cad.id, img2);
            };
          }
          if (!img) {
            img = await getCadPreview(collection, data, getPreviewParams);
            const imgId2 = await this.http.getMongoId({silent: true});
            if (imgId2) {
              data.info.imgId = imgId2;
              if (!(cad instanceof CadData)) {
                if (!cad.json.info) {
                  cad.json.info = {};
                }
                cad.json.info.imgId = imgId2;
              }
              setCadImg(imgId2, img);
            }
          }
        }
        const imgEl = document.createElement("img");
        imgEl.src = img;
        imgEl.onerror = onError;
        imgEl.classList.add("cad-preview");
        containerEl.innerHTML = "";
        containerEl.appendChild(imgEl);
        imgEl.addEventListener("dblclick", () => {
          containerEl.innerHTML = "";
          this.showCadViewer = true;
          init();
        });
      })();
    }
    return cadViewerSubject;
  }

  initCadViewer(updateImg: boolean) {
    this.cadViewer?.destroy();
    const {cad, cadContainer} = this;
    if (!cad || !cadContainer) {
      return;
    }
    const containerEl = cadContainer.nativeElement;
    const cadViewerSubject = this.initCadViewer0("cad", cad, containerEl, updateImg, (data) => {
      cad.json.entities = exportCadData(data, true).entities;
    });
    this.subscribe(cadViewerSubject, (cadViewer) => {
      this.cadViewer = cadViewer;
    });
  }

  async initMubanViewer(updateImg: boolean) {
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
    const cadViewerSubject = this.initCadViewer0("kailiaocadmuban", mubanData, containerEl, updateImg, () => {
      this.http.setCad({collection: "kailiaocadmuban", cadData: mubanData, force: true}, true);
    });
    this.subscribe(cadViewerSubject, (cadViewer) => {
      this.mubanViewer = cadViewer;
    });
    await this.updateMubanInputs();
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
    this.update(true);
  }

  removeZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i, 1);
    this.update(true);
  }

  returnZero() {
    return 0;
  }

  async selectFentiCad() {
    const {fentiDialogInput} = this;
    if (!fentiDialogInput) {
      return;
    }
    await openFentiCadDialog(this.dialog, {data: fentiDialogInput});
  }

  validate() {
    const inputs = this.inputComponents?.toArray() || [];
    if (inputs.some((v) => !isEmpty(v.validateValue()))) {
      return false;
    } else {
      return true;
    }
  }

  getCadInfoStr(key: string) {
    if (key in cadFields) {
      const key2 = cadFields[key as keyof typeof cadFields];
      return getValueString(this.cad.json[key2], "\n", "：");
    } else if (key === "展开信息") {
      const {cad} = this;
      if (cad?.json?.zhankai && cad.json.zhankai[0]) {
        const zhankai = cad.json.zhankai[0];
        return `${zhankai.zhankaikuan} × ${zhankai.zhankaigao} = ${zhankai.shuliang}`;
      }
    }
    return "";
  }
}
