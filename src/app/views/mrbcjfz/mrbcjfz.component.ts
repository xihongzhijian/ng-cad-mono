import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {KeyValuePipe, NgTemplateOutlet} from "@angular/common";
import {
  booleanAttribute,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChildren
} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {ActivatedRoute} from "@angular/router";
import {setGlobal, XiaodaohangStructure} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {FetchManager} from "@app/utils/fetch-manager";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openBancaiFormDialog} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, timeout, WindowMessageManager} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList, BancaiListData, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerComponent} from "@modules/spinner/components/spinner/spinner.component";
import {AppStatusService} from "@services/app-status.service";
import {clone, isEmpty, uniqueId, values} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, first, lastValueFrom} from "rxjs";
import {ClickStopPropagationDirective} from "../../modules/directives/click-stop-propagation.directive";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {
  ListItemKey,
  listItemKeys,
  MrbcjfzCadInfo,
  MrbcjfzDataSubmitEvent,
  MrbcjfzHuajianInfo,
  MrbcjfzInfo,
  MrbcjfzInputData,
  MrbcjfzListItem,
  MrbcjfzQiliaoInfo,
  MrbcjfzResponseData,
  MrbcjfzXinghao
} from "./mrbcjfz.types";
import {
  emptyMrbcjfzInfoValues,
  filterCad,
  filterHuajian,
  getEmptyMrbcjfzInfo,
  getMrbcjfzInfo,
  isMrbcjfzInfoEmpty1,
  isMrbcjfzInfoEmpty2,
  MrbcjfzXinghaoInfo
} from "./mrbcjfz.utils";

@Component({
  selector: "app-mrbcjfz",
  templateUrl: "./mrbcjfz.component.html",
  styleUrls: ["./mrbcjfz.component.scss"],
  imports: [
    CadImageComponent,
    CdkDrag,
    CdkDropList,
    ClickStopPropagationDirective,
    ImageComponent,
    InputComponent,
    KeyValuePipe,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    NgScrollbar,
    NgTemplateOutlet,
    SpinnerComponent
  ]
})
export class MrbcjfzComponent {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private status = inject(AppStatusService);

  @HostBinding("class") class = ["ng-page"];

  constructor() {
    setGlobal("mrbcjfz", this);
  }

  idIn = input(0, {alias: "id"});
  tableIn = input("", {alias: "table"});
  collection = input<CadCollection>();
  closeable = input(false, {transform: booleanAttribute});
  inputData = input<MrbcjfzInputData>();
  forceSubmit = input(false, {transform: booleanAttribute});
  mokuaiName = input<string>();
  cadWidth = input<number>();
  cadHeight = input<number>();
  dataSubmit = output<MrbcjfzDataSubmitEvent>();
  dataClose = output();
  refreshAfter = output();
  cadChange = output<CadData>();

  id = signal(0);
  idEff = effect(() => this.id.set(this.idIn()));
  table = signal("");
  tableEff = effect(() => this.table.set(this.tableIn()));

  cads = signal<ObjectOf<MrbcjfzCadInfo>>({});
  huajians = signal<ObjectOf<MrbcjfzHuajianInfo>>({});
  qiliaos = signal<ObjectOf<MrbcjfzQiliaoInfo>>({});
  bancaiKeys = signal<string[]>([]);
  bancaiKeysRequired: string[] = [];
  bancaiList: BancaiList[] = [];
  activeBancaiKey = signal<string | null>(null);
  xiaodaohangStructure: XiaodaohangStructure | null = null;
  isFromOrder = signal(false);
  noScroll = signal(false);
  wmm = new WindowMessageManager("默认板材及分组", this, window.parent);
  loaderId = uniqueId("mrbcjfz-loader-");
  activeBancai = computed(() => {
    const key = this.activeBancaiKey();
    if (!key) {
      return null;
    }
    return this.xinghao().默认板材[key];
  });

