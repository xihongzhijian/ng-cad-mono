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
import {getValueString} from "@app/app.common";
import {CadPreviewParams} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {exportCadData, generateLineTexts2, openCadDimensionForm, openCadLineForm} from "@app/cad/utils";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {DataInfoChnageEvent} from "@components/cad-image/cad-image.types";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadData, CadDimensionLinear, CadLineLike, CadMtext, CadViewer, CadViewerConfig, CadZhankai} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf, selectFiles, timeout} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {cadFields, getCadInfoInputs} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
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
  imports: [CadImageComponent, InputComponent, KeyValuePipe, MatButtonModule, MatIconModule],
  templateUrl: "./cad-item.component.html",
  styleUrl: "./cad-item.component.scss"
})
export class CadItemComponent<T = undefined> extends Subscribed() implements OnChanges, OnDestroy {
  @Input() cadWidth = 360;
  @Input() cadHeight = 180;

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
  @ViewChild("cadImage") cadImage?: CadImageComponent;
  @ViewChild("mubanImage") mubanImage?: CadImageComponent;
  @ViewChildren(InputComponent) inputComponents?: QueryList<InputComponent>;
  cadViewer?: CadViewer;
  mubanViewer?: CadViewer;
  showCadViewer = false;
  showMubanViewer = false;
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

  mubanInputs: InputInfo[][] = [];
  showMuban: boolean;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    private status: AppStatusService
  ) {
    super();
    this.showMuban = status.projectConfig.getBoolean("新版本做数据可以做激光开料");
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.cad) {
      setTimeout(() => {
        this.update();
      }, 0);
    }
  }

  ngOnDestroy() {
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
      Object.assign(cad, getHoutaiCad(cadData));
      if (cad.json.info?.imgId) {
        cad.json.info.imgUpdate = true;
      }
      this.initCadViewer();
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
    let title = "编辑CAD";
    const name = data.name;
    if (name) {
      title += `【${name}】`;
    }
    const result = await this.message.form({title, form});
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
    await timeout(0);
    this.initMubanViewer();
  }

  async editMuban() {
    const {mubanData, mubanExtraData, cad} = this;
    if (!mubanData) {
      return;
    }
    mubanData.info.fromCad = {
      name: cad.名字,
      imgId: cad.json.info?.imgId
    };
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        data: mubanData,
        center: true,
        collection: "kailiaocadmuban",
        extraData: mubanExtraData,
        ...this.openCadOptions
      }
    });
    if (result?.isSaved) {
      this;
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

  getCadPreviewParams = (() => {
    const params: CadPreviewParams = {
      ignoreShiyitu: true,
      config: {
        width: this.cadWidth,
        height: this.cadHeight,
        backgroundColor: "black",
        lineGongshi: 24,
        hideLineGongshi: false,
        hideLineLength: false,
        padding: [5]
      }
    };
    return params;
  }).bind(this);

  initCadViewer0(
    collection: CadCollection,
    data: CadData,
    containerEl: HTMLDivElement,
    imageComponent: CadImageComponent | undefined,
    afterDblClickForm: (data: CadData) => void
  ) {
    const params = this.getCadPreviewParams();
    const cadConfig: Partial<CadViewerConfig> = {
      ...params.config,
      enableZoom: false,
      dragAxis: "xy",
      selectMode: "single",
      entityDraggable: false
    };
    const cadViewerSubject = new BehaviorSubject<CadViewer | undefined>(undefined);
    const init = () => {
      const cadViewer = new CadViewer(data, cadConfig);
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
    if (imageComponent) {
      imageComponent.data = data;
      if (collection === "cad") {
        imageComponent.id = "";
      } else {
        imageComponent.id = data.id;
      }
      imageComponent.updateUrl();
    } else {
      containerEl.innerHTML = "";
      init();
    }
    return cadViewerSubject;
  }

  initCadViewer() {
    this.cadViewer?.destroy();
    const {cad, cadContainer, cadImage} = this;
    if (!cad || !cadContainer) {
      return;
    }
    const data = new CadData(cad.json);
    generateLineTexts2(data);
    const containerEl = cadContainer.nativeElement;
    const cadViewerSubject = this.initCadViewer0("cad", data, containerEl, cadImage, (data) => {
      cad.json.entities = exportCadData(data, true).entities;
    });
    this.subscribe(cadViewerSubject, (cadViewer) => {
      this.cadViewer = cadViewer;
    });
  }

  async initMubanViewer() {
    this.mubanViewer?.destroy();
    if (!this.showMuban) {
      return;
    }
    const {cad, mubanContainer, mubanId, mubanImage} = this;
    let {mubanData} = this;
    if (!cad || !mubanContainer) {
      return;
    }
    if (!mubanData && mubanId) {
      const resultData = await this.http.getCad({collection: "kailiaocadmuban", id: mubanId}, {spinner: false});
      mubanData = resultData?.cads[0];
      this.mubanData = mubanData;
    }
    if (!mubanData) {
      this.mubanId = "";
      return;
    }
    const containerEl = mubanContainer.nativeElement;
    const cadViewerSubject = this.initCadViewer0("kailiaocadmuban", mubanData, containerEl, mubanImage, () => {
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
    const updateMuban = async (options?: HttpOptions) => {
      return await this.http.setCad({collection: "kailiaocadmuban", cadData: mubanData, force: true}, true, options);
    };
    if (!mubanData.type) {
      mubanData.type = typeOptions[0];
      await updateMuban({spinner: false});
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

  async onCadImageClick() {
    this.showCadViewer = true;
    await timeout(0);
    this.initCadViewer();
  }

  onCadInfoChange(event: DataInfoChnageEvent) {
    this.cad.json.info = event.info;
  }

  async onMubanImageClick() {
    this.showMubanViewer = true;
    await timeout(0);
    this.initMubanViewer();
  }

  async copyName() {
    await this.message.copyText(this.cad.名字, {successText: "已复制名字"});
  }
}
