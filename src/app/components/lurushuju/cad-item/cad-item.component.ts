import {KeyValuePipe} from "@angular/common";
import {
  booleanAttribute,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  HostListener,
  input,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {getCadPreview, getCadPreviewConfig} from "@app/cad/cad-preview";
import {Cad数据要求, Cad数据要求Item} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {exportCadData, generateLineTexts2, openCadDimensionForm} from "@app/cad/utils";
import {getValueString} from "@app/utils/get-value";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {DataInfoChnageEvent} from "@components/cad-image/cad-image.types";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadData, CadDimensionLinear, CadLineLike, CadMtext, CadViewer, CadZhankai} from "@lucilor/cad-viewer";
import {ObjectOf, selectFiles, timeout} from "@lucilor/utils";
import {openCadForm} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {openCadLineForm} from "@modules/cad-editor/components/menu/cad-line/cad-line.utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad, QueryMongodbParams} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import csstype from "csstype";
import {isEmpty} from "lodash";
import {Subscription} from "rxjs";
import {openFentiCadDialog} from "../fenti-cad-dialog/fenti-cad-dialog.component";
import {FentiCadDialogInput} from "../fenti-cad-dialog/fenti-cad-dialog.types";
import {算料公式} from "../xinghao-data";
import {CadItemButton, CadItemForm, CadItemIsOnlineInfo, CadItemSelectable, CadItemValidators, typeOptions} from "./cad-item.types";

@Component({
  selector: "app-cad-item",
  imports: [
    ClickStopPropagationDirective,
    forwardRef(() => CadImageComponent),
    forwardRef(() => InputComponent),
    KeyValuePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule
  ],
  templateUrl: "./cad-item.component.html",
  styleUrl: "./cad-item.component.scss"
})
export class CadItemComponent<T = undefined> implements OnChanges, OnInit, OnDestroy {
  cadWidth = 300;
  cadHeight = 150;

  @HostBinding("style.--cad-image-width") get widthStyle() {
    return `${this.cadWidth}px`;
  }
  @HostBinding("style.--cad-image-height") get heightStyle() {
    return `${this.cadHeight}px`;
  }
  @HostBinding("style") style: csstype.Properties = {};
  @HostBinding("class") class: string[] = [];

  @Input({required: true}) cad: HoutaiCad | CadData = new CadData();
  @Input({required: true}) buttons: CadItemButton<T>[] = [];
  @Input() buttons2: CadItemButton<T>[] = [];
  @Input() hideButtons = false;
  collection = input<CadCollection>("cad");
  @Input({required: true}) customInfo!: T;
  @Input({required: true}) yaoqiu: Cad数据要求 | undefined | null;
  @Input() gongshis: 算料公式[] | null | undefined;
  @Input() fentiDialogInput?: FentiCadDialogInput;
  @Input() mubanExtraData: Partial<CadData> = {};
  @Input() openCadOptions?: OpenCadOptions;
  @Input() showMuban?: boolean;
  @Input() titlePrefix?: string;
  @Input() isOnline?: CadItemIsOnlineInfo<T>;
  @Input({transform: booleanAttribute}) isLocal?: boolean;
  @Input() selectable?: CadItemSelectable<T>;
  @Input({transform: booleanAttribute}) editDisabled?: boolean;
  @Input({transform: booleanAttribute}) noFixedType?: boolean;
  @Input() events?: {
    clickAll?: (component: CadItemComponent<T>, event: MouseEvent) => void;
    clickBlank?: (component: CadItemComponent<T>, event: MouseEvent) => void;
  };
  @Input() validators?: CadItemValidators;
  @Input() cadForm?: CadItemForm<T>;
  @Input() mokuaiName?: string;
  @Output() beforeEditCad = new EventEmitter<void>();
  @Output() afterEditCad = new EventEmitter<void>();