  xinghao = signal(new MrbcjfzXinghaoInfo(this.table(), {vid: 0, mingzi: ""}));
  updateXinghao0() {
    const xinghao = this.xinghao();
    this.xinghao.set(clone(xinghao));
  }
  updateXinghao1() {
    const xinghao = this.xinghao();
    xinghao.update();
    this.updateXinghao0();
  }
  updateXinghao2() {
    const xinghao = this.xinghao();
    const 默认板材 = xinghao.默认板材;
    xinghao.默认板材 = {};
    for (const key of this.bancaiKeys()) {
      const data = getMrbcjfzInfo(默认板材[key]);
      xinghao.默认板材[key] = data;
    }
    this.updateXinghao1();
  }

  bancaiListManager = new FetchManager(null, () => this.http.getBancaiList({fubanNumber: 9, withImg: true}, {spinner: this.loaderId}));
  refreshEff = effect(() => {
    this.inputData();
    untracked(() => this.refresh());
  });
  private _refreshLock$ = new BehaviorSubject<boolean>(false);
  async refresh() {
    if (this._refreshLock$.value) {
      await lastValueFrom(this._refreshLock$.pipe(first((v) => !v)));
    }
    this._refreshLock$.next(true);
    let resData: MrbcjfzResponseData | undefined;
    let id = this.id();
    let table = this.table();
    const collection = this.collection();
    const inputData = this.inputData();
    if (inputData) {
      if (inputData.resData) {
        this.isFromOrder.set(false);
        resData = inputData.resData;
      } else {
        this.isFromOrder.set(true);
        const noScroll = !!inputData.noScroll;
        this.noScroll.set(noScroll);
        if (noScroll) {
          if (!this.class.includes("no-scroll")) {
            this.class = [...this.class, "no-scroll"];
          }
        } else {
          this.class = this.class.filter((v) => v !== "no-scroll");
        }
      }
    } else {
      const params = this.route.snapshot.queryParams;
      if (!id || !table) {
        id = params.id ? Number(params.id) : 0;
        table = params.table || "";
        this.id.set(id);
        this.table.set(table);
        this.isFromOrder.set(!(id && table));
      } else {
        await timeout(0);
      }
    }
    if (this.isFromOrder()) {
      let data = inputData;
      this.bancaiKeys.set([]);
      let xinghaosRaw: TableDataBase[] | null;
      if (data) {
        xinghaosRaw = [];
      } else {
        data = await this.getData();
        xinghaosRaw = await this.http.queryMySql({table: "p_xinghao", filter: {where: {mingzi: data.xinghao}}}, {spinner: this.loaderId});
      }
      if (xinghaosRaw[0]) {
        this.xinghao.set(new MrbcjfzXinghaoInfo(table, xinghaosRaw[0]));
      } else {
        this.xinghao.set(new MrbcjfzXinghaoInfo(table, {vid: 0, mingzi: data.xinghao}));
      }
      let bancaiListData: BancaiListData | null;
      if (data.bancaiList) {
        bancaiListData = data.bancaiList;
      } else {
        bancaiListData = await this.bancaiListManager.fetch();
      }
      this.xiaodaohangStructure = {mingzi: "型号", table: "p_xinghao", gongneng: {jiegou: []}};
      if (bancaiListData) {
        this.bancaiList = bancaiListData.bancais;
        this.bancaiKeys.set(bancaiListData.bancaiKeys);
        this.bancaiKeysRequired = bancaiListData.bancaiKeysRequired;
      }
      const cadsAll = data.cads || [];
      const cadIds1 = cadsAll.map((v) => v.id);
      const cadIds2: string[] = [];
      const qiliaoIds1 = bancaiListData?.qiliaos || [];
      const qiliaoIds2: string[] = [];
      const huajianIds1 = (data.huajians || []).map((v) => String(v.vid));
      const huajianIds2: string[] = [];
      for (const key of this.bancaiKeys()) {
        if (!data.morenbancai[key]) {
          data.morenbancai[key] = getEmptyMrbcjfzInfo(key);
        }
        const info = data.morenbancai[key];
        info.CAD = info.CAD.filter((v) => cadIds1.includes(v));
        cadIds2.push(...info.CAD);
        info.企料 = info.企料.filter((v) => qiliaoIds1.includes(v));
        qiliaoIds2.push(...info.企料);
        info.花件 = info.花件.filter((v) => huajianIds1.includes(v));
        huajianIds2.push(...info.花件);
      }
      const xinghao = this.xinghao();
      xinghao.默认板材 = data.morenbancai;
      this.updateXinghao1();
      const cads: ReturnType<typeof this.cads> = {};
      for (const cad of cadsAll) {
        const info: MrbcjfzCadInfo = {id: cad.id, data: cad};
        info.selected = cadIds2.includes(cad.id);
        cads[cad.id] = info;
      }
      this.cads.set(cads);

      const qiliaos: ReturnType<typeof this.qiliaos> = {};
      for (const qiliao of bancaiListData?.qiliaos || []) {
        qiliaos[qiliao] = {id: qiliao, name: qiliao, selected: qiliaoIds2.includes(qiliao)};
      }
      this.qiliaos.set(qiliaos);

      const huajians: ReturnType<typeof this.huajians> = {};
      for (const huajian of data.huajians || []) {
        const vid = String(huajian.vid);
        huajians[vid] = {id: vid, data: huajian, selected: huajianIds2.includes(vid)};
      }
      this.huajians.set(huajians);
    } else {
      const data =
        resData ||
        (await this.http.getData<MrbcjfzResponseData>(
          "peijian/xinghao/bancaifenzuIndex",
          {table, id, collection, bancaiImg: true},
          {spinner: this.loaderId}
        ));
      if (data) {
        const xinghao = new MrbcjfzXinghaoInfo(table, data.xinghao);
        this.xinghao.set(xinghao);
        if (inputData) {
          xinghao.默认板材 = inputData.morenbancai;
        }
        this.bancaiKeys.set(data.bancaiKeys);
        this.bancaiKeysRequired = data.bancaiKeysRequired;
        this.xiaodaohangStructure = data.xiaodaohangStructure;
        const cads: ReturnType<typeof this.cads> = {};
        const cadsToRemove: MrbcjfzCadInfo[] = [];
        data.cads.forEach((v) => {
          const cadData = new CadData(v);
          const item: MrbcjfzCadInfo = {data: cadData, id: cadData.id};
          if (filterCad(item.data)) {
            cads[item.id] = item;
          } else {
            cadsToRemove.push(item);
          }
        });
        const cads2 = inputData?.cads;
        if (Array.isArray(cads2)) {
          for (const cad of cads2) {
            cads[cad.id] = {id: cad.id, data: cad};
          }
        }
        this.cads.set(cads);

        const huajians: ReturnType<typeof this.huajians> = {};
        const huajiansToRemove: MrbcjfzHuajianInfo[] = [];
        data.huajians.map((v) => {
          const item: MrbcjfzHuajianInfo = {data: v, id: String(v.vid)};
          if (filterHuajian(item.data, table)) {
            huajians[item.id] = item;
          } else {
            huajiansToRemove.push(item);
          }
        });
        this.huajians.set(huajians);

        const qiliaos: ReturnType<typeof this.qiliaos> = {};
        for (const qiliao of data.qiliaos) {
          qiliaos[qiliao] = {id: qiliao, name: qiliao};
        }
        this.qiliaos.set(qiliaos);

        const cadsRemoved: string[] = [];
        const huajiansRemoved: string[] = [];
        for (const bancaiKey in xinghao.默认板材) {
          const info = xinghao.默认板材[bancaiKey];
          const cadIds = info.CAD;
          info.CAD = [];
          for (const cadId of cadIds) {
            if (!cads[cadId]) {
              cadsRemoved.push(cadId);
              continue;
            }
            const item = cadsToRemove.find((v) => v.id === cadId);
            if (item && !cadsRemoved.includes(cadId)) {
              cadsRemoved.push(item.data.name);
            }
            info.CAD.push(cadId);
          }
          const huajianIds = info.花件;
          info.花件 = [];
          for (const huajianId of huajianIds) {
            if (!huajians[huajianId]) {
              huajiansRemoved.push(huajianId);
              continue;
            }
            const item = huajiansToRemove.find((v) => v.id === huajianId);
            if (item && !huajiansRemoved.includes(huajianId)) {
              huajiansRemoved.push(item.data.mingzi);
              continue;
            }
            info.花件.push(huajianId);
          }
        }
        this.bancaiList = data.bancaiList;
        this.updateXinghao2();
        this.updateListItems();
      }
    }
    this.refreshAfter.emit();
    this._refreshLock$.next(false);
  }

