import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {
  booleanAttribute,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {alertError, checkDuplicateVars, ErrorDetail, ErrorItem, getNamesDetail} from "@app/utils/error-message";
import {getCopyName} from "@app/utils/get-value";
import {CustomValidators} from "@app/utils/input-validators";
import {canItemMatchTogether} from "@app/utils/mongo";
import {openBancaiFormDialog} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {getFromulasFromString} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {CadItemButton} from "@components/lurushuju/cad-item/cad-item.types";
import {XuanxiangTableData} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.types";
import {emptyXuanxiangItem, getXuanxiangItem, getXuanxiangTable} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.utils";
import {选项} from "@components/lurushuju/xinghao-data";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, MaybePromise, ObjectOf, timeout} from "@lucilor/utils";
import {SuanliaogongshiComponent} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellChangeEvent, RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MrbcjfzDataSubmitEvent, MrbcjfzInfo, MrbcjfzInputData, MrbcjfzResponseData} from "@views/mrbcjfz/mrbcjfz.types";
import {getEmptyMrbcjfzInfo, isMrbcjfzInfoEmpty2, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {clone, cloneDeep, intersection, isEmpty, isEqual, uniqueId} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {firstValueFrom, Subject} from "rxjs";
import {CadItemComponent} from "../../lurushuju/cad-item/cad-item.component";
import {MokuaiCadsComponent} from "../mokuai-cads/mokuai-cads.component";
import {BjmkStatusService} from "../services/bjmk-status.service";
import {MokuaiItem, MokuaiItemCadInfo, MokuaiItemCloseEvent, MokuaiItemCustomData, NodeTextReplacerItem} from "./mokuai-item.types";
import {getEmptyMokuaiItem, getMokuaiCustomData, mokuaiSubmitAfter, updateMokuaiCustomData} from "./mokuai-item.utils";

@Component({
  selector: "app-mokuai-item",
  imports: [
    CadItemComponent,
    CdkDrag,
    CdkDropList,
    FloatingDialogModule,
    FormulasEditorComponent,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MokuaiCadsComponent,
    MrbcjfzComponent,
    NgScrollbarModule,
    SuanliaogongshiComponent,
    TableComponent
  ],
  templateUrl: "./mokuai-item.component.html",
  styleUrl: "./mokuai-item.component.scss"
})
export class MokuaiItemComponent {
  private bjmkStatus = inject(BjmkStatusService);
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = ["ng-page"];

  collection = this.bjmkStatus.collection;

  id = input.required<number>();
  bancaiListData = input.required<BancaiListData | null>();
  bancaiListDataRefresh = input.required<() => MaybePromise<BancaiListData | null>>();
  closable = input(false, {transform: booleanAttribute});
  closeOut = output<MokuaiItemCloseEvent>({alias: "close"});

  imgPrefix = this.bjmkStatus.imgPrefix;
  mokuai = signal<MokuaiItem>(getEmptyMokuaiItem());
  mokuaiOld = signal<MokuaiItem>(getEmptyMokuaiItem());
  mokuaiEff = effect(async () => {
    const mokuai = await this.bjmkStatus.fetchMokuai(this.id());
    if (mokuai) {
      if (mokuai.自定义数据) {
        const optionsAll = this.bjmkStatus.mokuaiOptionsManager.data();
        updateMokuaiCustomData(mokuai.自定义数据, optionsAll);
      }
      mokuaiSubmitAfter(mokuai);
      this.mokuai.set(mokuai);
    } else {
      this.mokuai.set(getEmptyMokuaiItem());
      this.message.error("该模块已被删除或停用");
    }
    this.mokuaiOld.set(cloneDeep(this.mokuai()));
  });
  async editMokuai() {
    const mokuai = this.mokuai();
    const mokuai2 = await this.bjmkStatus.getMokuaiWithForm(mokuai);
    Object.assign(mokuai, mokuai2);
    this.cd.markForCheck();
  }

  useSlgsInfo = computed(() => {
    const mokuai = this.mokuai();
    return mokuai.xuanxianggongshi.length > 0 || isEmpty(mokuai.suanliaogongshi);
  });
  gongshis = computed(() => this.mokuai().xuanxianggongshi);
  slgsInfo = computed(() => {
    const info: SuanliaogongshiInfo = {
      data: {算料公式: this.gongshis()},
      slgs: {title: "模块公式"}
    };
    return info;
  });
  onSlgsChange(info: SuanliaogongshiInfo) {
    this.mokuai.update((v) => ({...v, xuanxianggongshi: info.data.算料公式 || []}));
  }

  morenbancais = signal<{key: string; val: MrbcjfzInfo}[]>([]);
  morenbancaisEff = effect(() => {
    const morenbancai = this.mokuai().morenbancai || {};
    this.morenbancais.set(Object.entries(morenbancai).map(([key, val]) => ({key, val})));
  });
  morenbancaiInputInfos = computed(() => {
    const infos: InputInfo[] = [];
    for (const [i, {key, val}] of this.morenbancais().entries()) {
      let str = "";
      if (isMrbcjfzInfoEmpty2(key, val)) {
        continue;
      } else {
        const {默认开料材料, 默认开料板材, 默认开料板材厚度} = val;
        str = `${默认开料材料}/${默认开料板材}/${默认开料板材厚度}`;
      }
      infos.push({
        type: "string",
        label: key,
        value: str,
        selectOnly: true,
        suffixIcons: [
          {name: "edit", isDefault: true, onClick: () => this.editMorenbancai(i)}
          // {name: "add", onClick: () => this.addMorenbancai(i)},
          // {name: "remove", onClick: () => this.removeMorenbancai(i)}
        ]
      });
    }
    return infos;
  });
  async getMorenbancaiItem(i?: number) {
    const morenbancais = this.morenbancais();
    const item = typeof i === "number" ? cloneDeep(morenbancais[i]) : {key: "", val: getEmptyMrbcjfzInfo("")};
    const xinghao = new MrbcjfzXinghaoInfo("", {vid: 0, mingzi: ""});
    const {key, val} = item;
    xinghao.默认板材 = {[key]: val};
    xinghao.update();
    const extraInputInfos = xinghao.inputInfos[key];
    const names = morenbancais.map((v) => v.key);
    if (typeof i === "number") {
      names.splice(i, 1);
    }
    extraInputInfos[0].unshift({
      type: "string",
      label: "板材分组名字",
      model: {data: item, key: "key"},
      autoFocus: true,
      validators: [Validators.required, CustomValidators.duplicate(names)],
      style: {...extraInputInfos[0][0].style}
    });
    const bancaiList = this.bancaiListData()?.bancais || [];
    const result = await openBancaiFormDialog(this.dialog, {
      data: {
        data: {
          bancai: val.默认开料板材,
          cailiao: val.默认开料材料,
          houdu: val.默认开料板材厚度,
          bancaiList: val.可选板材,
          cailiaoList: val.可选材料,
          houduList: val.可选厚度
        },
        bancaiList,
        bancaiListRefrersh: async () => (await this.bancaiListDataRefresh()())?.bancais || [],
        key,
        extraInputInfos,
        noTitle: true
      }
    });
    if (result) {
      item.val = xinghao.默认板材[key];
      item.val.默认开料板材 = result.bancai;
      item.val.默认开料材料 = result.cailiao;
      item.val.默认开料板材厚度 = result.houdu;
      item.val.可选板材 = result.bancaiList || [];
      item.val.可选材料 = result.cailiaoList || [];
      item.val.可选厚度 = result.houduList || [];
      return item;
    }
    return null;
  }
  async addMorenbancai(i?: number) {
    const morenbancais = this.morenbancais().slice();
    const item = await this.getMorenbancaiItem();
    if (item) {
      if (typeof i === "number") {
        morenbancais.splice(i + 1, 0, item);
      } else {
        morenbancais.push(item);
      }
      this.morenbancais.set(morenbancais);
    }
  }
  async editMorenbancai(i: number) {
    const morenbancais = this.morenbancais().slice();
    const item = await this.getMorenbancaiItem(i);
    if (item) {
      morenbancais[i] = item;
      this.morenbancais.set(morenbancais);
    }
  }
  async removeMorenbancai(i: number) {
    const morenbancais = this.morenbancais().slice();
    if (!(await this.message.confirm(`确定删除${morenbancais[i].key}吗？`))) {
      return;
    }
    morenbancais.splice(i, 1);
    this.morenbancais.set(morenbancais);
  }

  showMrbcjfzDialog = signal(false);
  private _mrbcjfzResponseData = signal<{id: number; data: MrbcjfzResponseData} | null>(null);
  private _mrbcjfzDialogClose$ = new Subject<MrbcjfzDataSubmitEvent | null>();
  mrbcjfzComponent = viewChild<MrbcjfzComponent>("mrbcjfz");
  mrbcjfzInputData = computed(() => {
    const mokuai = this.mokuai();
    const data = this._mrbcjfzResponseData();
    if (!data) {
      return null;
    }
    const morenbancai = cloneDeep(mokuai.morenbancai || {});
    const inputData: MrbcjfzInputData = {
      xinghao: mokuai.name,
      morenbancai,
      cads: this.cads()
    };
    if (data) {
      inputData.resData = data.data;
    }
    return inputData;
  });
  mrbcjfzTable = computed(() => "p_peijianmokuai");
  private async _fetchMrbcjfzResponseData() {
    const mokuai = this.mokuai();
    const resData = this._mrbcjfzResponseData();
    const id = mokuai.id;
    if (resData?.id === mokuai.id) {
      return;
    }
    const table = this.mrbcjfzTable();
    const collection = this.bjmkStatus.collection;
    const data = await this.http.getData<MrbcjfzResponseData>("peijian/xinghao/bancaifenzuIndex", {table, id, collection});
    if (data) {
      this._mrbcjfzResponseData.set({id, data});
    }
  }
  async openMrbcjfzDialog() {
    await this._fetchMrbcjfzResponseData();
    this.showMrbcjfzDialog.set(true);
    return await firstValueFrom(this._mrbcjfzDialogClose$);
  }
  onMrbcjfSubmit(event: MrbcjfzDataSubmitEvent) {
    this._mrbcjfzDialogClose$.next(event);
    this.showMrbcjfzDialog.set(false);
  }
  onMrbcjfClose() {
    this._mrbcjfzDialogClose$.next(null);
    this.showMrbcjfzDialog.set(false);
  }
  async editMrbcjfz() {
    const result = await this.openMrbcjfzDialog();
    if (result) {
      this.mokuai.update((v) => ({...v, morenbancai: result.data.默认板材}));
    }
  }

  private _textInputInfoUpdateDisabled = false;
  private _getTextInputInfo1(key: keyof MokuaiItem, label: string = key) {
    const mokuai = this.mokuai();
    const update = () => {
      this.mokuai.update((v) => ({...v}));
    };
    const info: InputInfo<MokuaiItem> = {
      type: "string",
      textarea: {autosize: {minRows: 1, maxRows: 3}},
      label,
      model: {data: mokuai, key},
      suffixIcons: [
        {
          name: "edit",
          onClick: async () => {
            const arr = (mokuai[key] as string).split("+");
            const result = await this.message.prompt({type: "array", label, value: arr});
            if (Array.isArray(result)) {
              (mokuai as any)[key] = result.filter((v) => v).join("+");
              update();
            }
          }
        }
      ],
      onChange: () => {
        if (!this._textInputInfoUpdateDisabled) {
          update();
        }
      }
    };
    return info;
  }
  private _getTextInputInfo2(key: keyof MokuaiItemCustomData, label: string = key) {
    const mokuai = this.mokuai();
    if (!mokuai.自定义数据) {
      mokuai.自定义数据 = getMokuaiCustomData(null, this.bjmkStatus.mokuaiOptionsManager.data());
    }
    const update = () => {
      this.mokuai.update((v) => ({...v, 自定义数据: clone(v.自定义数据)}));
    };
    const info: InputInfo<MokuaiItemCustomData> = {
      type: "string",
      textarea: {autosize: {minRows: 1, maxRows: 3}},
      label,
      model: {data: mokuai.自定义数据, key},
      suffixIcons: [
        {
          name: "edit",
          onClick: async () => {
            const arr = (mokuai.自定义数据![key] as string).split("+");
            const result = await this.message.prompt({type: "array", label, value: arr});
            if (Array.isArray(result)) {
              (mokuai.自定义数据 as any)[key] = result.filter((v) => v).join("+");
              update();
            }
          }
        }
      ],
      onChange: () => {
        if (!this._textInputInfoUpdateDisabled) {
          update();
        }
      }
    };
    return info;
  }
  mokuaiInputInfos = computed(() => [
    this._getTextInputInfo1("gongshishuru", "公式输入"),
    this._getTextInputInfo1("shuchubianliang", "输出变量"),
    this._getTextInputInfo1("kailiaoshiyongbianliang", "开料使用变量"),
    this._getTextInputInfo2("下单显示")
  ]);
  shaixuanInputInfos = computed(() => {
    const mokuai = this.mokuai();
    if (!mokuai.自定义数据) {
      mokuai.自定义数据 = getMokuaiCustomData(null, this.bjmkStatus.mokuaiOptionsManager.data());
    }
    const infos: InputInfo<typeof mokuai.自定义数据>[] = [
      {
        type: "object",
        label: "下单时需要满足选项",
        model: {data: mokuai.自定义数据, key: "下单时需要满足选项"},
        clearable: true,
        optionsDialog: {},
        optionMultiple: true,
        optionType: "模块选项"
      }
    ];
    return infos;
  });

  mokuaiOptionsEff = effect(async () => {
    const options = await this.bjmkStatus.mokuaiOptionsManager.fetch();
    const customDataOld = this.mokuai().自定义数据;
    const customDataNew = getMokuaiCustomData(customDataOld, options);
    if (!isEqual(customDataOld, customDataNew)) {
      this.forceUpdateKeys.add("自定义数据");
      this.mokuai.update((v) => ({...v, 自定义数据: customDataNew}));
    }
  });
  async setMokuaiCustomData<T extends keyof MokuaiItemCustomData>(key: T, value: MokuaiItemCustomData[T]) {
    const mokuai = this.mokuai();
    if (!mokuai.自定义数据) {
      mokuai.自定义数据 = getMokuaiCustomData(null, await this.bjmkStatus.mokuaiOptionsManager.fetch());
    }
    mokuai.自定义数据[key] = value;
    this.mokuai.update((v) => ({...v}));
  }

  xuanxiangTable = computed(() => getXuanxiangTable(this.mokuai().自定义数据?.选项数据 || [], {title: ""}, {use输出变量: true}));
  async getXuanxiangItem(data0?: 选项) {
    const optionsAll = await this.bjmkStatus.mokuaiOptionsManager.fetch();
    return await getXuanxiangItem(this.message, optionsAll, this.xuanxiangTable().data, data0, {use输出变量: true});
  }
  async onXuanxiangToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getXuanxiangItem();
          if (item) {
            const items = this.mokuai().自定义数据?.选项数据 || [];
            items.push(item);
            this.setMokuaiCustomData("选项数据", items);
          }
        }
        break;
    }
  }
  async onXuanxiangRow(event: RowButtonEvent<XuanxiangTableData>) {
    const mokuai = this.mokuai();
    const {button, rowIdx} = event;
    const items = mokuai.自定义数据?.选项数据 || [];
    const item = items[rowIdx];
    switch (button.event) {
      case "编辑":
        {
          const item2 = await this.getXuanxiangItem(item);
          if (item2) {
            items[rowIdx] = item2;
            this.setMokuaiCustomData("选项数据", items);
          }
        }
        break;
      case "清空数据":
        if (await emptyXuanxiangItem(this.message, item)) {
          this.setMokuaiCustomData("选项数据", items);
        }
        break;
    }
  }

  cadYaoqiu = this.bjmkStatus.cadYaoqiu;
  cadButtons = computed(() => {
    const buttons: CadItemButton<MokuaiItemCadInfo>[] = [
      {
        name: "复制",
        onClick: (c) => {
          this.copyCad(c.customInfo().index);
        }
      },
      {name: "删除", onClick: (c) => this.unselectCad(c.customInfo().index)}
    ];
    return buttons;
  });
  afterEditCad() {
    const mokuai = this.mokuai();
    mokuai.cads = this.cads().map((v) => getHoutaiCad(v));
    this.cd.markForCheck();
  }
  showCadsDialog = signal(false);
  hideCadFormDefaultTexts = signal(false);
  toggleHideCadFormDefaultTexts() {
    this.hideCadFormDefaultTexts.update((v) => !v);
  }
  cads = signal<CadData[]>([]);
  cadsHoutai = computed(() => this.mokuai().cads || []);
  selectedCadsEff = effect(() => {
    this.cads.set(this.cadsHoutai().map((v) => new CadData(v.json)));
  });
  selectCads$ = new Subject<MokuaiCadsComponent | null>();
  async selectCads() {
    const mokuai = this.mokuai();
    const cadsBefore = (mokuai.cads || []).map((v) => new CadData(v.json));
    this.cads.set(cadsBefore);
    this.showCadsDialog.set(true);
    const component = await firstValueFrom(this.selectCads$);
    if (!component) {
      this.cads.set(cadsBefore);
      return;
    }
    const cads: HoutaiCad[] = [];
    for (const cad of this.cads()) {
      delete cad.info.isLocal;
      if (!cad.info.imgId) {
        cad.info.imgId = await this.http.getMongoId();
      }
      cads.push(getHoutaiCad(cad));
    }
    this.mokuai.update((v) => ({...v, cads}));
  }
  async unselectCad(i: number) {
    if (!(await this.message.confirm("是否确定删除？"))) {
      return;
    }
    const cads = this.mokuai().cads?.slice() || [];
    cads.splice(i, 1);
    this.mokuai.update((v) => ({...v, cads}));
  }
  copyCad(i: number) {
    const cads = this.mokuai().cads?.slice() || [];
    const names = cads.map((v) => v.名字);
    const cad = new CadData(cads[i].json).clone(true);
    cad.name = getCopyName(names, cad.name);
    cad.info.imgId = null;
    cads.splice(i + 1, 0, getHoutaiCad(cad));
    this.mokuai.update((v) => ({...v, cads}));
  }
  closeCadsDialog(mokuaiCads: MokuaiCadsComponent | null) {
    this.showCadsDialog.set(false);
    this.selectCads$.next(mokuaiCads);
  }
  async importCads() {
    await this.message.importData<HoutaiCad[]>(
      false,
      async (cadsRaw) => {
        const cads = cadsRaw.map((v) => getHoutaiCad(new CadData(v.json).clone(true)));
        const data = await this.message.getImportFrom(cads, (v) => v.名字, "模块CAD");
        if (!data) {
          return false;
        }
        if (data.mode === "replace") {
          this.mokuai.update((v) => ({...v, cads: data.from}));
        } else {
          const mokuai = this.mokuai();
          mokuai.cads = [...(mokuai.cads || []), ...data.from];
          this.mokuai.set({...mokuai});
        }
        return true;
      },
      "模块CAD"
    );
  }
  async exportCads() {
    const cads = this.mokuai().cads || [];
    if (cads.length < 1) {
      return;
    }
    const data = await this.message.getExportFrom(cads, (v) => v.名字, "模块CAD");
    if (!data) {
      return;
    }
    this.message.exportData(data.from, "模块CAD");
  }

  cadDragEnabled = signal(false);
  toggleCadDragEnabled() {
    this.cadDragEnabled.update((v) => !v);
  }
  dropCad(event: CdkDragDrop<CadData[]>) {
    const mokuai = this.mokuai();
    const morenbancai = mokuai.morenbancai || {};
    const cads = mokuai.cads || [];
    moveItemInArray(cads || [], event.previousIndex, event.currentIndex);
    mokuai.cads = [...cads];
    const cadIds = cads.map((v) => v._id);
    mokuai.morenbancai = {};
    for (const [key, value] of Object.entries(morenbancai)) {
      value.CAD.sort((a, b) => cadIds.indexOf(a) - cadIds.indexOf(b));
      mokuai.morenbancai[key] = {...value};
    }
    this.mokuai.set({...mokuai});
  }

  isSaved = signal(false);
  close() {
    this.closeOut.emit({isSaved: this.isSaved()});
  }
  slgsComponent = viewChild<FormulasEditorComponent>("slgs");
  forceUpdateKeys = new Set<keyof MokuaiItem>();
  async updateMokaui() {
    const mokuai = this.mokuai();
    const error: ErrorItem = {content: "", details: []};

    const varKeysShuchu = mokuai.shuchubianliang.split("+");
    const varKeysXuanxiang = mokuai.自定义数据?.选项数据.map((v) => v.名字) || [];
    checkDuplicateVars(varKeysShuchu, varKeysXuanxiang, "输出变量", "模块选项", error.details);
    const gongshishuru = getFromulasFromString(mokuai.gongshishuru);
    checkDuplicateVars(Object.keys(gongshishuru), varKeysXuanxiang, "公式输入", "模块选项", error.details);
    const xuanxiangshuru = getFromulasFromString(mokuai.xuanxiangshuru);
    checkDuplicateVars(Object.keys(xuanxiangshuru), varKeysXuanxiang, "选项输入", "模块选项", error.details);
    for (const [i, xxgs1] of mokuai.xuanxianggongshi.entries()) {
      for (const xxgs2 of mokuai.xuanxianggongshi.slice(i + 1)) {
        if (canItemMatchTogether(xxgs1, xxgs2)) {
          const keys1 = Object.keys(xxgs1.公式);
          const keys2 = Object.keys(xxgs2.公式);
          const duplicateVars = intersection(keys1, keys2);
          if (duplicateVars.length > 0) {
            error.details.push([{text: `公式【${xxgs1.名字}】与【${xxgs2.名字}】变量重复：`}, ...getNamesDetail(duplicateVars)]);
          }
        }
      }
    }

    const slgsComponent = this.slgsComponent();
    if (slgsComponent) {
      const formulasResult = await slgsComponent.submitFormulas(slgsComponent.formulaList(), true);
      if (formulasResult.fulfilled) {
        mokuai.suanliaogongshi = formulasResult.data;
      } else {
        error.details.push(...formulasResult.errors.map<ErrorDetail>((v) => [{text: `模块公式：${v}`}]));
      }
    }

    const purgeStr = (str: string) => str.replaceAll(" ", "");
    mokuai.gongshishuru = purgeStr(mokuai.gongshishuru);
    mokuai.xuanxiangshuru = purgeStr(mokuai.xuanxiangshuru);
    mokuai.shuchubianliang = purgeStr(mokuai.shuchubianliang);

    await this._fetchMrbcjfzResponseData();
    await timeout(0);
    const mrbcjfzErrors = await this.mrbcjfzComponent()?.checkSubmit();
    if (mrbcjfzErrors) {
      if (mrbcjfzErrors.length > 0) {
        error.details.push(...mrbcjfzErrors.map<ErrorDetail>((v) => [{text: `板材分组：${v}`}]));
      } else {
        mokuai.morenbancai = this.morenbancais().reduce<ObjectOf<MrbcjfzInfo>>((acc, {key, val}) => {
          acc[key] = val;
          return acc;
        }, {});
      }
    }

    if (error.details.length > 0) {
      await alertError(this.message, error);
      return null;
    }
    return mokuai;
  }
  async save() {
    const mokuai = await this.updateMokaui();
    if (!mokuai) {
      return;
    }
    const mokuaiOld = this.mokuaiOld();
    const mokuaiNew: Partial<MokuaiItem> = {id: mokuai.id, name: mokuai.name};
    const forceUpdateKeys = this.forceUpdateKeys;
    for (const key of keysOf(mokuai)) {
      const val = mokuai[key];
      const valOld = mokuaiOld[key];
      if (forceUpdateKeys.has(key) || !isEqual(val, valOld)) {
        mokuaiNew[key] = val as any;
      }
    }
    forceUpdateKeys.clear();
    await this.bjmkStatus.editMokuai(mokuaiNew, {noForm: true});
    this.isSaved.set(true);
  }
  async saveAs() {
    const mokuai = await this.updateMokaui();
    if (!mokuai) {
      return;
    }
    await this.bjmkStatus.copyMokuai(mokuai);
  }
  openDdbq() {
    const mokuai = this.mokuai();
    this.status.openInNewTab(["/dingdanbiaoqian"], {queryParams: {ids: mokuai.id, type: "配件模块"}});
  }

  showXhmrmsbjsUsingMokuai() {
    this.bjmkStatus.showXhmrmsbjsUsingMokuai(this.mokuai().id);
  }

  gongnengInputs = viewChildren<InputComponent>("gongnengInputs");
  shaixuanInputs = viewChildren<InputComponent>("shaixuanInputs");
  async clearData(type: string) {
    if (!(await this.message.confirm(`确定清空全部【${type}】数据吗？`))) {
      return;
    }
    const mokuai = this.mokuai();
    this._textInputInfoUpdateDisabled = true;
    switch (type) {
      case "模块功能":
        for (const input2 of this.gongnengInputs()) {
          input2.clear();
        }
        break;
      case "模块筛选":
        for (const input2 of this.shaixuanInputs()) {
          input2.clear();
        }
        break;
      case "选项数据":
        if (mokuai.自定义数据) {
          mokuai.自定义数据.选项数据 = [];
        }
        break;
      case "配件CAD":
        mokuai.cads = [];
        break;
      default:
        return;
    }
    this._textInputInfoUpdateDisabled = false;
    this.mokuai.update((v) => ({...v}));
  }

  nodeTextReplacerOpened = signal(false);
  nodeTextReplacerItems = signal<NodeTextReplacerItem[]>([]);
  nodeText = computed(() => this.mokuai().node);
  nodeTextReplacerItemNameMap = computed(() => {
    const items = this.nodeTextReplacerItems();
    const map = new Map<string, number[]>();
    for (const [i, item] of items.entries()) {
      const indexs = map.get(item.from);
      if (indexs) {
        indexs.push(i);
      } else {
        map.set(item.from, [i]);
      }
    }
    return map;
  });
  nodeTextVars = computed(() => {
    const reg = /"(numF|f)ormula":"([^"]+)"/g;
    const text = this.nodeText();
    const vars = new Set<string>();
    if (!text) {
      return vars;
    }
    text.matchAll(reg).forEach((v) => {
      vars.add(v[2]);
    });
    return vars;
  });
  updateNodeTextReplacerItemCount(item: NodeTextReplacerItem) {
    const text = this.nodeText();
    if (!text) {
      item.count = 0;
    } else {
      item.count = text.matchAll(new RegExp(`"${item.from}"`, "g")).toArray().length;
    }
  }
  addNodeTextReplacerItem(varName?: string) {
    const item: NodeTextReplacerItem = {id: uniqueId(), from: "", to: "", count: 0};
    if (varName) {
      const items = this.nodeTextReplacerItems();
      if (items.some((v) => v.from === varName)) {
        this.message.snack("已有该变量");
        return;
      }
      item.from = varName;
    }
    this.updateNodeTextReplacerItemCount(item);
    this.nodeTextReplacerItems.update((v) => [...v, item]);
  }
  nodeTextReplacerTableInfo = computed(() => {
    const table = this.nodeTextReplacerTable();
    const selectedItems = table?.getSelectedItems();
    const info: TableRenderInfo<NodeTextReplacerItem> = {
      data: this.nodeTextReplacerItems(),
      columns: [
        {type: "number", field: "id", name: "序号", width: "50px", getString: (_, i) => String(i + 1)},
        {
          type: "string",
          field: "from",
          name: "公式名字",
          editable: true,
          validators: Validators.required,
          validators2: ({item}) => {
            if (!item.from) {
              return {required: true};
            }
            const map = this.nodeTextReplacerItemNameMap();
            for (const [key, value] of map.entries()) {
              if (key === item.from && value.length > 1) {
                return {名字不能重复: true};
              }
            }
            return null;
          }
        },
        {
          type: "string",
          field: "to",
          name: "替换成",
          editable: true,
          validators: Validators.required,
          validators2: ({item}) => {
            if (item.from === item.to) {
              return {不能与原名字相同: true};
            }
            return null;
          }
        },
        {type: "number", field: "count", name: "有多少个需要替换的地方"},
        {
          type: "string",
          field: "fulfilled",
          name: "结果",
          width: "80px",
          getString: (v) => {
            if (typeof v.fulfilled === "boolean") {
              return v.fulfilled ? "成功" : "失败";
            } else {
              return "N/A";
            }
          }
        }
      ],
      editMode: true,
      rowSelection: {mode: "multiple", selectedItems},
      toolbarButtons: {
        add: true,
        remove: true,
        extra: [
          {event: "replace", title: "开始替换", onClick: () => this.replaceNodeVars()},
          {event: "remove", title: "将选中公式替换为空", onClick: () => this.removeNodeVars()},
          {
            event: "showText",
            hidden: environment.production,
            onClick: async () => {
              const text = await this.getNodeText();
              if (text) {
                this.message.alert(text);
              }
            }
          }
        ]
      },
      newItem: () => ({id: uniqueId(), from: "", to: "", count: 0})
    };
    return info;
  });
  nodeTextReplacerTable = viewChild<TableComponent<NodeTextReplacerItem>>("nodeTextReplacerTable");
  async getNodeText() {
    const text = this.nodeText();
    if (!text) {
      await this.message.error("效果图公式数据为空！");
    }
    return text;
  }
  async setNodeText(text: string) {
    this.mokuai.update((v) => ({...v, node: text}));
  }
  async openNodeTextReplacer() {
    if (!(await this.getNodeText())) {
      return;
    }
    this.nodeTextReplacerOpened.set(true);
  }
  closeNodeTextReplacer() {
    this.nodeTextReplacerOpened.set(false);
    this.nodeTextReplacerItems.set([]);
  }
  onNodeTextReplacerTableCellChange(event: CellChangeEvent<NodeTextReplacerItem>) {
    const {item} = event;
    this.updateNodeTextReplacerItemCount(item);
    item.fulfilled = undefined;
    this.nodeTextReplacerItems.update((v) => [...v]);
  }
  async replaceNodeVars() {
    const text0 = await this.getNodeText();
    if (!text0) {
      return;
    }
    let text = text0;
    const items = this.nodeTextReplacerItems();
    for (const item of items) {
      const {from, to} = item;
      if (!from || !to || from === to) {
        continue;
      }
      try {
        text = text.replaceAll(`"${from}"`, `"${to}"`);
        item.fulfilled = true;
      } catch {}
    }
    this.nodeTextReplacerItems.update((v) => [...v]);
    this.setNodeText(text);
    await this.message.snack("替换完成");
  }
  async removeNodeVars() {
    const text0 = await this.getNodeText();
    const table = this.nodeTextReplacerTable();
    if (!text0 || !table) {
      return;
    }
    const items = table.getSelectedItems();
    if (items.length < 1) {
      await this.message.error("没有选中");
      return;
    }
    let text = text0;
    for (const item of items) {
      const {from} = item;
      if (!from) {
        continue;
      }
      try {
        text = text.replaceAll(`"${from}"`, `""`);
        item.count = 0;
      } catch {}
    }
    this.nodeTextReplacerItems.update((v) => [...v]);
    this.setNodeText(text);
    await this.message.snack("替换完成");
  }
}
