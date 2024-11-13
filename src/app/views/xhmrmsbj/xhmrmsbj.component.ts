import {KeyValuePipe, NgTemplateOutlet} from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {DomSanitizer} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {getValueString, remoteFilePath, session, setGlobal, timer} from "@app/app.common";
import {CalcResult, Formulas} from "@app/utils/calc";
import {FetchManager} from "@app/utils/fetch-manager";
import {getTrbl} from "@app/utils/trbl";
import mokuaidaxiaoData from "@assets/json/mokuaidaxiao.json";
import {MokuaiItem, MokuaiItemCloseEvent} from "@components/bujumokuai/mokuai-item/mokuai-item.types";
import {MokuaikuComponent} from "@components/bujumokuai/mokuaiku/mokuaiku.component";
import {MokuaikuCloseEvent} from "@components/bujumokuai/mokuaiku/mokuaiku.types";
import {BjmkStatusService} from "@components/bujumokuai/services/bjmk-status.service";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {Step1Data, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {
  getFromulasFromString,
  getMokuaiTitle,
  getMokuaiTitleWithUrl,
  getNodeVars,
  getStep1Data,
  isMokuaiItemEqual,
  replaceMenshanName,
  updateMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {FormulasValidatorFn} from "@components/formulas-editor/formulas-editor.types";
import {FormulasComponent} from "@components/formulas/formulas.component";
import {MkdxpzEditorComponent} from "@components/mkdxpz-editor/mkdxpz-editor.component";
import {MkdxpzEditorCloseEvent, MkdxpzEditorData} from "@components/mkdxpz-editor/mkdxpz-editor.types";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {VarNameItem} from "@components/var-names/var-names.types";
import {XhmrmsbjSbjbComponent} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.component";
import {environment} from "@env";
import {getElementVisiblePercentage, keysOf, ObjectOf, Point, queryString, Rectangle, timeout, WindowMessageManager} from "@lucilor/utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo, InputInfoOptions} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {MrbcjfzInfo, MrbcjfzXinghao} from "@views/mrbcjfz/mrbcjfz.types";
import {isMrbcjfzInfoEmpty1, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {MsbjComponent} from "@views/msbj/msbj.component";
import {MsbjCloseEvent, MsbjData, Node2rectData, node2rectDataMsdxKeys} from "@views/msbj/msbj.types";
import {getEmpty模块大小配置, getNodeFormulasKeys, justify模块大小配置, MsbjInfo} from "@views/msbj/msbj.utils";
import {LastSuanliao} from "@views/suanliao/suanliao.types";
import {resetInputs} from "@views/suanliao/suanliao.utils";
import {getFormulaInfos, openXhmrmsbjMokuaisDialog} from "@views/xhmrmsbj-mokuais/xhmrmsbj-mokuais.component";
import {cloneDeep, debounce, intersection} from "lodash";
import md5 from "md5";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, filter, firstValueFrom, Subject} from "rxjs";
import {MokuaiItemComponent} from "../../components/bujumokuai/mokuai-item/mokuai-item.component";
import {MenfengPeizhiComponent} from "../../components/menfeng-peizhi/menfeng-peizhi.component";
import {TypedTemplateDirective} from "../../modules/directives/typed-template.directive";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {InputComponent} from "../../modules/input/components/input.component";
import {
  MenshanKey,
  menshanKeys,
  Shuruzhi,
  XhmrmsbjCloseEvent,
  XhmrmsbjDataMsbjInfos,
  XhmrmsbjInfo,
  XhmrmsbjRequestData,
  XhmrmsbjTableData,
  XhmrmsbjTabName,
  xhmrmsbjTabNames
} from "./xhmrmsbj.types";
import {
  getMokuaiFormulas,
  getMokuaiShuchuVars,
  getShuruzhi,
  purgeMsbjInfo,
  setMokuaiShuchuVars,
  setShuruzhi,
  XhmrmsbjData
} from "./xhmrmsbj.utils";

const table = "p_xinghaomorenmenshanbuju";
@Component({
  selector: "app-xhmrmsbj",
  templateUrl: "./xhmrmsbj.component.html",
  styleUrls: ["./xhmrmsbj.component.scss"],
  standalone: true,
  imports: [
    ClickStopPropagationDirective,
    FloatingDialogModule,
    FormsModule,
    FormulasComponent,
    ImageComponent,
    InputComponent,
    KeyValuePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatIconModule,
    MatSlideToggleModule,
    MenfengPeizhiComponent,
    MkdxpzEditorComponent,
    MokuaiItemComponent,
    MokuaikuComponent,
    MsbjComponent,
    MsbjRectsComponent,
    NgScrollbar,
    NgTemplateOutlet,
    TypedTemplateDirective,
    XhmrmsbjSbjbComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XhmrmsbjComponent implements OnInit, OnDestroy {
  private bjmkStatus = inject(BjmkStatusService);
  private calc = inject(CalcService);
  private dialog = inject(MatDialog);
  private domSanitizer = inject(DomSanitizer);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghaoId = input(-1);
  closable = input(false, {transform: booleanAttribute});
  closeOut = output<XhmrmsbjCloseEvent>({alias: "close"});

  msbjsCache = signal<MsbjInfo[]>([]);
  msbjs = computed(() => {
    if (this.isFromOrder()) {
      return this.msbjsCache();
    }
    return this.bjmkStatus.msbjsManager.items();
  });
  table = signal("");
  id = signal(-1);
  isFromOrder = signal(false);
  tableData = signal<XhmrmsbjTableData | null>(null);
  data = signal<XhmrmsbjData | null>(null);
  step1Data: Step1Data = {options: {}, typesInfo: {}};
  mokuais: ZixuanpeijianMokuaiItem[] = [];
  xinghao = signal<MrbcjfzXinghaoInfo | null>(null);
  xinghaoVars = computed(() => getFromulasFromString(this.xinghao()?.raw.gongshishuru));
  urlPrefix = remoteFilePath;
  rectInfos = computed(() => {
    const infos = this.activeMsbj()?.peizhishuju?.["模块节点"] || [];
    return infos;
  });

  mokuaiTemplateType!: {$implicit: ZixuanpeijianMokuaiItem};
  menshanKeys: MenshanKey[] = menshanKeys.slice();
  materialResult = signal<Formulas>({});
  houtaiUrl = "";
  mokuaidaxiaoResults = signal<ObjectOf<Formulas>>({});
  wmm = new WindowMessageManager("门扇模块", this, window.parent);
  suanliaoLock$ = new BehaviorSubject(false);
  genXiaoguotuLock$ = new BehaviorSubject(false);
  production = environment.production;

  msbjRectsComponent = viewChild(MsbjRectsComponent);
  xiaoguotuContainer = viewChild<ElementRef<HTMLDivElement>>("xiaoguotuContainer");
  sbjb = viewChild(XhmrmsbjSbjbComponent);
  sbjbItems = computed(() => this.sbjb()?.items() || []);
  mfpz = viewChild(MenfengPeizhiComponent);

  constructor() {
    setGlobal("xhmrmsbj", this);
  }

  ngOnInit() {
    this.refresh();
  }
  ngOnDestroy() {
    this.wmm.destroy();
  }

  async refresh() {
    const params = this.route.snapshot.queryParams;
    const {token} = params;
    const id = Number(params.id);
    const xinghaoId = this.xinghaoId();
    const getXinghao = async (vid: string) => {
      if (!vid) {
        return null;
      }
      const xinghaos = await this.http.queryMySql<MrbcjfzXinghao>({
        table: "p_xinghao",
        filter: {where: {vid}}
      });
      return xinghaos.at(0) || null;
    };
    let xinghao: MrbcjfzXinghao | null = null;
    if (table && (id > 0 || xinghaoId > 0)) {
      this.table.set(table);
      this.id.set(id);
      this.isFromOrder.set(false);
      const where = xinghaoId > 0 ? {xinghao: xinghaoId} : {vid: id};
      const records = await this.http.queryMySql<XhmrmsbjTableData>({table, filter: {where}});
      let record = records.at(0) || null;
      if (!record && xinghaoId > 0) {
        xinghao = await getXinghao(String(xinghaoId));
        if (xinghao) {
          record = await this.http.tableInsert<XhmrmsbjTableData>({table, data: {mingzi: xinghao.mingzi, xinghao: String(xinghaoId)}});
        }
      }
      this.tableData.set(record);
    } else if (token) {
      this.isFromOrder.set(true);
    }
    if (!this.isFromOrder()) {
      const step1Data = await getStep1Data(this.http);
      this.setStep1Data(step1Data);
      await this.bjmkStatus.msbjsManager.fetch();
      const tableData = this.tableData();
      const data = tableData ? new XhmrmsbjData(tableData, this.menshanKeys, this.step1Data.typesInfo, this.msbjs()) : null;
      this.data.set(data);
      xinghao = await getXinghao(tableData?.xinghao || "");
      this.xinghao.set(xinghao ? new MrbcjfzXinghaoInfo(table, xinghao) : null);
    }
    await timeout(0);
    if (this.isFromOrder()) {
      this.wmm.postMessage("requestDataStart");
    } else {
      this.activeMenshanKey.set(this.menshanKeys[0]);
    }
  }

  setStep1Data(step1Data: Step1Data | null) {
    this.mokuais = [];
    if (!step1Data) {
      return;
    }
    this.step1Data = step1Data;
    for (const type1 in step1Data.typesInfo) {
      for (const type2 in step1Data.typesInfo[type1]) {
        const info = step1Data.typesInfo[type1][type2];
        this.mokuais.push({...info, type1, type2, totalWidth: "", totalHeight: "", cads: []});
      }
    }
  }

  refreshData(deep = false) {
    this.data.update((v) => (v ? v.clone(deep) : null));
  }

  user = signal<XhmrmsbjRequestData["user"]>(null);
  isZhijian = computed(() => this.user()?.经销商名字 === "至简软件");
  opts = signal<XhmrmsbjRequestData["opts"]>(undefined);
  isFloatingDialog = computed(() => !!this.opts()?.浮动弹窗);
  async requestDataEnd(data: XhmrmsbjRequestData) {
    const {型号选中门扇布局, 型号选中板材, materialResult, menshanKeys, 铰扇跟随锁扇} = data;
    const {houtaiUrl, id, user, localServerUrl, menshanbujus, step1Data, 模块通用配置} = data;
    if (typeof localServerUrl === "string") {
      this.urlPrefix = localServerUrl;
    }
    this.msbjsCache.set(
      menshanbujus.map((v) => {
        const result = new MsbjInfo(v, this.getNode2rectData());
        result.peizhishuju = v.peizhishuju as any;
        return result;
      })
    );
    this.setStep1Data(step1Data);
    const data2 = new XhmrmsbjData(
      {
        vid: id,
        mingzi: "1",
        peizhishuju: JSON.stringify(型号选中门扇布局),
        jiaoshanbujuhesuoshanxiangtong: 铰扇跟随锁扇 ? 1 : 0,
        zuoshujubanben: String(materialResult.做数据版本)
      },
      menshanKeys,
      this.step1Data.typesInfo,
      this.msbjs()
    );
    this.data.set(data2);
    this.materialResult.set(materialResult);
    this.houtaiUrl = houtaiUrl;
    this.id.set(id);
    this.user.set(user);
    this.opts.set(data.opts);
    this.menshanKeys = menshanKeys;
    this.tongyongFormulasCache = 模块通用配置 || null;
    const xinghao = new MrbcjfzXinghaoInfo(this.table(), {vid: 1, mingzi: String(materialResult.型号)});
    xinghao.默认板材 = 型号选中板材;
    this.xinghao.set(xinghao);
    const 浮动弹窗 = data.opts?.浮动弹窗;
    if (浮动弹窗) {
      this.activeMenshanKey.set(浮动弹窗.门扇名字);
      await timeout(0);
      this.selectMsbjRect(浮动弹窗.节点名字);
    } else if (!this.activeMenshanKey()) {
      this.activeMenshanKey.set(this.menshanKeys[0]);
    }
  }

  submitDataStart() {
    const result = {action: "submitDataEnd", data: {} as any};
    const data = this.data();
    if (data) {
      if (data.铰扇跟随锁扇) {
        for (const key of keysOf(data.menshanbujuInfos)) {
          if (key.includes("铰扇")) {
            const key2 = key.replace("铰扇", "锁扇") as MenshanKey;
            data.menshanbujuInfos[key] = cloneDeep(data.menshanbujuInfos[key2]);
          }
        }
      }
      result.data = {
        型号选中门扇布局: data.menshanbujuInfos,
        铰扇跟随锁扇: data.铰扇跟随锁扇
      };
    }
    return result;
  }

  async 保存模块大小(data: {inputValues: Formulas}) {
    const activeMsbjInfo = this.activeMsbjInfo();
    if (activeMsbjInfo) {
      const md5Prev = md5(JSON.stringify(activeMsbjInfo.模块大小输入 || {}));
      activeMsbjInfo.模块大小输入 = data.inputValues;
      const md5Curr = md5(JSON.stringify(activeMsbjInfo.模块大小输入));
      if (md5Prev !== md5Curr) {
        await this.suanliao();
      }
    }
  }

  returnZero() {
    return 0;
  }

  validateMorenbancai(morenbancai: ObjectOf<MrbcjfzInfo> | null) {
    if (!morenbancai) {
      return true;
    }
    if (this.isFromOrder()) {
      return true;
    }
    return Object.entries(morenbancai).every(([k, v]) => isMrbcjfzInfoEmpty1(k, v) || v.默认对应板材分组);
  }

  activeMenshanKey = signal<MenshanKey | null>(null);
  activeMsbjInfo = computed(() => {
    const key = this.activeMenshanKey();
    const data = this.data();
    if (key) {
      return data?.menshanbujuInfos[key];
    }
    return undefined;
  });
  activeMokuaiNode = computed(() => {
    this.data();
    const activeRectInfo = this.activeRectInfo();
    return this.activeMsbjInfo()?.模块节点?.find((v) => v.层id === activeRectInfo?.raw.vid);
  });
  activeMorenbancai = computed(() => {
    this.data();
    return this.activeMokuaiNode()?.选中模块?.morenbancai || {};
  });
  activeMokuaidaxiaoResult = computed(() => {
    const key = this.activeMenshanKey();
    if (key) {
      return this.mokuaidaxiaoResults()[key] || {};
    } else {
      return {};
    }
  });
  activeMokuaidaxiaoResultEff = effect(
    () => {
      const key = this.activeMenshanKey();
      if (key) {
        const value = this.activeMokuaidaxiaoResult();
        this.mokuaidaxiaoResults.update((v) => ({...v, [key]: value}));
      }
    },
    {allowSignalWrites: true}
  );

  activeMsbj = computed(() => {
    const info = this.activeMsbjInfo();
    const vid = info?.选中布局数据?.vid;
    return cloneDeep(this.msbjs().find((item) => item.vid === vid) || null);
  });
  activeRectInfo = signal<MsbjRectInfo | null>(null);
  activeMsbjEff = effect(async () => {
    this.activeMsbj();
    untracked(async () => {
      this.activeRectInfo.set(null);
      const msbjInfo = this.activeMsbjInfo();
      await timeout(0);
      if (msbjInfo) {
        if (!msbjInfo.模块节点) {
          msbjInfo.模块节点 = [];
        }
        const rectInfos = this.msbjRectsComponent()?.rectInfosAbsolute() || [];
        msbjInfo.模块节点 = msbjInfo.模块节点.filter((v) =>
          rectInfos.find((rectInfo) => rectInfo.raw.isBuju && rectInfo.raw.vid === v.层id)
        );
        for (const rectInfo of rectInfos) {
          if (rectInfo.raw.isBuju) {
            const node = msbjInfo.模块节点.find((v) => v.层id === rectInfo.raw.vid);
            if (node) {
              node.层名字 = rectInfo.name;
            } else {
              msbjInfo.模块节点.push({层id: rectInfo.raw.vid, 层名字: rectInfo.name, 可选模块: []});
            }
          }
        }
      }

      await this.updateMokuaidaxiaoResults();
    });
  });

  selectMsbjRect(name: string) {
    const msbjRectsComponent = this.msbjRectsComponent();
    if (msbjRectsComponent && name) {
      const rectInfo = msbjRectsComponent.rectInfosRelative().find((v) => v.name === name);
      this.activeRectInfo.set(rectInfo || null);
    }
  }

  async refreshMokuaidaxiaoResults(menshanKey: MenshanKey) {
    const msbjInfo = this.data()?.menshanbujuInfos[menshanKey];
    if (!msbjInfo) {
      throw new Error("没有门扇布局");
    }
    this.wmm.postMessage("refreshMokuaidaxiaoResultsStart", {menshanKey, msbjInfo});
    return await this.wmm.waitForMessage<{values: Formulas}>("refreshMokuaidaxiaoResultsEnd");
  }

  async updateMokuaidaxiaoResults() {
    for (const menshanKey of this.menshanKeys) {
      const msbjInfo = this.data()?.menshanbujuInfos[menshanKey];
      if (!this.isFromOrder() || !msbjInfo) {
        return;
      }
      if (msbjInfo.选中布局数据) {
        const {模块大小关系, 模块大小配置} = msbjInfo.选中布局数据;
        if (模块大小配置) {
          this.mokuaidaxiaoResults.update((v) => ({...v, [menshanKey]: msbjInfo.模块大小输出 || {}}));
        } else if (模块大小关系) {
          const gongshiObj = msbjInfo.选中布局数据.模块大小关系 || {};
          if (!gongshiObj.门扇调整) {
            gongshiObj.门扇调整 = Object.values(gongshiObj)[0];
          }
          if (!gongshiObj.配置) {
            gongshiObj.配置 = {};
          }
          const {values} = await this.refreshMokuaidaxiaoResults(menshanKey);
          this.mokuaidaxiaoResults.update((v) => ({...v, [menshanKey]: values}));
        }
      }
    }
  }

  async setMsbj() {
    const infos = this.data()?.menshanbujuInfos;
    const menshanweizhi = this.activeMenshanKey();
    if (!menshanweizhi || !infos) {
      return;
    }
    const {选中布局数据} = infos[menshanweizhi] || {};
    const checkedVids: number[] = [];
    if (选中布局数据?.vid) {
      checkedVids.push(选中布局数据.vid);
    }
    const result = await openCadOptionsDialog(this.dialog, {
      data: {name: "p_menshanbuju", filter: {guanlianCN: {menshanweizhi}}, checkedVids, typeFiltering: {field: "fenlei", title: "分类"}}
    });
    if (result && infos[menshanweizhi]) {
      const targetMsbj = result.options[0];
      const msbj = targetMsbj ? this.msbjs().find((v) => v.vid === targetMsbj.vid) : null;
      if (msbj) {
        infos[menshanweizhi].选中布局 = msbj.vid;
        infos[menshanweizhi].选中布局数据 = {
          vid: msbj.vid,
          name: msbj.name,
          模块大小关系: msbj.peizhishuju.模块大小关系,
          模块大小配置: msbj.peizhishuju.模块大小配置
        };
      } else {
        delete infos[menshanweizhi].选中布局;
        delete infos[menshanweizhi].选中布局数据;
      }
      this.refreshData(true);
    }
  }

  generateRectsEnd() {
    const msbjRectsComponent = this.msbjRectsComponent();
    if (msbjRectsComponent?.rectInfos) {
      const rectInfos = msbjRectsComponent.rectInfosRelative().filter((v) => v.raw.isBuju);
      const activeRectInfo = this.activeRectInfo();
      let rectInfo = activeRectInfo ? rectInfos.find((v) => v.raw.vid === activeRectInfo?.raw.vid) : null;
      if (!rectInfo) {
        rectInfo = msbjRectsComponent.rectInfosRelative().filter((v) => v.raw.isBuju)[0];
      }
      if (rectInfo) {
        this.activeRectInfo.set(rectInfo);
      }
    }
  }

  kexuanmokuaisScrollbar = viewChild<NgScrollbar>("kexuanmokuaisScrollbar");
  async selectMokuai(mokuai: ZixuanpeijianMokuaiItem | null | undefined) {
    const mokuaiNode = this.activeMokuaiNode();
    const rectInfo = this.activeRectInfo();
    if (!mokuai || !mokuaiNode || !rectInfo) {
      return;
    }
    const mokuaiPrev = mokuaiNode.选中模块;
    this.data()?.setSelectedMokuai(mokuaiNode, mokuai, this.isFromOrder());
    this.refreshData();
    const mokuaiCurr = mokuaiNode.选中模块;
    this.scrollToMokuai(mokuaiCurr);
    if (!mokuaiPrev || !mokuaiCurr || !isMokuaiItemEqual(mokuaiPrev, mokuaiCurr)) {
      await this.suanliao();
    }
  }
  scrollToMokuai(mokuai: ZixuanpeijianMokuaiItem | null | undefined) {
    const scrollbar = this.kexuanmokuaisScrollbar();
    if (scrollbar && mokuai) {
      const mokuaiEl = scrollbar.nativeElement.querySelector(`[data-id="${mokuai.weiyima}"]`);
      if (mokuaiEl instanceof HTMLElement && getElementVisiblePercentage(mokuaiEl, scrollbar.nativeElement) <= 0.1) {
        scrollbar.scrollToElement(mokuaiEl);
      }
    }
  }

  async removeMokuai(mokuai: ZixuanpeijianMokuaiItem | null | undefined) {
    const node = this.activeMokuaiNode();
    if (!node) {
      return;
    }
    if (await this.message.confirm("是否删除该可选模块？")) {
      const mokuais = node.可选模块.filter((v) => v.id !== mokuai?.id);
      await this.setKexuanmokuai(mokuais);
    }
  }

  setDefaultMokuai(mokuai: ZixuanpeijianMokuaiItem | null) {
    const mokuaiNode = this.activeMokuaiNode();
    if (!mokuaiNode) {
      return;
    }
    this.data()?.setDefaultMokuai(mokuaiNode, mokuai?.id);
    this.refreshData();
  }

  tongyongFormulasCache: Formulas | null = null;
  tongyongFormulasManager = new FetchManager({}, async () => {
    if (this.tongyongFormulasCache) {
      return this.tongyongFormulasCache;
    }
    const data = await this.http.getData<Formulas>("ngcad/getMokuaiTongyongPeizhi");
    return data || {};
  });
  getValueInfo(key: string, slgs: Formulas, shuruzhi: Shuruzhi = {}) {
    if (key in shuruzhi) {
      return {value: shuruzhi[key], type: "输入值"};
    }
    const mokuaidaxiaoResult = this.activeMokuaidaxiaoResult();
    const tongyongFormulas = this.tongyongFormulasManager.data();
    const list: [string, Formulas][] = [
      ["模块大小关系值", mokuaidaxiaoResult],
      ["型号输入值", this.xinghaoVars()],
      ["模块公式值", slgs],
      ["通用公式值", tongyongFormulas]
    ];
    for (const [type, formulas] of list) {
      if (!(key in formulas)) {
        continue;
      }
      const value = String(formulas[key]);
      return {value, type};
    }
    return {value: "", type: "空值"};
  }
  async getValueInfo2(key: string, slgs: Formulas, shuruzhi: Shuruzhi = {}) {
    await this.tongyongFormulasManager.fetch();
    return this.getValueInfo(key, slgs, shuruzhi);
  }
  mokuaiInputInfosInput = computed(() => {
    const msbjInfo = this.activeMsbjInfo();
    const node = this.activeMokuaiNode();
    const mokuai = node?.选中模块;
    const infos: InputInfo[] = [];
    if (!mokuai || !msbjInfo) {
      return infos;
    }
    const mokuaidaxiaoResult = this.activeMokuaidaxiaoResult();
    const keyMap = {总宽: "totalWidth", 总高: "totalHeight"} as const;
    const isVersion2024 = this.data()?.isVersion2024;
    if (!isVersion2024) {
      const name = node.层名字;
      for (const key in keyMap) {
        const key3 = name + key;
        infos.push({
          type: "string",
          label: key,
          model: {key: key3, data: () => mokuaidaxiaoResult},
          readonly: true
        });
      }
    }
    const arr = mokuai.gongshishuru.concat(mokuai.xuanxiangshuru);
    const getValidators = (key: string, slgs: Formulas, shuruzhi?: Shuruzhi): InputInfo["validators"] => {
      return () => {
        if (!isVersion2024) {
          return null;
        }
        const valueInfo2 = this.getValueInfo(key, slgs, shuruzhi);
        if (!valueInfo2.value) {
          return {required: true};
        }
        return null;
      };
    };
    const onChange = async (v: string[], val: string, slgs: Formulas, info: InputInfo, xxgsId?: string) => {
      const shuruzhi = getShuruzhi(msbjInfo, xxgsId);
      if (val) {
        shuruzhi[v[0]] = val;
      } else {
        delete shuruzhi[v[0]];
      }
      setShuruzhi(msbjInfo, shuruzhi, xxgsId);
      const valueInfo = this.getValueInfo(v[0], slgs, shuruzhi);
      info.value = valueInfo.value;
      info.hint = valueInfo.type;

      const data = this.data();
      const activeMenshanKey = this.activeMenshanKey();
      const varNames = mokuai.shuchubianliang;
      if (this.isFromOrder()) {
        varNames.push(...(await this.getVarNames()));
      }
      const isShuchubianliang = varNames.includes(v[0]);
      const updateMenshanKeys = new Set<string>();
      if (data && activeMenshanKey) {
        for (const key of keysOf(data.menshanbujuInfos)) {
          const msbjInfo2 = data.menshanbujuInfos[key];
          if (!msbjInfo2) {
            continue;
          }
          for (const node2 of msbjInfo2.模块节点 || []) {
            const mokuai2 = node2.选中模块;
            if (mokuai2) {
              const isCurrent = key === activeMenshanKey && node?.层名字 === node2.层名字;
              if (!isCurrent) {
                setShuruzhi(msbjInfo2, shuruzhi, xxgsId);
              }
              if (msbjInfo2 && (isShuchubianliang || isCurrent)) {
                if (v[0] in (msbjInfo2.模块大小输出 || {})) {
                  if (!msbjInfo2.模块大小输入) {
                    msbjInfo2.模块大小输入 = {};
                  }
                  msbjInfo2.模块大小输入[v[0]] = v[1];
                  updateMenshanKeys.add(key);
                }
              }
            }
          }
        }
      }

      if (updateMenshanKeys.size > 0) {
        await this.updateOrder();
      }
      if (!(await this.suanliao())) {
        this.refreshData();
      }
    };
    for (const v of arr) {
      const xxgsList = mokuai.xuanxianggongshi.filter((v2) => v[0] in v2.公式);
      if (xxgsList.length > 0) {
        for (const item of xxgsList) {
          const 输入值 = msbjInfo.选项公式输入值?.[item._id];
          const valueInfo = this.getValueInfo(v[0], item.公式, 输入值);
          infos.push({
            type: "string",
            label: `【${item.名字}】${v[0]}`,
            value: valueInfo.value,
            clearable: true,
            validators: getValidators(v[0], item.公式, 输入值),
            hint: valueInfo.type,
            onChange: async (val, info) => {
              onChange(v, val, item.公式, info, item._id);
            }
          });
        }
      } else {
        const valueInfo = this.getValueInfo(v[0], mokuai.suanliaogongshi, msbjInfo.输入值);
        infos.push({
          type: "string",
          label: v[0],
          value: valueInfo.value,
          clearable: true,
          validators: getValidators(v[0], mokuai.suanliaogongshi, msbjInfo.输入值),
          hint: valueInfo.type,
          onChange: async (val, info) => {
            onChange(v, val, mokuai.suanliaogongshi, info);
          }
        });
      }
    }
    return infos;
  });
  mokuaiInputInfosOutput = computed(() => {
    const data = this.data();
    const msbjInfo = this.activeMsbjInfo();
    const node = this.activeMokuaiNode();
    const mokuai = node?.选中模块;
    const infos: {key: string; disabled: boolean; duplicate: boolean}[] = [];
    if (!mokuai || !msbjInfo || !data) {
      return infos;
    }
    const varsOthersEnabled = new Set<string>();
    const activeMenshanKey = this.activeMenshanKey();
    for (const key of keysOf(data.menshanbujuInfos)) {
      const msbjInfo2 = data.menshanbujuInfos[key];
      if (!msbjInfo2) {
        continue;
      }
      for (const node2 of msbjInfo2.模块节点 || []) {
        const mokuai2 = node2.选中模块;
        if (mokuai2) {
          const isCurrent = key === activeMenshanKey && node?.层名字 === node2.层名字;
          if (!isCurrent) {
            const varsEnabled2 = getMokuaiShuchuVars(msbjInfo2, node2, mokuai2);
            for (const varName of varsEnabled2) {
              varsOthersEnabled.add(varName);
            }
          }
        }
      }
    }
    const varsEnabled = getMokuaiShuchuVars(msbjInfo, node, mokuai);
    for (const key of mokuai.shuchubianliang) {
      const disabled = !varsEnabled.includes(key);
      const duplicate = !disabled && varsOthersEnabled.has(key);
      infos.push({key, disabled, duplicate});
    }
    return infos;
  });
  mokuaiXuanxiangAll = computed(() => this.activeMokuaiNode()?.选中模块?.自定义数据?.选项数据 || []);
  mokuaiXuanxiang = computed(() => this.mokuaiXuanxiangAll().filter((v) => v.可选项.length > 0));
  mokuaiInputInfosFormulas = computed(() => {
    const data = this.data();
    const msbjInfo = this.activeMsbjInfo();
    const node = this.activeMokuaiNode();
    const mokuai = node?.选中模块;
    const infos: InputInfo[] = [];
    if (!data || !msbjInfo || !mokuai) {
      return infos;
    }
    const names = mokuai.自定义数据?.下单显示?.split("+") || [];
    const formulas = data.getCommonFormulas();
    Object.assign(formulas, getNodeVars(msbjInfo?.选中布局数据?.模块大小配置?.算料公式 || {}, node.层名字));
    Object.assign(formulas, mokuai.suanliaogongshi);
    replaceMenshanName(this.activeMenshanKey(), formulas);
    for (const [key] of mokuai.gongshishuru) {
      formulas[key] = this.getValueInfo(key, mokuai.suanliaogongshi, msbjInfo.输入值).value;
    }
    const vars = this.lastSuanliaoManager.data()?.output.materialResult || {};
    try {
      const res = this.calc.calc.calcFormulas(formulas, vars);
      Object.assign(formulas, res.succeedTrim);
    } catch {}
    for (const name of names) {
      if (!name) {
        continue;
      }
      infos.push({type: "string", label: name, readonly: true, value: getValueString(formulas[name])});
    }
    return infos;
  });
  bancaiInputInfos = computed(() => {
    const infos: InputInfo[] = [];
    const xinghao = this.xinghao();
    if (!xinghao) {
      return infos;
    }
    const activeMorenbancai = this.activeMorenbancai();
    const morenbancai = xinghao?.["默认板材"];
    const options: InputInfoOptions = [];
    for (const key in morenbancai) {
      if (key === "底框板材") {
        continue;
      }
      const title = xinghao.getBancaiTitle(key);
      const alias = morenbancai[key].板材分组别名;
      if (title) {
        options.push({label: `${alias || key}：${title}`, value: key});
      }
    }
    for (const key in activeMorenbancai) {
      const value = activeMorenbancai[key];
      if (isMrbcjfzInfoEmpty1(key, value)) {
        continue;
      }
      infos.push({
        type: "select",
        label: key,
        options,
        multiple: false,
        value: this.getBancaixuanze(value),
        onChange: async (val) => {
          this.setBancaixuanze(value, val);
        },
        validators: (control) => {
          if (!control.value) {
            return {请选择对应到型号哪个分组: true};
          }
          return null;
        }
      });
    }
    return infos;
  });
  xhmrbsbjInputInfos = computed(() => {
    return [] as InputInfo[];
    // const data = this.data();
    // if (!data) {
    //   return [];
    // }
    // const infos: InputInfo<typeof data>[] = [
    //   {type: "select", label: "算料单模板", model: {data, key: "算料单模板"}, options: 算料单模板Options.slice()}
    // ];
    // return infos;
  });

  toggleMokuaiShuruDisabled(name: string) {
    const msbjInfo = this.activeMsbjInfo();
    const node = this.activeMokuaiNode();
    const mokuai = node?.选中模块;
    if (!mokuai || !node || !msbjInfo) {
      return;
    }
    const varsEnabled = getMokuaiShuchuVars(msbjInfo, node, mokuai);
    const index = varsEnabled.indexOf(name);
    if (index >= 0) {
      varsEnabled.splice(index, 1);
    } else {
      varsEnabled.push(name);
    }
    setMokuaiShuchuVars(msbjInfo, node, mokuai, varsEnabled);
    this.refreshData();
  }
  setAllMokuaiShuruDisabled() {
    const msbjInfo = this.activeMsbjInfo();
    const node = this.activeMokuaiNode();
    const mokuai = node?.选中模块;
    if (!mokuai || !node || !msbjInfo) {
      return;
    }
    const varsEnabled = getMokuaiShuchuVars(msbjInfo, node, mokuai);
    if (varsEnabled.length === mokuai.shuchubianliang.length) {
      setMokuaiShuchuVars(msbjInfo, node, mokuai, []);
    } else {
      setMokuaiShuchuVars(msbjInfo, node, mokuai, mokuai.shuchubianliang);
    }
    this.refreshData();
  }

  toggleMokuaiXuanxiangDisabled(i: number) {
    const item = this.mokuaiXuanxiang()[i];
    if (!item) {
      return;
    }
    item.输出变量 = !item.输出变量;
    this.refreshData();
  }
  setAllMokuaiXuanxiangDisabled() {
    const isAllEnabled = this.mokuaiXuanxiang().every((v) => v.输出变量);
    for (const item of this.mokuaiXuanxiangAll()) {
      item.输出变量 = isAllEnabled ? false : true;
    }
    this.refreshData();
  }

  isSubmited = signal(false);
  async submit() {
    const sbjb = this.sbjb();
    if (sbjb) {
      if (!(await sbjb.save())) {
        this.activeTabName.set("锁边铰边");
        return;
      }
    }
    const mfpz = this.mfpz();
    if (mfpz) {
      if (!(await mfpz.submit())) {
        this.activeTabName.set("门缝配置");
        return;
      }
    }

    const dataInfo = this.data();
    const isFromOrder = this.isFromOrder();
    if (!dataInfo || isFromOrder) {
      return;
    }
    const isVersion2024 = dataInfo.isVersion2024;
    const errorXuanzhongMenshans: {menshan: MenshanKey; nodeNames: string[]}[] = [];
    const errorMkdxpz: {menshan: MenshanKey}[] = [];
    const varKeysXinghao = Object.keys(this.xinghaoVars());
    const msbjInfos: {menshanKey: MenshanKey; msbjInfo: XhmrmsbjInfo}[] = [];
    const nodeVarsErrorInfo: {
      menshanKey: MenshanKey;
      layerName: string;
      duplicateHint: string;
    }[] = [];
    const mokuaisErrorInfo: {
      menshanKey: MenshanKey;
      layerName: string;
      mokuai: ZixuanpeijianMokuaiItem;
      errors: string[];
    }[] = [];
    for (const menshanKey of keysOf(dataInfo.menshanbujuInfos)) {
      const msbjInfo = dataInfo.menshanbujuInfos[menshanKey];
      if (msbjInfo) {
        msbjInfos.push({menshanKey, msbjInfo});
      }
    }
    for (let i = 0; i < msbjInfos.length; i++) {
      const {menshanKey, msbjInfo} = msbjInfos[i];
      const errorXuanzhongNodeNames: string[] = [];
      if (msbjInfo.选中布局数据 && isVersion2024) {
        const formulas = msbjInfo.选中布局数据.模块大小配置?.算料公式 || {};
        const formulasKeys = getNodeFormulasKeys(msbjInfo.模块节点?.map((v) => v.层名字) || []);
        if (!formulasKeys.every((key) => !!formulas[key])) {
          errorMkdxpz.push({menshan: menshanKey});
        }
      }
      const nodes = msbjInfo.模块节点 || [];
      const getNamesStr = (names: string[]) => names.map((v) => `【${v}】`).join("");
      for (const [j, node1] of nodes.entries()) {
        const 选中模块1 = node1.选中模块;
        if (!dataInfo.铰扇跟随锁扇 || !menshanKey.includes("铰扇")) {
          if (!选中模块1) {
            errorXuanzhongNodeNames.push(node1.层名字);
          }
        }
        if (选中模块1) {
          for (let k = j + 1; k < nodes.length; k++) {
            const node2 = nodes[k];
            const 选中模块2 = node2.选中模块;
            if (!选中模块2) {
              continue;
            }
            const scbl1 = getMokuaiShuchuVars(msbjInfo, node1, 选中模块1);
            const scbl2 = getMokuaiShuchuVars(msbjInfo, node2, 选中模块2);
            const dupVars1 = intersection(scbl1, scbl2);
            if (dupVars1.length > 0) {
              nodeVarsErrorInfo.push({
                menshanKey,
                layerName: node1.层名字,
                duplicateHint: `${node1.层名字}模块的输出变量${getNamesStr(dupVars1)}与${node2.层名字}模块的输出变量${getNamesStr(dupVars1)}重名`
              });
              continue;
            }
            if (!isMokuaiItemEqual(选中模块1, 选中模块2)) {
              const slgsKeys = Object.keys(getMokuaiFormulas(msbjInfo, 选中模块2));
              const dupVars2 = intersection(slgsKeys, scbl1);
              if (dupVars2.length > 0) {
                nodeVarsErrorInfo.push({
                  menshanKey,
                  layerName: node2.层名字,
                  duplicateHint: `${node2.层名字}模块的变量${getNamesStr(dupVars2)}与${node1.层名字}模块的输出变量${getNamesStr(dupVars2)}重名`
                });
              }
            }
          }
        }
        for (const mokuai of node1.可选模块) {
          const varKeysShuchu = mokuai.shuchubianliang;
          const mokuaiErrors: string[] = [];
          const checkDuplicateVars = (vars1: string[], vars2: string[], name1: string, name2: string) => {
            const duplicateVars = intersection(vars1, vars2);
            if (duplicateVars.length > 0) {
              mokuaiErrors.push(`${name1}与${name2}重复：${duplicateVars.join("，")}`);
            }
          };
          checkDuplicateVars(varKeysShuchu, varKeysXinghao, "输出变量", "型号公式输入");
          const varKeysXuanxiang = mokuai.自定义数据?.选项数据?.map((v) => v.名字) || [];
          checkDuplicateVars(varKeysShuchu, varKeysXuanxiang, "输出变量", "模块选项");
          const varKeysGssr = mokuai.gongshishuru.map((v) => v[0]);
          checkDuplicateVars(varKeysGssr, varKeysXuanxiang, "公式输入", "模块选项");
          const varKeysXxsr = mokuai.gongshishuru.map((v) => v[0]);
          checkDuplicateVars(varKeysXxsr, varKeysXuanxiang, "选项输入", "模块选项");
          if (!this.validateMorenbancai(mokuai.morenbancai)) {
            mokuaiErrors.push("未配置默认板材分组");
          }
          const missingVars: string[] = [];
          for (const key of [...varKeysGssr, ...varKeysXxsr]) {
            const formulas = getMokuaiFormulas(msbjInfo, mokuai);
            let value = "";
            if (mokuai.xuanxianggongshi.length > 0) {
              for (const xxgs of mokuai.xuanxianggongshi) {
                const valueInfo = await this.getValueInfo2(key, formulas, getShuruzhi(msbjInfo, xxgs._id));
                if (valueInfo.value) {
                  value = valueInfo.value;
                  break;
                }
              }
            } else {
              const valueInfo = await this.getValueInfo2(key, formulas, getShuruzhi(msbjInfo));
              value = valueInfo.value;
            }
            if (!value && isVersion2024) {
              missingVars.push();
            }
          }
          if (missingVars.length > 0) {
            mokuaiErrors.push(`模块输入${getNamesStr(missingVars)}不能为空`);
          }
          if (mokuaiErrors.length > 0) {
            mokuaisErrorInfo.push({menshanKey, layerName: node1.层名字, mokuai, errors: mokuaiErrors});
          }
        }
      }
      if (errorXuanzhongNodeNames.length > 0) {
        errorXuanzhongMenshans.push({menshan: menshanKey, nodeNames: errorXuanzhongNodeNames});
      }
    }
    purgeMsbjInfo(dataInfo.menshanbujuInfos);
    let jumpTo: {门扇名字: MenshanKey; 层名字?: string; mokuai?: ZixuanpeijianMokuaiItem; mkdx?: boolean} | null = null;
    if (!jumpTo && errorXuanzhongMenshans.length > 0) {
      await this.message.error({
        content: "布局中存在未选中的模块",
        details: errorXuanzhongMenshans
          .map(({menshan, nodeNames}) => {
            const nodeNameStr = nodeNames.map((v) => `【${v}】`).join("");
            return `【${menshan}】的${nodeNameStr}`;
          })
          .join("\n")
      });
      const {menshan, nodeNames} = errorXuanzhongMenshans[0];
      jumpTo = {门扇名字: menshan, 层名字: nodeNames[0]};
    }
    if (!jumpTo && nodeVarsErrorInfo.length > 0) {
      const info0 = nodeVarsErrorInfo[0];
      jumpTo = {门扇名字: info0.menshanKey, 层名字: info0.layerName};
      const details = nodeVarsErrorInfo.map((info) => {
        return `【${info.menshanKey}】${info.duplicateHint}`;
      });
      await this.message.error({content: "以下变量重名，请修改", details});
    }
    if (!jumpTo && errorMkdxpz.length > 0) {
      await this.message.error({
        content: "以下布局的模块大小公式不完整",
        details: errorMkdxpz.map(({menshan}) => `【${menshan}】`).join("\n")
      });
      const {menshan} = errorMkdxpz[0];
      jumpTo = {门扇名字: menshan, mkdx: true};
    }
    if (!jumpTo && mokuaisErrorInfo.length > 0) {
      const details = mokuaisErrorInfo.map((v) => {
        const title = getMokuaiTitle(v.mokuai, {门扇名字: v.menshanKey, 层名字: v.layerName});
        return `${title}：${v.errors.join("，")}`;
      });
      const item = mokuaisErrorInfo[0];
      jumpTo = {门扇名字: item.menshanKey, 层名字: item.layerName, mokuai: item.mokuai};
      await this.message.error({content: "以下模块有错", details});
    }
    if (jumpTo) {
      this.activeTabName.set("门扇模块");
      this.activeMenshanKey.set(jumpTo.门扇名字);
      if (jumpTo.层名字) {
        this.selectMsbjRect(jumpTo.层名字);
      }
      if (jumpTo.mokuai) {
        await this.selectMokuai(jumpTo.mokuai);
      }
      if (jumpTo.mkdx) {
        this.openMkdxpz();
      }
      return;
    }
    const data: TableUpdateParams<MsbjData>["data"] = dataInfo.export();
    this.refreshData();
    // delete data.mingzi;
    await this.http.tableUpdate({table, data});
    this.isSubmited.set(true);
  }
  close() {
    if (!this.closable()) {
      return;
    }
    this.closeOut.emit({isSubmited: this.isSubmited()});
  }

  async openMrbcjfzDialog() {
    const xinghao = this.xinghao();
    if (!xinghao || this.isFromOrder()) {
      return;
    }
    const result = await openMrbcjfzDialog(this.dialog, {data: {id: xinghao.raw.vid, table: "p_xinghao"}});
    if (result) {
      this.xinghao.set(result.data);
    }
  }

  enableSbjb = computed(() => !this.isFromOrder() && this.data()?.isVersion2024);
  enableMfpz = computed(() => this.data()?.isVersion2024);
  tabNames = computed(() => {
    let names = xhmrmsbjTabNames.slice();
    if (!this.enableSbjb()) {
      names = names.filter((v) => v !== "锁边铰边");
    }
    if (!this.enableMfpz()) {
      names = names.filter((v) => v !== "门缝配置");
    }
    return names;
  });
  private _activeTabNameKey = "xhmrmsbjActiveTabName";
  activeTabName = signal<XhmrmsbjTabName>(session.load(this._activeTabNameKey) || "门扇模块");
  activeTabNameEff = effect(
    async () => {
      const name = this.activeTabName();
      session.save(this._activeTabNameKey, name);
      setTimeout(() => {
        this.msbjRectsComponent()?.generateRects();
      }, 0);
    },
    {allowSignalWrites: true}
  );
  async setActiveTabName(name: XhmrmsbjTabName) {
    const nameOld = this.activeTabName();
    if (nameOld === name) {
      this.activeTabName.set(name);
      return;
    }
    if (nameOld === "门缝配置") {
      const mfpz = this.mfpz();
      if (mfpz && !(await mfpz.submit())) {
        this.activeTabName.set("门缝配置");
        return;
      }
    }
    this.activeTabName.set(name);
  }

  async setKexuanmokuai(mokuais?: ZixuanpeijianMokuaiItem[]) {
    const rectInfo = this.activeRectInfo();
    const data = this.data();
    const msbjInfo = this.activeMsbjInfo();
    const mokuaiNode = this.activeMokuaiNode();
    if (!rectInfo || !data || !msbjInfo || !mokuaiNode) {
      return;
    }
    if (!mokuais) {
      const mokuais2 = await this.selectMokuais();
      if (!mokuais2) {
        return;
      }
      if (mokuais2.length > 0) {
        mokuais = await this.fetchMokuais(mokuais2.map((v) => v.id));
      } else {
        mokuais = [];
      }
    }
    if (mokuais) {
      mokuaiNode.可选模块 = mokuaiNode.可选模块.filter((v) => mokuais.find((v2) => v.id === v2.id));
      const kexuan = mokuaiNode.可选模块;
      for (const item of mokuais) {
        if (!kexuan.find((v) => v.id === item.id)) {
          kexuan.push(item);
        }
      }
      if (mokuaiNode.选中模块 && !kexuan.find((v) => v.id === mokuaiNode.选中模块?.id)) {
        delete mokuaiNode.选中模块;
      }
      for (const mokuai of mokuaiNode.可选模块) {
        const keys: string[] = [];
        for (const key of mokuai.gongshishuru.concat(mokuai.xuanxiangshuru)) {
          keys.push(key[0]);
        }
        const menshanKey = this.activeMenshanKey();
        for (const menshanKey2 of keysOf(data.menshanbujuInfos)) {
          if (menshanKey === menshanKey2) {
            continue;
          }
          const msbjInfo2 = data.menshanbujuInfos[menshanKey2];
          if (!msbjInfo2) {
            continue;
          }
          const setShuruzhi2 = (xxgsId?: string) => {
            const shuruzhi = getShuruzhi(msbjInfo, xxgsId);
            setShuruzhi(msbjInfo2, shuruzhi, xxgsId);
          };
          if (mokuai.xuanxianggongshi.length > 0) {
            for (const xxgs of mokuai.xuanxianggongshi) {
              setShuruzhi2(xxgs._id);
            }
          } else {
            setShuruzhi2();
          }
        }
      }
      purgeMsbjInfo(data.menshanbujuInfos);
      let refresh = true;
      if (kexuan.length > 0) {
        if (!kexuan.find((v) => v.info?.isDefault)) {
          this.setDefaultMokuai(kexuan[0]);
          refresh = false;
        }
        if (!mokuaiNode.选中模块) {
          this.selectMokuai(kexuan[0]);
          refresh = false;
        }
      }
      if (refresh) {
        this.refreshData();
      }
    }
  }

  kexuanmokuaiQuery = signal("");
  kexuanmokuaiSearchInputInfo = computed(() => {
    const info: InputInfo = {
      type: "string",
      label: "搜索",
      clearable: true,
      value: this.kexuanmokuaiQuery(),
      onInput: debounce((val: string) => this.kexuanmokuaiQuery.set(val), 100),
      style: {width: "150px", maxWidth: "100%"}
    };
    return info;
  });
  kexuanmokuais = computed(() => {
    this.data();
    const query = this.kexuanmokuaiQuery();
    const mokuais = this.activeMokuaiNode()?.["可选模块"] || [];
    setTimeout(() => {
      this.scrollToMokuai(this.activeMokuaiNode()?.选中模块);
    }, 0);
    return mokuais.filter(({type2}) => queryString(query, type2));
  });

  getBancaixuanze(item: MrbcjfzInfo) {
    if (this.isFromOrder()) {
      return item.选中板材分组;
    } else {
      return item.默认对应板材分组;
    }
  }

  async setBancaixuanze(item: MrbcjfzInfo, value: string) {
    const morenbancai = this.xinghao()?.默认板材[value];
    if (this.isFromOrder()) {
      const md5Prev = md5(JSON.stringify(item));
      item.选中板材分组 = value;
      item.选中板材 = "";
      item.选中材料 = "";
      item.选中板材厚度 = "";
      const md5Curr = md5(JSON.stringify(item));
      if (md5Prev !== md5Curr) {
        await this.suanliao();
      }
    } else {
      item.默认对应板材分组 = value;
      item.默认开料板材 = morenbancai?.默认开料板材 || "";
      item.默认开料材料 = morenbancai?.默认开料材料 || "";
      item.默认开料板材厚度 = morenbancai?.默认开料板材厚度 || "";
    }
  }

  getMsbj(id: number) {
    return this.msbjs().find((v) => v.vid === id);
  }

  canEditMokuaidaxiao = computed(() => !this.isFromOrder() || !this.activeMsbj()?.isVersion2024);
  async editMokuaidaxiao() {
    const data = this.data();
    if (data?.isVersion2024) {
      await this.editMkdcpz();
      return;
    }
    const msbjInfo = this.activeMsbjInfo();
    if (!msbjInfo) {
      return;
    }
    const 选中布局数据 = msbjInfo.选中布局数据;
    if (!选中布局数据) {
      return;
    }
    if (this.isFromOrder()) {
      const menshanKey = this.activeMenshanKey();
      this.wmm.postMessage("编辑模块大小", {menshanKey, msbjInfo});
    } else {
      let msbj: MsbjInfo | null = null;
      if (this.http.token) {
        const msbjs = await this.http.queryMySql({table: "p_menshanbuju", filter: {where: {vid: 选中布局数据.vid}}});
        if (msbjs[0]) {
          msbj = new MsbjInfo(msbjs[0], this.getNode2rectData());
        }
      }
      const data = await this.message.json(选中布局数据.模块大小关系, {
        defaultJson: msbj?.peizhishuju.模块大小关系 ?? mokuaidaxiaoData,
        btnTexts: {reset: "重置为默认模块大小"}
      });
      if (data) {
        选中布局数据.模块大小关系 = data;
      }
    }
  }

  async refreshMokuaidaxiao() {
    const data = this.data();
    if (!data) {
      return;
    }
    this.spinner.show(this.spinner.defaultLoaderId, {text: "获取模块大小配置"});
    const records = await this.http.queryMySql<XhmrmsbjTableData>(
      {
        table: "p_xinghaomorenmenshanbuju",
        filter: {where: {vid: this.id()}}
      },
      {spinner: false}
    );
    if (records[0]) {
      const data2 = new XhmrmsbjData(records[0], this.menshanKeys, this.step1Data.typesInfo, this.msbjs());
      for (const menshanKey of this.menshanKeys) {
        const msbjInfo1 = data.menshanbujuInfos[menshanKey];
        const msbjInfo2 = data2.menshanbujuInfos[menshanKey];
        if (!msbjInfo1 || !msbjInfo2) {
          continue;
        }
        const 选中布局数据1 = msbjInfo1.选中布局数据;
        const 选中布局数据2 = msbjInfo2.选中布局数据;
        if (选中布局数据1 && 选中布局数据2) {
          选中布局数据1.模块大小关系 = 选中布局数据2.模块大小关系;
        }
        await this.refreshMokuaidaxiaoResults(menshanKey);
      }
    }
    await this.suanliao();
    this.spinner.hide(this.spinner.defaultLoaderId);
    this.message.snack("更新完成");
  }

  async suanliao() {
    if (!this.isFromOrder()) {
      return false;
    }
    if (this.suanliaoLock$.value) {
      await firstValueFrom(this.suanliaoLock$.pipe(filter((v) => !v)));
    }
    this.suanliaoLock$.next(true);
    const timerName = "模块算料";
    timer.start(timerName);
    this.spinner.show(this.spinner.defaultLoaderId, {text: timerName});
    this.wmm.postMessage("suanliaoStart", this.submitDataStart().data);
    const data = await this.wmm.waitForMessage("suanliaoEnd");
    await this.requestDataEnd(data);
    // this.activeMsbj()?.updateRectsInfo(this.getNode2rectData());
    await this.updateMokuaidaxiaoResults();
    timer.end(timerName, timerName);
    this.spinner.hide(this.spinner.defaultLoaderId);
    this.suanliaoLock$.next(false);
    this.genXiaoguotu();
    this.lastSuanliaoManager.fetch(true);
    return true;
  }

  async getXhmrmsbjRaw() {
    if (!this.isFromOrder()) {
      return null;
    }
    this.wmm.postMessage("getXhmrmsbjRawStart");
    const result = await this.wmm.waitForMessage<XhmrmsbjTableData>("getXhmrmsbjRawEnd");
    return result;
  }

  async resetMokuaiInputs() {
    const data = this.data()?.menshanbujuInfos;
    if (!data) {
      return;
    }
    const mokuai = this.activeMokuaiNode()?.选中模块;
    if (!mokuai) {
      return;
    }
    const xhmrmsbjRaw = await this.getXhmrmsbjRaw();
    let dataOld: XhmrmsbjDataMsbjInfos | undefined;
    try {
      dataOld = JSON.parse(xhmrmsbjRaw?.peizhishuju || "");
    } catch {}
    if (!dataOld) {
      return;
    }
    resetInputs(data, dataOld, [mokuai.id]);
    await this.suanliao();
  }

  private _ignoreXiaoguotuKey = "xhmrmsbjIgnoreXiaoguotu";
  ignoreXiaoguotu = signal(session.load<boolean>(this._ignoreXiaoguotuKey) ?? false);
  ignoreXiaoguotuEff = effect(() => {
    session.save(this._ignoreXiaoguotuKey, this.ignoreXiaoguotu());
  });
  disableXiaoguotu = computed(() => true);
  async genXiaoguotu() {
    if (this.ignoreXiaoguotu() || this.disableXiaoguotu()) {
      return;
    }
    if (this.genXiaoguotuLock$.value) {
      await firstValueFrom(this.genXiaoguotuLock$.pipe(filter((v) => !v)));
    }
    this.genXiaoguotuLock$.next(true);
    const timerName = "生成效果图";
    timer.start(timerName);
    this.wmm.postMessage("genXiaoguotuStart");
    const data = await this.wmm.waitForMessage("genXiaoguotuEnd");
    const items = data[this.activeMenshanKey() || ""] || [];
    if (items.length > 0) {
      const container = this.xiaoguotuContainer()?.nativeElement;
      if (!container) {
        return;
      }
      container.innerHTML = "";
      container.style.transform = "";
      container.style.opacity = "0";
      await timeout(0);
      const rectContainer0 = container.getBoundingClientRect();
      const rectContainer = new Rectangle([rectContainer0.left, rectContainer0.top], [rectContainer0.right, rectContainer0.bottom]);
      const padding = getTrbl(this.msbjRectsComponent()?.padding());
      rectContainer.min.add(new Point(padding[3], padding[0]));
      rectContainer.max.sub(new Point(padding[1], padding[2]));
      const els: HTMLDivElement[] = [];
      for (const item of items) {
        let div = document.createElement("div");
        div.innerHTML = item;
        div = div.firstElementChild as HTMLDivElement;
        container.appendChild(div);
        els.push(div);
      }
      await timeout(0);
      const rect = Rectangle.min;
      for (const el of els) {
        const {top, right, bottom, left, width, height} = el.getBoundingClientRect();
        if (width > 0 && height > 0) {
          rect.expandByPoint(new Point(left, top));
          rect.expandByPoint(new Point(right, bottom));
        }
      }
      const scaleX = rectContainer.width / rect.width;
      const scaleY = rectContainer.height / rect.height;
      const scale = Math.min(scaleX, scaleY);
      const dx = (rectContainer.left - rect.left) * scale + (rectContainer.width - rect.width * scale) / 2;
      const dy = (rectContainer.bottom - rect.bottom) * scale + (rectContainer.height - rect.height * scale) / 2;
      container.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      container.style.opacity = "1";
    }
    timer.end(timerName, timerName);
    this.genXiaoguotuLock$.next(false);
  }

  lastSuanliaoManager = new FetchManager(null, async () => {
    if (!this.isFromOrder()) {
      return null;
    }
    this.wmm.postMessage("getLastSuanliaoStart");
    return await this.wmm.waitForMessage<LastSuanliao | null>("getLastSuanliaoEnd");
  });

  async updateOrder() {
    if (!this.isFromOrder()) {
      return;
    }
    this.wmm.postMessage("updateOrderStart", {型号选中门扇布局: this.data()?.menshanbujuInfos});
    await this.wmm.waitForMessage("updateOrderEnd");
  }

  async getVarNames() {
    if (this.data()?.isVersion2024) {
      return [];
    }
    this.wmm.postMessage("getVarNamesStart");
    const data = await this.wmm.waitForMessage<string[]>("getVarNamesEnd");
    return data;
  }

  async openMokuais() {
    const lastSuanliao = await this.lastSuanliaoManager.fetch();
    if (!lastSuanliao) {
      return;
    }
    const mokuaidaxiaoResults = this.mokuaidaxiaoResults();
    await openXhmrmsbjMokuaisDialog(this.dialog, {
      data: {
        data: {lastSuanliao, mokuaidaxiaoResults},
        isVersion2024: !!this.data()?.isVersion2024
      }
    });
  }
  async openMokuaisStart() {
    await this.openMokuais();
    return {action: "openMokuaisEnd"};
  }

  openHoutaiUrl() {
    window.open(this.houtaiUrl);
  }

  getNode2rectData() {
    const m = this.materialResult();
    const result: Node2rectData = {
      模块层ID: {},
      当前扇名字: this.activeMenshanKey() || "",
      门扇大小: {},
      模块大小: this.activeMokuaidaxiaoResult()
    };
    for (const key of node2rectDataMsdxKeys) {
      result.门扇大小[key] = m[key];
    }
    for (const rect of this.msbjRectsComponent()?.rectInfosAbsolute() || []) {
      if (rect.name) {
        result.模块层ID[rect.name] = rect.raw.vid;
      }
    }
    return result;
  }

  getMokuaiTitle(mokuai: ZixuanpeijianMokuaiItem | null, withUrl: boolean) {
    if (withUrl) {
      const url = getMokuaiTitleWithUrl(this.status, !!this.data()?.isVersion2024, mokuai, {mokuaiNameShort: true});
      return this.domSanitizer.bypassSecurityTrustHtml(url);
    } else {
      return getMokuaiTitle(mokuai, {mokuaiNameShort: true});
    }
  }

  canOpenMsbj = computed(() => !!this.data()?.isVersion2024);
  openedMsbj = signal<MsbjInfo | null>(null);
  openMsbj(id: number) {
    if (!this.canOpenMsbj()) {
      return;
    }
    if (this.isFromOrder()) {
      this.status.openInNewTab(["/门扇布局"], {queryParams: {id}});
    } else {
      const msbj = this.msbjs().find((v) => v.vid === id);
      if (msbj) {
        this.openedMsbj.set(msbj);
      }
    }
  }
  closeMsbj({isSubmited}: MsbjCloseEvent) {
    const openedMsbj = this.openedMsbj();
    this.openedMsbj.set(null);
    if (isSubmited && openedMsbj) {
      this.bjmkStatus.msbjsManager.refresh({update: [openedMsbj]});
    }
  }

  openedMokuai = signal<{mokuai0: ZixuanpeijianMokuaiItem; mokuai: MokuaiItem; bancaiListData: BancaiListData} | null>(null);
  bancaiListDataManager = new FetchManager(null, () => this.http.getBancaiList());
  async openMokuai(mokuai: ZixuanpeijianMokuaiItem) {
    const bancaiListData = await this.bancaiListDataManager.fetch();
    if (!bancaiListData) {
      return;
    }
    const mokuai2 = await this.bjmkStatus.fetchMokuai(mokuai.id);
    if (!mokuai2) {
      await this.message.error("该模块已被删除");
      return;
    }
    if (this.isFromOrder()) {
      this.status.openInNewTab(["/布局模块"], {queryParams: {page: "模块库", mokuaiId: mokuai2.id}});
    } else {
      this.openedMokuai.set({mokuai0: mokuai, mokuai: mokuai2, bancaiListData});
    }
  }
  async closeMokuai({isSaved}: MokuaiItemCloseEvent) {
    const openedMokuai = this.openedMokuai();
    if (!openedMokuai) {
      return;
    }
    this.openedMokuai.set(null);
    const msbjInfo = this.activeMsbjInfo();
    const node = this.activeMokuaiNode();
    if (isSaved && msbjInfo && node) {
      const mokuai0 = openedMokuai.mokuai0;
      const mokuai = (await this.fetchMokuais([openedMokuai.mokuai.id]))[0];
      const slgsKeys = new Set<string>();
      const arr0 = mokuai0.gongshishuru.concat(mokuai0.xuanxiangshuru);
      for (const [k] of arr0) {
        const {type} = this.getValueInfo(k, mokuai.suanliaogongshi, msbjInfo.输入值);
        if (["模块公式值", "通用公式值"].includes(type)) {
          slgsKeys.add(k);
        }
      }
      if (mokuai) {
        const menshanbujuInfos = this.data()?.menshanbujuInfos || {};
        const menshanbujuKeys = keysOf(menshanbujuInfos);
        for (const key of menshanbujuKeys) {
          const msbjInfo = menshanbujuInfos[key];
          if (msbjInfo) {
            for (const node of msbjInfo.模块节点 || []) {
              const mokuais = [...node.可选模块];
              if (node.选中模块) {
                mokuais.push(node.选中模块);
              }
              for (const mokuai2 of mokuais) {
                updateMokuaiItem(mokuai2, mokuai);
              }
            }
          }
        }
        this.refreshData();
      }
    }
  }

  openedMokuaiku = signal<{ids: number[]} | null>(null);
  private _closeMokuaiku$ = new Subject<MokuaikuCloseEvent>();
  openMokuaiku() {
    const ids = this.activeMokuaiNode()?.可选模块.map((v) => v.id) || [];
    this.openedMokuaiku.set({ids});
  }
  closeMokuaiku(event: MokuaikuCloseEvent) {
    this.openedMokuaiku.set(null);
    this._closeMokuaiku$.next(event);
  }
  async selectMokuais() {
    this.openMokuaiku();
    const event = await firstValueFrom(this._closeMokuaiku$);
    return event.selectedMokuais;
  }
  async fetchMokuais(mokuaiIds: number[]) {
    const step1Data = await getStep1Data(this.http, {}, {mokuaiIds});
    if (!step1Data) {
      return [];
    }
    const mokuais: ZixuanpeijianMokuaiItem[] = [];
    for (const type1 in step1Data.typesInfo) {
      for (const type2 in step1Data.typesInfo[type1]) {
        const info = step1Data.typesInfo[type1][type2];
        mokuais.push({...info, type1, type2, totalWidth: "", totalHeight: "", cads: []});
      }
    }
    return mokuais;
  }
  openMokuaikuInNew() {
    this.status.openInNewTab(["/布局模块"], {queryParams: {page: "模块库"}});
  }
  openPeijiankuInNew() {
    this.status.openInNewTab(["/布局模块"], {queryParams: {page: "配件库"}});
  }

  showMenfengpeizhi = computed(() => this.activeTabName() === "锁边铰边");
  async menfengpeizhi() {
    const xinghao = this.xinghao()?.raw.mingzi;
    const suobianjiaobian = this.sbjb()?.items() || [];
    if (!xinghao) {
      return;
    }
    await this.http.getData("shuju/api/getMenfengConfig", {xinghao, suobianjiaobian});
  }

  mkdxpzValidator: FormulasValidatorFn = (formulasList) => {
    const msbjInfo = this.activeMsbjInfo();
    const names = getNodeFormulasKeys(msbjInfo?.模块节点?.map((v) => v.层名字) || []);
    if (
      !names.every((name) => {
        const val = formulasList.find(([k]) => k == name)?.[1];
        return !!val;
      })
    ) {
      return {请定义好所有模块大小公式: true};
    }
    return null;
  };
  openedMkdxpz = signal<{data: MkdxpzEditorData; msbjInfo: XhmrmsbjInfo; varNameItem: VarNameItem; title: string} | null>(null);
  async openMkdxpz() {
    const msbjInfo = this.activeMsbjInfo();
    const 选中布局数据 = msbjInfo?.选中布局数据;
    if (!选中布局数据) {
      return;
    }
    const activeKey = this.activeMenshanKey();
    const varNames = await this.bjmkStatus.varNamesManager.fetch();
    const varNameItem = varNames.find((v) => v.门扇位置 === activeKey) || {};
    if (!Array.isArray(varNameItem.nameGroups)) {
      varNameItem.nameGroups = [];
    }
    const menshanbujuInfos = this.data()?.menshanbujuInfos || {};
    for (const key of keysOf(menshanbujuInfos)) {
      for (const node of menshanbujuInfos[key]?.模块节点 || []) {
        const varNames = new Set<string>();
        for (const mokuai of node.可选模块) {
          for (const v of mokuai.gongshishuru) {
            varNames.add(v[0]);
          }
          for (const v of mokuai.shuchubianliang) {
            varNames.add(v);
          }
        }
        if (varNames.size > 0) {
          varNameItem.nameGroups.push({groupName: `${key}${node.层名字}可选模块`, varNames: Array.from(varNames)});
        }
      }
    }
    const dxpz = 选中布局数据.模块大小配置 || getEmpty模块大小配置();
    const nodes = msbjInfo.模块节点 || [];
    justify模块大小配置(dxpz, nodes.map((v) => v.层名字) || []);
    const data: MkdxpzEditorData = {dxpz, nodes};
    const title = `【${activeKey}】模块大小配置`;
    this.openedMkdxpz.set({data, msbjInfo, varNameItem, title});
  }
  async editMkdcpz() {
    this.openMkdxpz();
  }
  closeMkdxpz({data}: MkdxpzEditorCloseEvent) {
    const 选中布局数据 = this.openedMkdxpz()?.msbjInfo.选中布局数据;
    const {dxpz, nodes} = data || {};
    let changed = false;
    if (dxpz && 选中布局数据) {
      选中布局数据.模块大小配置 = dxpz;
      changed = true;
    }
    const msbjInfo = this.openedMkdxpz()?.msbjInfo;
    if (msbjInfo && nodes) {
      msbjInfo.模块节点 = nodes;
      changed = true;
    }
    if (changed) {
      this.refreshData();
    }
    this.openedMkdxpz.set(null);
  }

  mkdxpzFormulaInfos = computed(() => {
    const msbjInfo = this.activeMsbjInfo();
    const mkdxpz = msbjInfo?.选中布局数据?.模块大小配置;
    if (!mkdxpz) {
      return [];
    }
    const formulas = {...mkdxpz.算料公式};
    const key = this.activeMenshanKey();
    replaceMenshanName(key, formulas);
    const materialResult = this.lastSuanliaoManager.data()?.output?.materialResult || {};
    const onChange = () => {
      this.setMkdxpz(formulas);
    };
    let calcResult: CalcResult | undefined;
    try {
      calcResult = this.calc.calc.calcFormulas(formulas, materialResult);
    } catch {}
    return getFormulaInfos(this.calc, formulas, calcResult?.succeed, {shurus: mkdxpz.输入显示, onChange});
  });
  async setMkdxpz(formulas: Formulas) {
    const mkdxpz = this.activeMsbjInfo()?.选中布局数据?.模块大小配置;
    if (!mkdxpz) {
      return;
    }
    mkdxpz.算料公式 = formulas;
    this.wmm.postMessage("setMkdxpzStart", {mkdxpz, menshan: this.activeMenshanKey()});
    await this.wmm.waitForMessage("setMkdxpzEnd");
    this.wmm.postMessage("requestDataStart");
  }

  canOpenXhmrmsbj = computed(() => this.isFromOrder() || this.closable());
  openXhmrmsbj() {
    const data = this.data();
    if (!data || !this.canOpenXhmrmsbj()) {
      return;
    }
    this.status.openInNewTab(["/型号默认门扇布局"], {queryParams: {id: data.vid}});
  }

  menshanbujuItems = computed(() => {
    const items: {key: MenshanKey; info: XhmrmsbjInfo}[] = [];
    const data = this.data();
    if (!data) {
      return items;
    }
    const menshanbujuInfos = data.menshanbujuInfos;
    for (const key of keysOf(menshanbujuInfos)) {
      const info = menshanbujuInfos[key];
      if (!info) {
        continue;
      }
      if (data.铰扇跟随锁扇 && key.includes("铰扇")) {
        continue;
      }
      items.push({key, info});
    }
    return items;
  });
  async copyMsbjInfo(to: XhmrmsbjInfo) {
    const itemOptions: InputInfoOptions = [];
    for (const {key, info} of this.menshanbujuItems()) {
      if (info === to) {
        continue;
      }
      if (!info.选中布局数据 || !info.模块节点 || info.模块节点.length < 1) {
        itemOptions.push({label: key + "（没有数据）", value: info, disabled: true});
      } else {
        itemOptions.push({label: key, value: info});
      }
    }
    const data: {from: XhmrmsbjInfo | null} = {from: null};
    const form: InputInfo<typeof data>[] = [
      {type: "select", label: "从哪里复制", options: itemOptions, model: {data, key: "from"}, validators: Validators.required}
    ];
    const result = await this.message.form(form);
    const {from} = data;
    if (!result || !from) {
      return;
    }
    Object.assign(to, cloneDeep(from));
    this.refreshData(true);
  }
}