  async editBancaiForm(key: string) {
    const xinghao = this.xinghao();
    const info = xinghao.默认板材[key];
    const result = await openBancaiFormDialog(this.dialog, {
      data: {
        data: {
          bancai: info.默认开料板材,
          cailiao: info.默认开料材料,
          houdu: info.默认开料板材厚度,
          bancaiList: info.可选板材,
          cailiaoList: info.可选材料,
          houduList: info.可选厚度
        },
        bancaiList: this.bancaiList,
        bancaiListRefrersh: async () => {
          const bancaiList = (await this.bancaiListManager.fetch(true))?.bancais || [];
          this.bancaiList = bancaiList;
          return bancaiList;
        },
        key,
        extraInputInfos: [[xinghao.get板材分组别名InputInfo(key, true)]]
      }
    });
    if (result) {
      info.默认开料板材 = result.bancai;
      info.默认开料材料 = result.cailiao;
      info.默认开料板材厚度 = result.houdu;
      info.可选板材 = result.bancaiList || [];
      info.可选材料 = result.cailiaoList || [];
      info.可选厚度 = result.houduList || [];
    }
    this.updateXinghao1();
  }

  async emptyBancaiForm(key: string) {
    if (!(await this.message.confirm("是否确定清空？"))) {
      return;
    }
    const info = this.xinghao().默认板材[key];
    emptyMrbcjfzInfoValues(key, info, [
      "默认开料材料",
      "默认开料板材",
      "默认开料板材厚度",
      "CAD",
      "企料",
      "花件",
      "可选板材",
      "可选材料",
      "可选厚度",
      "板材分组别名",
      "允许修改",
      "独立变化",
      "不显示"
    ]);
    const activeBancaiKey = this.activeBancaiKey();
    if (activeBancaiKey) {
      this.selectBancaiKey(activeBancaiKey);
    }
    this.updateListItems();
    this.updateXinghao0();
  }