  @ViewChild("cadContainer") cadContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("mubanContainer") mubanContainer?: ElementRef<HTMLDivElement>;
  @ViewChildren(forwardRef(() => InputComponent)) inputComponents?: QueryList<InputComponent>;
  cadViewer?: CadViewer;
  mubanViewer?: CadViewer;
  showMubanViewer = false;
  cadData?: CadData;
  mubanData?: CadData;
  mubanInputs: InputInfo[][] = [];
  errorMsgs: ObjectOf<string> = {};
  isOnlineFetched = false;
  showCadViewer = false;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    private status: AppStatusService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.cad) {
      this.cadData = undefined;
      this.update();
    }
  }

  private _afterEditCadSubscription?: Subscription;
  ngOnInit() {
    this._afterEditCadSubscription = this.afterEditCad.subscribe(() => {
      this.validate();
    });
  }

  ngOnDestroy() {
    this._afterEditCadSubscription?.unsubscribe();
    this.cadViewer?.destroy();
    this.mubanViewer?.destroy();
  }

  get cadId() {
    return this.cad instanceof CadData ? this.cad.id : this.cad._id;
  }
  get cadName() {
    return this.cad instanceof CadData ? this.cad.name : this.cad.名字;
  }
  get cadTitle() {
    return `${this.titlePrefix || ""}${this.cadName}`;
  }
  get mubanId() {
    if (this.cad instanceof CadData) {
      return this.cad.zhankai[0]?.kailiaomuban || "";
    }
    return this.cad.json.zhankai?.[0]?.kailiaomuban || "";
  }
  set mubanId(value: string) {
    const {cad} = this;
    if (!cad) {
      return;
    }
    if (cad instanceof CadData) {
      if (!cad.zhankai[0]) {
        cad.zhankai[0] = new CadZhankai({name: cad.name});
      }
      cad.zhankai[0].kailiaomuban = value;
    } else {
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
  }
  get zhankai() {
    const {cad} = this;
    let zhankai: any;
    if (cad instanceof CadData) {
      zhankai = cad.zhankai[0];
    } else {
      if (cad.json.zhankai && cad.json.zhankai[0]) {
        zhankai = cad.json.zhankai[0];
      }
    }
    return zhankai as CadZhankai | undefined;
  }

  centerCad() {
    this.cadViewer?.center();
  }

  async onlineFetch(compact = false) {
    const {isOnline, yaoqiu} = this;
    if (!isOnline || isOnline.isFetched) {
      return;
    }
    this.beforeEditCad.emit();
    const params: QueryMongodbParams = {collection: this.collection(), where: {_id: this.cadId}};
    if (compact && yaoqiu) {
      const fields: string[] = [];
      for (const {cadKey} of yaoqiu.CAD弹窗修改属性) {
        if (cadKey) {
          fields.push(`json.${cadKey}`);
        }
      }
      // fixme
      // params.fields = fields;
    }
    const data = (await this.http.queryMongodb<HoutaiCad>(params, {spinner: false}))[0];
    if (data) {
      if (this.cad instanceof CadData) {
        Object.assign(this.cad, new CadData(data.json));
      } else {
        Object.assign(this.cad, data);
      }
      this.afterEditCad.emit();
      isOnline.afterFetch?.(this);
    }
  }

  async editCad() {
    const {cad, isOnline} = this;
    if (!cad) {
      return;
    }
    this.beforeEditCad.emit();
    await this.onlineFetch();
    const cadData = cad instanceof CadData ? cad.clone() : new CadData(cad.json);
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        collection: this.collection(),
        data: cadData,
        center: true,
        isLocal: this.isLocal || !isOnline,
        gongshis: this.gongshis,
        mokuaiName: this.mokuaiName,
        validator: (data) => {
          return {...this.validateZhankai(data), ...this.validateName(data)};
        },
        ...this.openCadOptions
      }
    });
    const savedData = result?.savedData;
    if (savedData) {
      if (cad instanceof CadData) {
        Object.assign(cad, savedData);
        cad.info.imgUpdate = true;
      } else {
        Object.assign(cad, getHoutaiCad(savedData));
        if (cad.json.info?.imgId) {
          cad.json.info.imgUpdate = true;
        }
      }
      await this.initCadViewer();
      this.afterEditCad.emit();
      this.validate();
    }
  }

  async editCadForm() {
    const onEdit = this.cadForm?.onEdit;
    if (typeof onEdit === "function") {
      await onEdit(this);
      return;
    }
    if (this.editDisabled) {
      return;
    }
    const {cad, isOnline, yaoqiu} = this;
    if (!cad) {
      return;
    }
    await this.onlineFetch();
    let data: CadData;
    if (cad instanceof CadData) {
      data = cad.clone();
    } else {
      data = new CadData(cad.json);
    }
    this.beforeEditCad.emit();
    const collection = this.collection();
    const {http, dialog, status, message, validators} = this;
    const noFixedType = this.noFixedType;
    const data2 = await openCadForm(yaoqiu, collection, data, http, dialog, status, message, true, {validators, noFixedType});
    if (!data2) {
      return;
    }
    if (data2.zhankai[0] && data2.zhankai[0].name !== data2.name) {
      data2.zhankai[0].name = data2.name;
    }
    if (cad instanceof CadData) {
      Object.assign(cad, data2);
    } else {
      Object.assign(cad, getHoutaiCad(data2));
    }
    if (isOnline) {
      await this.http.setCad({collection: this.collection(), cadData: data2, force: true}, true);
    }
    await this.initCadViewer();
    this.afterEditCad.emit();
    this.validate();
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
    cadData.type = typeOptions[0];
    if (mubanExtraData) {
      Object.assign(cadData, mubanExtraData);
    }
    if (cad instanceof CadData) {
      cadData.name = cad.name || "模板";
      cadData.info.fromCad = {
        name: cad.name,
        imgId: cad.info.imgId
      };
    } else {
      cadData.name = cad.名字 || "模板";
      cadData.info.fromCad = {
        name: cad.名字,
        imgId: cad.json.info?.imgId
      };
    }
    const result = await this.http.setCad({collection: "kailiaocadmuban", cadData, force: true}, true);
    if (!result) {
      return;
    }
    this.mubanId = result.id;
    this.mubanData = result;
    await timeout(0);
    await this.initMubanViewer();
  }

  async getMubanData() {
    const {mubanId} = this;
    if (!mubanId) {
      this.mubanData = undefined;
      return undefined;
    }
    const resultData = await this.http.getCad({collection: "kailiaocadmuban", id: mubanId}, {silent: true});
    const mubanData = resultData.cads[0] as CadData | undefined;
    if (!mubanData) {
      this.message.error(`【${this.cadName}】的模板不存在`);
    }
    this.mubanData = mubanData;
    if (mubanData) {
      generateLineTexts2(mubanData);
    } else {
      this.mubanId = "";
    }
    return mubanData;
  }

  async editMuban() {
    const {mubanExtraData} = this;
    let {mubanData} = this;
    if (!mubanData) {
      mubanData = await this.getMubanData();
    }
    if (!mubanData) {
      return;
    }
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        data: mubanData,
        center: true,
        collection: "kailiaocadmuban",
        extraData: mubanExtraData,
        gongshis: this.gongshis,
        ...this.openCadOptions
      }
    });
    this.mubanData = this.status.cad.data.clone();
    if (result?.savedData) {
      await this.initMubanViewer();
    }
  }

  async editMubanInNewTab() {
    const {mubanId} = this;
    if (!mubanId) {
      return;
    }
    this.status.openCadInNewTab(mubanId, "kailiaocadmuban");
    if (await this.message.newTabConfirm()) {
      await this.refreshMuban();
    }
  }

  async refreshMuban() {
    await this.getMubanData();
    if (this.mubanData) {
      this.status.addCadImgToUpdate(this.mubanData.id);
    }
    await this.initMubanViewer();
  }

  async removeMuban() {
    const {mubanId} = this;
    if (!mubanId) {
      return;
    }
    if (!(await this.message.confirm(`确定删除模板吗？`))) {
      return;
    }
    if (await this.http.mongodbDelete("kailiaocadmuban", {id: mubanId})) {
      this.mubanId = "";
      this.mubanData = undefined;
      await this.initMubanViewer();
    }
  }

  async update() {
    delete this.mubanData;
    this.showCadViewer = false;
    await this.initCadViewer();
    await this.initMubanViewer();
  }

  initCadViewer0(collection: CadCollection, data: CadData, containerEl: HTMLDivElement, afterDblClickForm: (data: CadData) => void) {
    containerEl.innerHTML = "";
    const cadViewer = new CadViewer(
      data,
      getCadPreviewConfig(collection, {
        width: containerEl.clientWidth,
        height: containerEl.clientHeight,
        backgroundColor: "black",
        enableZoom: false,
        dragAxis: "xy",
        selectMode: "single",
        entityDraggable: false
      })
    );
    cadViewer.appendTo(containerEl);
    cadViewer.on("entitydblclick", async (_, entity) => {
      if (entity instanceof CadMtext && entity.parent) {
        entity = entity.parent;
      }
      if (entity instanceof CadLineLike) {
        const result = await openCadLineForm(collection, this.status, this.message, cadViewer, entity, this.gongshis);
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
    return cadViewer;
  }

  async initCadViewer() {
    this.cadViewer?.destroy();
    const {cad, showCadViewer} = this;
    if (!cad) {
      return;
    }
    if (showCadViewer) {
      await this.onlineFetch();
    } else if (this.isOnline) {
      if (cad instanceof CadData) {
        cad.info.incomplete = true;
      } else {
        cad.json.info = {...cad.json.info, incomplete: true};
      }
    }
    const data = cad instanceof CadData ? cad.clone() : new CadData(cad.json);
    this.cadData = data;
    generateLineTexts2(data);
    const cadContainer = this.cadContainer;
    if (showCadViewer && cadContainer) {
      const containerEl = cadContainer.nativeElement;
      const collection = this.collection();
      this.cadViewer = this.initCadViewer0(collection, data, containerEl, async (data) => {
        this.beforeEditCad.emit();
        if (!this.isOnline) {
          data.info.imgUpdate = true;
        }
        if (cad instanceof CadData) {
          Object.assign(cad, data);
        } else {
          const exportData = exportCadData(data);
          for (const key of ["entities", "info"] as const) {
            cad.json[key] = exportData[key];
          }
        }
        if (this.isOnline) {
          const url = await getCadPreview(collection, data);
          await this.http.setCad({collection, cadData: data, force: true}, true);
          await this.http.setCadImg(data.id, url, {silent: true});
        }
        this.afterEditCad.emit();
      });
    }
  }

  async initMubanViewer() {
    this.mubanViewer?.destroy();
    if (!this.showMuban) {
      return;
    }
    const {cad, mubanContainer, showMubanViewer} = this;
    if (!cad || !mubanContainer) {
      return;
    }
    if (!this.mubanData) {
      await this.getMubanData();
    }
    if (showMubanViewer) {
      const {mubanData} = this;
      if (mubanData) {
        const containerEl = mubanContainer.nativeElement;
        this.mubanViewer = this.initCadViewer0("kailiaocadmuban", mubanData, containerEl, () => {
          this.http.setCad({collection: "kailiaocadmuban", cadData: mubanData, force: true}, true);
        });
      }
    }
    await this.updateMubanInputs();
  }

  async updateMubanInputs() {
    this.mubanInputs = [];
    const {cad, mubanData} = this;
    if (!cad || !mubanData) {
      return;
    }
    let flip: any;
    if (cad instanceof CadData) {
      if (cad.zhankai.length < 1) {
        cad.zhankai.push(new CadZhankai({name: cad.name}));
      }
      if (cad.zhankai[0].flip.length < 1) {
        cad.zhankai[0].flip.push({chanpinfenlei: "", fanzhuanfangshi: "", kaiqi: ""});
      }
      flip = cad.zhankai[0].flip[0];
    } else {
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
      flip = zhankai.flip[0];
    }
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

  validateZhankai(data: CadData): ValidationErrors | null {
    const {validators} = this;
    const zhankai = data.zhankai[0];
    if (validators?.zhankai) {
      if (!zhankai.zhankaigao) {
        return {[`【${data.name}】展开高不能为空，请检查红色文字并补充数据`]: true};
      }
    }
    return null;
  }
  validateName(data: CadData): ValidationErrors | null {
    const {validators} = this;
    if (validators?.name) {
      const errors = validators.name(data);
      if (!isEmpty(errors)) {
        return {[`【${data.name}】名字有错：${Object.keys(errors).join("，")}`]: true};
      }
    }
    return null;
  }
  validate() {
    const inputs = this.inputComponents?.toArray() || [];
    const errors: string[] = [];
    this.errorMsgs = {};
    const {cadName} = this;
    const name = `【${cadName}】`;
    if (inputs.some((v) => !isEmpty(v.validateValue()))) {
      errors.push(`${name}输入数据有误`);
    }
    if (this.cadData) {
      const zhankaiError = Object.keys(this.validateZhankai(this.cadData) || {}).join("，");
      if (zhankaiError) {
        errors.push(zhankaiError);
        this.errorMsgs.展开信息 = zhankaiError;
      }
      const nameError = Object.keys(this.validateName(this.cadData) || {}).join("，");
      if (nameError) {
        errors.push(nameError);
        this.errorMsgs.名字 = nameError;
      }
    }
    return errors;
  }

  isCadInfoVisible(item: Cad数据要求Item) {
    if (["展开信息", "激光开料CAD模板"].includes(item.key)) {
      return true;
    }
    return !!item.cadKey;
  }

  getCadInfoStr(item: Cad数据要求Item) {
    const {cad} = this;
    if (item.cadKey) {
      let value = cad instanceof CadData ? cad[item.cadKey] : cad.json[item.cadKey];
      if (item.key2) {
        value = value?.[item.key2];
      }
      return getValueString(value, {separator: "\n", separatorKv: "："});
    } else if (item.key === "展开信息") {
      const zhankai = this.zhankai;
      if (zhankai) {
        return `${zhankai.zhankaikuan || ""} × ${zhankai.zhankaigao || ""} = ${zhankai.shuliang || ""}`;
      }
    } else if (item.key === "激光开料CAD模板") {
      const zhankai = this.zhankai;
      if (zhankai) {
        return zhankai.kailiaomuban;
      }
    }
    return "";
  }

  async onCadImageClick() {
    if (this.editDisabled) {
      return;
    }
    this.showCadViewer = true;
    await timeout(0);
    await this.initCadViewer();
  }

  onCadInfoChange(event: DataInfoChnageEvent) {
    const {cad} = this;
    this.beforeEditCad.emit();
    if (cad instanceof CadData) {
      cad.info = event.info;
    } else {
      cad.json.info = event.info;
    }
    this.afterEditCad.emit();
  }

  async onMubanImageClick() {
    this.showMubanViewer = true;
    await timeout(0);
    await this.initMubanViewer();
  }

  async copyName() {
    await this.message.copyText(this.cadName, {successText: "已复制名字"});
  }

  async toggleShowLineLength() {
    if (!(await this.message.confirm("是否将所有线的线长数字如果是隐藏的就显示，如果是显示的就隐藏？"))) {
      return;
    }
    await this.onlineFetch();
    const cad = this.cad;
    const toggle = async (data: CadData) => {
      data.entities.forEach((e) => {
        if (e instanceof CadLineLike) {
          e.hideLength = !e.hideLength;
        }
      });
      const isOnline = this.isOnline;
      const collection = this.collection();
      if (isOnline) {
        await this.http.setCad({collection, cadData: data, force: true}, true);
      }
      generateLineTexts2(data);
      let id = data.id;
      if (data.info.imgId) {
        id = data.info.imgId;
      }
      await this.http.setCadImg(id, await getCadPreview(collection, data), {silent: true});
      this.status.addCadImgToUpdate(id);
      delete this.cadData;
      await timeout(200);
      await this.initCadViewer();
    };
    if (cad instanceof CadData) {
      await toggle(cad);
    } else {
      const data = new CadData(cad.json);
      await toggle(data);
      Object.assign(cad, getHoutaiCad(data));
    }
  }

  @HostListener("click", ["$event"])
  onHostClick(event: MouseEvent) {
    this.events?.clickAll?.(this, event);
    this.events?.clickBlank?.(this, event);
  }

  onClickStopped = ((event: MouseEvent) => {
    this.events?.clickAll?.(this, event);
  }).bind(this);
}