  validateBancai(key: string, info: MrbcjfzInfo) {
    const errors: ValidationErrors = {};
    if (!isMrbcjfzInfoEmpty1(key, info) || this.bancaiKeysRequired.includes(key)) {
      if (isMrbcjfzInfoEmpty2(key, info)) {
        errors.required = true;
      }
    }
    return errors;
  }

  getBancaiClass(key: string) {
    const info = this.xinghao().默认板材[key];
    const classes = [];
    if (!isEmpty(this.validateBancai(key, info))) {
      classes.push("error");
    }
    return classes;
  }

  selectBancaiKey(key: string) {
    if (this.activeBancaiKey() !== key) {
      this.activeBancaiKey.set(key);
      this.updateListItems();
    }
  }

  getList(key: ListItemKey) {
    return this[listItemKeysMap[key]];
  }

  updateListItems(key?: ListItemKey) {
    if (!key) {
      for (const key2 of listItemKeys) {
        this.updateListItems(key2);
      }
      return;
    }
    const ids = new Set<string>();
    for (const bancai of Object.values(this.xinghao().默认板材)) {
      for (const id of bancai[key]) {
        ids.add(id);
      }
    }
    const listSignal = this.getList(key);
    const list = {...listSignal()};
    for (const item of values(list)) {
      item.selected = ids.has(item.id);
    }
    listSignal.set(list as any);
  }

  selectListItem(item: MrbcjfzListItem, key: ListItemKey, bancaiKey?: string) {
    if (bancaiKey) {
      this.selectBancaiKey(bancaiKey);
    }
    const bancai = this.activeBancai();
    if (!bancai) {
      return;
    }
    if (bancai[key].includes(item.id)) {
      bancai[key] = bancai[key].filter((v) => v !== item.id);
    } else {
      bancai[key].push(item.id);
    }
    this.updateListItems(key);
  }

  bancaiInputComponents = viewChildren(InputComponent);
  checkSubmit() {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return [];
    }
    const errorMsg: string[] = [];
    const errorBancaiKeys: string[] = [];
    for (const bancaiKey in xinghao.默认板材) {
      const info = xinghao.默认板材[bancaiKey];
      const errors = this.validateBancai(bancaiKey, info);
      if (!isEmpty(errors)) {
        errorBancaiKeys.push(bancaiKey);
      }
    }
    if (errorBancaiKeys.length) {
      errorMsg.push(`板材信息不完整：${errorBancaiKeys.join("，")}`);
    }
    const inputData = this.inputData();
    const isFromOrder = this.isFromOrder();
    if (inputData || !isFromOrder) {
      if (Object.values(this.cads()).some((v) => !v.selected)) {
        errorMsg.push("有CAD未选择");
      }
      if (Object.values(this.huajians()).some((v) => !v.selected)) {
        errorMsg.push("有花件未选择");
      }
    }
    const errorMsg2 = new Set<string>();
    this.bancaiInputComponents().forEach((v) => {
      v.validateValue();
      const errorMsg3 = v.getErrorMsg();
      if (errorMsg3) {
        errorMsg2.add(v.info().label + errorMsg3);
      }
    });
    if (errorMsg2.size > 0) {
      errorMsg.push(`板材输入有误：${Array.from(errorMsg2).join("，")}`);
    }
    return errorMsg;
  }

  async submit() {
    let result = false;
    const xinghao = this.xinghao();
    if (!xinghao) {
      return result;
    }
    const errors = this.checkSubmit();
    if (errors.length && !this.forceSubmit) {
      await this.message.error(errors.join("<br>"));
      return result;
    }
    if (this.inputData()) {
      result = true;
    } else {
      const data: TableUpdateParams<MrbcjfzXinghao>["data"] = {vid: xinghao.raw.vid};
      data.morenbancai = JSON.stringify(xinghao.默认板材);
      if (this.isFromOrder()) {
        const response = await this.http.post(
          "peijian/api/updateMorenbancaijifenzu",
          {
            name: xinghao.raw.mingzi,
            morenbancai: xinghao.默认板材
          },
          {spinner: this.loaderId}
        );
        result = response?.code === 0;
      } else {
        const table = this.table();
        result = !!(await this.http.tableUpdate({table, data}, {spinner: this.loaderId}));
      }
    }
    this.dataSubmit.emit({data: xinghao, errors});
    return result;
  }

  close() {
    this.dataClose.emit();
  }

  async openCad(item: MrbcjfzListItem) {
    const mokuaiName = this.mokuaiName();
    if (mokuaiName) {
      const data0 = this.cads()[item.id].data;
      const data = data0.clone();
      const result = await openCadEditorDialog(this.dialog, {data: {data, query: {模块: mokuaiName}}});
      if (result?.savedData) {
        Object.assign(data0, data);
        this.cadChange.emit(data0);
      }
    } else {
      this.status.openCadInNewTab(item.id, "cad");
    }
  }

  async getData() {
    this.wmm.postMessage("getDataStart");
    return await this.wmm.waitForMessage<MrbcjfzInputData>("getDataEnd");
  }

  postDataStart() {
    return {action: "postDataEnd"};
  }

  async submitStart() {
    const fulfilled = await this.submit();
    return {action: "submitEnd", data: {fulfilled}};
  }

  returnZero() {
    return 0;
  }

  dropListItem(event: CdkDragDrop<MrbcjfzInfo[ListItemKey]>, key1: string, key2: ListItemKey) {
    const list = this.xinghao().默认板材[key1][key2];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.updateXinghao0();
  }
}

export const listItemKeysMap = {
  CAD: "cads",
  企料: "qiliaos",
  花件: "huajians"
} as const;
