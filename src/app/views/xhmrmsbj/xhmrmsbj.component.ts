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
  output,
  signal,
  viewChild
} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {DomSanitizer} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {remoteFilePath, session, setGlobal, timer} from "@app/app.common";
import {Formulas} from "@app/utils/calc";
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
  getStep1Data,
  isMokuaiItemEqual,
  replaceMenshanName,
  updateMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {FormulasValidatorFn} from "@components/formulas-editor/formulas-editor.types";
import {FormulasComponent} from "@components/formulas/formulas.component";
import {算料公式} from "@components/lurushuju/xinghao-data";
import {MkdxpzEditorComponent} from "@components/mkdxpz-editor/mkdxpz-editor.component";
import {MkdxpzEditorCloseEvent} from "@components/mkdxpz-editor/mkdxpz-editor.types";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo, 模块大小配置} from "@components/msbj-rects/msbj-rects.types";
import {VarNameItem} from "@components/var-names/var-names.types";
import {XhmrmsbjSbjbComponent} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.component";
import {environment} from "@env";
import {keysOf, ObjectOf, Point, queryString, Rectangle, timeout, WindowMessageManager} from "@lucilor/utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
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
import {getFormulaInfos, openXhmrmsbjMokuaisDialog} from "@views/xhmrmsbj-mokuais/xhmrmsbj-mokuais.component";
import {cloneDeep, debounce, intersection} from "lodash";
import md5 from "md5";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, filter, firstValueFrom, Subject} from "rxjs";
import {MokuaiItemComponent} from "../../components/bujumokuai/mokuai-item/mokuai-item.component";
import {TypedTemplateDirective} from "../../modules/directives/typed-template.directive";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {InputComponent} from "../../modules/input/components/input.component";
import {
  MenshanKey,
  menshanKeys,
  XhmrmsbjCloseEvent,
  XhmrmsbjData,
  XhmrmsbjInfo,
  XhmrmsbjTableData,
  XhmrmsbjTabName,
  xhmrmsbjTabNames
} from "./xhmrmsbj.types";

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
    MatDividerModule,
    MatIconModule,
    MatSlideToggleModule,
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
export class XhmrmsbjComponent implements OnDestroy {
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

  msbjs = this.bjmkStatus.msbjsManager.items;
  table = signal("");
  id = signal(-1);
  isFromOrder = signal(false);
  tableData = signal<XhmrmsbjTableData | null>(null);
  data = signal<XhmrmsbjData | null>(null);
  fenleis: TableDataBase[] = [];
  step1Data: Step1Data = {options: {}, typesInfo: {}};
  mokuais: ZixuanpeijianMokuaiItem[] = [];
  xinghao = signal<MrbcjfzXinghaoInfo | null>(null);
  bancaiListData: BancaiListData | null = null;
  activeMenshanKey = signal<MenshanKey | null>(null);
  activeMsbj = signal<MsbjInfo | null>(null);
  activeRectInfo = signal<MsbjRectInfo | null>(null);
  urlPrefix = remoteFilePath;
  activeMsbjInfo = computed(() => {
    const key = this.activeMenshanKey();
    const data = this.data();
    if (key) {
      return data?.menshanbujuInfos[key];
    }
    return undefined;
  });
  activeMokuaiNode = computed(() => {
    const activeRectInfo = this.activeRectInfo();
    return this.activeMsbjInfo()?.模块节点?.find((v) => v.层id === activeRectInfo?.raw.vid);
  });
  activeMorenbancai = computed(() => {
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
  mokuaiTemplateType!: {$implicit: ZixuanpeijianMokuaiItem; isActive?: boolean};
  menshanKeys = menshanKeys;
  materialResult = signal<Formulas>({});
  houtaiUrl = "";
  user = signal<ObjectOf<any> | null>(null);
  mokuaidaxiaoResults = signal<ObjectOf<Formulas>>({});
  wmm = new WindowMessageManager("门扇模块", this, window.parent);
  suanliaoLock$ = new BehaviorSubject(false);
  genXiaoguotuLock$ = new BehaviorSubject(false);
  isZhijian = computed(() => this.user()?.经销商名字 === "至简软件");
  production = environment.production;
  loadSbjb = signal(false);

  msbjRectsComponent = viewChild(MsbjRectsComponent);
  xiaoguotuContainer = viewChild<ElementRef<HTMLDivElement>>("xiaoguotuContainer");
  sbjb = viewChild(XhmrmsbjSbjbComponent);

  constructor() {
    setGlobal("xhmrmsbj", this);
    effect(() => this.refresh(), {allowSignalWrites: true});
  }

  async refresh() {
    const step1Data = await getStep1Data(this.http, {});
    this.mokuais = [];
    if (step1Data) {
      this.step1Data = step1Data;
      for (const type1 in step1Data.typesInfo) {
        for (const type2 in step1Data.typesInfo[type1]) {
          const info = step1Data.typesInfo[type1][type2];
          this.mokuais.push({...info, type1, type2, totalWidth: "", totalHeight: "", cads: []});
        }
      }
    }

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
    this.fenleis = await this.http.queryMySql<TableDataBase>({table: "p_gongnengfenlei", fields: ["vid", "mingzi"]});
    await this.bjmkStatus.msbjsManager.fetch(true);
    this.bancaiListData = await this.http.getBancaiList();
    if (!this.isFromOrder()) {
      const tableData = this.tableData();
      this.data.set(tableData ? new XhmrmsbjData(tableData, this.menshanKeys, this.step1Data.typesInfo, this.msbjs()) : null);
      xinghao = await getXinghao(tableData?.xinghao || "");
      this.xinghao.set(xinghao ? new MrbcjfzXinghaoInfo(table, xinghao) : null);
    }
    await timeout(0);
    if (this.isFromOrder()) {
      this.wmm.postMessage("requestData");
    } else {
      await this.selectMenshanKey(this.menshanKeys[0]);
    }
  }

  ngOnDestroy() {
    this.wmm.destroy();
  }

  refreshData() {
    this.data.update((v) => (v ? v.clone() : null));
  }

  async requestData(data: any) {
    const {型号选中门扇布局, 型号选中板材, materialResult, menshanKeys, 铰扇跟随锁扇} = data;
    const {houtaiUrl, id, user, localServerUrl} = data;
    if (typeof localServerUrl === "string") {
      this.urlPrefix = localServerUrl;
    }
    this.data.set(
      new XhmrmsbjData(
        {
          vid: id,
          mingzi: "1",
          peizhishuju: JSON.stringify(型号选中门扇布局),
          jiaoshanbujuhesuoshanxiangtong: 铰扇跟随锁扇 ? 1 : 0,
          zuoshujubanben: materialResult.做数据版本
        },
        menshanKeys,
        this.step1Data.typesInfo,
        this.msbjs()
      )
    );
    this.materialResult.set(materialResult);
    this.houtaiUrl = houtaiUrl;
    this.id.set(id);
    this.user = user;
    this.menshanKeys = menshanKeys;
    this.xinghao.set(
      new MrbcjfzXinghaoInfo(this.table(), {vid: 1, mingzi: materialResult.型号, morenbancai: JSON.stringify(型号选中板材)})
    );
    await this.selectMenshanKey(this.activeMenshanKey() || this.menshanKeys[0]);
  }

  submitData() {
    const result = {action: "submitData", data: {} as any};
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
        铰扇跟随锁扇: data.铰扇跟随锁扇,
        门扇布局: this.msbjs()
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

  async selectMenshanKey(key: MenshanKey | string) {
    if (this.activeMenshanKey() !== key) {
      this.activeMenshanKey.set(key as MenshanKey);
      await this.setActiveMsbj(this.activeMsbjInfo());
      await this.suanliao();
    }
  }

  async setActiveMsbj(info?: XhmrmsbjInfo) {
    const vid = info?.选中布局数据?.vid;
    const msbj = cloneDeep(this.msbjs().find((item) => item.vid === vid) || null);
    this.activeMsbj.set(msbj);
    this.activeRectInfo.set(null);
    const msbjInfo = this.activeMsbjInfo();
    await timeout(0);
    if (msbjInfo) {
      if (!msbjInfo.模块节点) {
        msbjInfo.模块节点 = [];
      }
      const rectInfos = this.msbjRectsComponent()?.rectInfosAbsolute() || [];
      msbjInfo.模块节点 = msbjInfo.模块节点.filter((v) => rectInfos.find((rectInfo) => rectInfo.raw.isBuju && rectInfo.raw.vid === v.层id));
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
      data: {name: "p_menshanbuju", filter: {guanlianCN: {menshanweizhi}}, checkedVids}
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
      this.setActiveMsbj(infos[menshanweizhi]);
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
    if (!mokuaiPrev || !mokuaiCurr || !isMokuaiItemEqual(mokuaiPrev, mokuaiCurr)) {
      await this.suanliao();
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

  tongyongFormulas = new FetchManager({}, async () => {
    const data = await this.http.queryMongodb<算料公式>({collection: "material", where: {name: "通用配置"}});
    return data.at(0)?.公式 || {};
  }).data;
  mokuaiInputInfos = computed(() => {
    const mokuai = this.activeMokuaiNode()?.选中模块;
    const mokuaidaxiaoResult = this.activeMokuaidaxiaoResult();
    const materialResult = this.materialResult();
    const infos: InputInfo[] = [];
    if (mokuai) {
      const node = this.activeMokuaiNode();
      const keyMap = {总宽: "totalWidth", 总高: "totalHeight"} as const;
      if (node && !this.data()?.isVersion2024) {
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
      const getValue = (vars: Formulas, k: string) => {
        const v = Number(vars[k]);
        if (!isNaN(v)) {
          return String(v);
        }
        return "";
      };
      const tongyongFormulas = this.tongyongFormulas();
      for (const v of arr) {
        const list = [materialResult, mokuaidaxiaoResult, mokuai.suanliaogongshi, tongyongFormulas];
        for (const formulas of list) {
          if (v[1]) {
            break;
          }
          v[1] = getValue(formulas, v[0]);
        }
        infos.push({
          type: "string",
          label: v[0],
          model: {key: "1", data: v},
          validators: Validators.required,
          onChange: async () => {
            const data = this.data();
            const activeMenshanKey = this.activeMenshanKey();
            const varNames = (await this.getVarNames()).concat(mokuai.shuchubianliang);
            const isShuchubianliang = varNames.includes(v[0]);
            const updateMenshanKeys = new Set<string>();
            if (data && activeMenshanKey) {
              for (const key of keysOf(data.menshanbujuInfos)) {
                for (const node2 of data.menshanbujuInfos[key]?.模块节点 || []) {
                  const mokuai2 = node2.选中模块;
                  if (mokuai2) {
                    const isCurrent = key === activeMenshanKey && node?.层名字 === node2.层名字;
                    if (!isCurrent) {
                      const arr2 = mokuai2.gongshishuru.concat(mokuai2.xuanxiangshuru);
                      for (const v2 of arr2) {
                        if (v2[0] === v[0]) {
                          v2[1] = v[1];
                        }
                      }
                    }
                    const msbjInfo = data.menshanbujuInfos[key];
                    if (msbjInfo && (isShuchubianliang || isCurrent)) {
                      if (v[0] in (msbjInfo.模块大小输出 || {})) {
                        if (!msbjInfo.模块大小输入) {
                          msbjInfo.模块大小输入 = {};
                        }
                        msbjInfo.模块大小输入[v[0]] = v[1];
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
            await this.suanliao();
          }
        });
      }
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
    const morenbancai = this.xinghao()?.["默认板材"];
    const options: InputInfoOptions = [];
    for (const key in morenbancai) {
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

  isSubmited = signal(false);
  async submit() {
    const tabName = this.activeTabName();
    if (tabName === "锁边铰边") {
      await this.sbjb()?.save();
    }
    const dataInfo = this.data();
    const isFromOrder = this.isFromOrder();
    if (!dataInfo || isFromOrder) {
      return;
    }
    const errorXuanzhongMenshans: {menshan: string; nodeNames: string[]}[] = [];
    const errorMkdxpz: {menshan: string}[] = [];
    const varKeysXinghao = Object.keys(getFromulasFromString(this.xinghao()?.raw.gongshishuru));
    const duplicates1: {mokuai: ZixuanpeijianMokuaiItem; keys: string[]; 门扇名字: string; 层名字: string}[] = [];
    const duplicates2: {mokuais: ZixuanpeijianMokuaiItem[]; keys: string[]}[] = [];
    const msbjInfos: {menshanKey: string; msbjInfo: XhmrmsbjInfo}[] = [];
    const mokuaisWithoutBancai: {menshanKey: string; layerName: string; mokuai: ZixuanpeijianMokuaiItem}[] = [];
    for (const menshanKey of keysOf(dataInfo.menshanbujuInfos)) {
      const msbjInfo = dataInfo.menshanbujuInfos[menshanKey];
      if (msbjInfo) {
        msbjInfos.push({menshanKey, msbjInfo});
      }
    }
    for (let i = 0; i < msbjInfos.length; i++) {
      const {menshanKey, msbjInfo} = msbjInfos[i];
      const errorXuanzhongNodeNames: string[] = [];
      if (msbjInfo.选中布局数据) {
        const formulas = msbjInfo.选中布局数据.模块大小配置?.算料公式 || {};
        const formulasKeys = getNodeFormulasKeys(msbjInfo.模块节点?.map((v) => v.层名字) || []);
        if (!formulasKeys.every((key) => !!formulas[key])) {
          errorMkdxpz.push({menshan: menshanKey});
        }
      }
      for (const node of msbjInfo.模块节点 || []) {
        if (!dataInfo.铰扇跟随锁扇 || !menshanKey.includes("铰扇")) {
          if (!node.选中模块) {
            errorXuanzhongNodeNames.push(node.层名字);
          }
        }
        for (const mokuai of node.可选模块) {
          const varKeysMokuai = mokuai.shuchubianliang;
          const keys1 = intersection(varKeysXinghao, varKeysMokuai);
          if (keys1.length > 0) {
            duplicates1.push({mokuai, keys: keys1, 门扇名字: menshanKey, 层名字: node.层名字});
          }
          for (let j = i + 1; j < msbjInfos.length; j++) {
            for (const node2 of msbjInfos[i].msbjInfo.模块节点 || []) {
              for (const mokuai2 of node2.可选模块) {
                if (isMokuaiItemEqual(mokuai, mokuai2)) {
                  continue;
                }
                const varKeysMokuai2 = mokuai2.shuchubianliang;
                const keys2 = intersection(varKeysMokuai, varKeysMokuai2);
                if (keys2.length > 0) {
                  duplicates2.push({mokuais: [mokuai, mokuai2], keys: keys2});
                }
              }
            }
          }
          if (!this.validateMorenbancai(mokuai.morenbancai)) {
            mokuaisWithoutBancai.push({mokuai, menshanKey, layerName: node.层名字});
          }
        }
      }
      if (errorXuanzhongNodeNames.length > 0) {
        errorXuanzhongMenshans.push({menshan: menshanKey, nodeNames: errorXuanzhongNodeNames});
      }
    }
    let jumpTo: {门扇名字: string; 层名字?: string; mokuai?: ZixuanpeijianMokuaiItem; mkdx?: boolean} | null = null;
    if (duplicates1.length > 0) {
      const list = duplicates1.map(
        ({mokuai, keys, 门扇名字, 层名字}) => `${getMokuaiTitle(mokuai, {门扇名字, 层名字})}: ${keys.join("，")}`
      );
      const item = duplicates1[0];
      jumpTo = {门扇名字: item.门扇名字, 层名字: item.层名字, mokuai: item.mokuai};
      await this.message.error({content: "模块输出变量与型号公式输入重复", details: list});
    }
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
    if (!jumpTo && errorMkdxpz.length > 0) {
      await this.message.error({
        content: "以下布局的模块大小公式不完整",
        details: errorMkdxpz.map(({menshan}) => `【${menshan}】`).join("\n")
      });
      const {menshan} = errorMkdxpz[0];
      jumpTo = {门扇名字: menshan, mkdx: true};
    }
    if (!jumpTo && mokuaisWithoutBancai.length > 0) {
      const details = mokuaisWithoutBancai.map((v) => getMokuaiTitle(v.mokuai, {门扇名字: v.menshanKey, 层名字: v.layerName}));
      const item = mokuaisWithoutBancai[0];
      jumpTo = {门扇名字: item.menshanKey, 层名字: item.layerName, mokuai: item.mokuai};
      await this.message.error({content: "以下模块未设置默认板材分组", details});
    }
    if (jumpTo) {
      await this.selectMenshanKey(jumpTo.门扇名字);
      const msbjRectsComponent = this.msbjRectsComponent();
      if (msbjRectsComponent && jumpTo.层名字) {
        const rectInfo = msbjRectsComponent.rectInfosRelative().find((v) => v.name === jumpTo.层名字);
        this.activeRectInfo.set(rectInfo || null);
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
    delete data.mingzi;
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

  tabNames = computed(() => {
    let names = xhmrmsbjTabNames.slice();
    if (this.isFromOrder()) {
      names = names.filter((v) => v !== "锁边铰边");
    }
    return names;
  });
  private _activeTabNameKey = "xhmrmsbjActiveTabName";
  activeTabName = signal<XhmrmsbjTabName>(session.load(this._activeTabNameKey) || "门扇模块");
  activeTabNameEff = effect(
    () => {
      const name = this.activeTabName();
      session.save(this._activeTabNameKey, name);
      setTimeout(() => {
        this.msbjRectsComponent()?.generateRects();
      }, 0);
      if (name === "锁边铰边") {
        this.loadSbjb.set(true);
      }
    },
    {allowSignalWrites: true}
  );

  isMokuaiActive(mokuai: ZixuanpeijianMokuaiItem) {
    return this.activeMokuaiNode()?.选中模块?.id === mokuai.id;
  }

  async setKexuanmokuai(mokuais?: ZixuanpeijianMokuaiItem[]) {
    const rectInfo = this.activeRectInfo();
    const mokuaiNode = this.activeMokuaiNode();
    if (!rectInfo || !mokuaiNode) {
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
      const 选中模块 = mokuaiNode.选中模块;
      if (选中模块 && !kexuan.find((v) => v.id === 选中模块.id)) {
        delete mokuaiNode.选中模块;
      }
      if (kexuan.length > 0) {
        if (!kexuan.find((v) => v.info?.isDefault)) {
          this.setDefaultMokuai(kexuan[0]);
        }
        this.selectMokuai(kexuan[0]);
      } else {
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
      style: {width: "150px"}
    };
    return info;
  });
  kexuanmokuais = computed(() => {
    const query = this.kexuanmokuaiQuery();
    const mokuais = this.activeMokuaiNode()?.["可选模块"] || [];
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
      return;
    }
    if (this.suanliaoLock$.value) {
      await firstValueFrom(this.suanliaoLock$.pipe(filter((v) => !v)));
    }
    this.suanliaoLock$.next(true);
    const timerName = "模块算料";
    timer.start(timerName);
    this.spinner.show(this.spinner.defaultLoaderId, {text: timerName});
    this.wmm.postMessage("suanliaoStart", this.submitData().data);
    const data = await this.wmm.waitForMessage("suanliaoEnd");
    await this.requestData(data);
    this.activeMsbj()?.updateRectsInfo(this.getNode2rectData());
    await this.updateMokuaidaxiaoResults();
    timer.end(timerName, timerName);
    this.spinner.hide(this.spinner.defaultLoaderId);
    this.suanliaoLock$.next(false);
    this.genXiaoguotu();
    this.fetchLastSuanliao();
  }

  private _ignoreXiaoguotuKey = "xhmrmsbjIgnoreXiaoguotu";
  ignoreXiaoguotu = signal(session.load<boolean>(this._ignoreXiaoguotuKey) ?? false);
  ignoreXiaoguotuEff = effect(() => {
    session.save(this._ignoreXiaoguotuKey, this.ignoreXiaoguotu());
  });
  disableXiaoguotu = computed(() => !this.isFromOrder() || this.data()?.isVersion2024);
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

  lastSuanliao = signal<LastSuanliao | null>(null);
  async fetchLastSuanliao() {
    this.wmm.postMessage("getLastSuanliaoStart");
    const data = await this.wmm.waitForMessage<LastSuanliao | null>("getLastSuanliaoEnd");
    this.lastSuanliao.set(data);
  }

  async updateOrder() {
    this.wmm.postMessage("updateOrderStart", {型号选中门扇布局: this.data()?.menshanbujuInfos});
    await this.wmm.waitForMessage("updateOrderEnd");
  }

  async getVarNames() {
    this.wmm.postMessage("getVarNamesStart");
    const data = await this.wmm.waitForMessage<string[]>("getVarNamesEnd");
    return data;
  }

  openMokuais() {
    const lastSuanliao = this.lastSuanliao();
    if (!lastSuanliao) {
      return;
    }
    const mokuaidaxiaoResults = this.mokuaidaxiaoResults();
    openXhmrmsbjMokuaisDialog(this.dialog, {
      data: {
        data: {lastSuanliao, mokuaidaxiaoResults},
        isVersion2024: !!this.data()?.isVersion2024
      }
    });
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

  getMokuaiTitle(mokuai: ZixuanpeijianMokuaiItem | null) {
    const url = getMokuaiTitleWithUrl(this.status, !!this.data()?.isVersion2024, mokuai, {mokuaiNameShort: true});
    return this.domSanitizer.bypassSecurityTrustHtml(url);
  }

  openedMsbj = signal<MsbjInfo | null>(null);
  openMsbj() {
    const msbj = this.activeMsbj();
    if (!msbj) {
      return;
    }
    if (this.isFromOrder()) {
      this.status.openInNewTab(["/门扇布局"], {queryParams: {id: msbj.vid}});
    } else {
      this.openedMsbj.set(msbj);
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
  async closeMokuai({isSaved}: MokuaiItemCloseEvent) {
    const openedMokuai = this.openedMokuai();
    if (!openedMokuai) {
      return;
    }
    this.openedMokuai.set(null);
    if (isSaved) {
      const mokuai = (await this.fetchMokuais([openedMokuai.mokuai.id]))[0];
      if (mokuai) {
        updateMokuaiItem(openedMokuai.mokuai0, mokuai);
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

  mkdcpzValidator: FormulasValidatorFn = (formulasList) => {
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
  openedMkdcpz = signal<{data: 模块大小配置; msbjInfo: XhmrmsbjInfo; varNameItem: VarNameItem; title: string} | null>(null);
  openMkdxpz() {
    const msbjInfo = this.activeMsbjInfo();
    const 选中布局数据 = msbjInfo?.选中布局数据;
    if (!选中布局数据) {
      return;
    }
    const activeKey = this.activeMenshanKey();
    const varNameItem = this.bjmkStatus.varNames().find((v) => v.门扇位置 === activeKey) || {};
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
    const data = cloneDeep(选中布局数据.模块大小配置 || getEmpty模块大小配置());
    justify模块大小配置(data, msbjInfo.模块节点?.map((v) => v.层名字) || []);
    const title = `【${activeKey}】模块大小配置`;
    this.openedMkdcpz.set({data, msbjInfo, varNameItem, title});
  }
  async editMkdcpz() {
    this.openMkdxpz();
  }
  closeMkdcpz({data}: MkdxpzEditorCloseEvent) {
    const 选中布局数据 = this.openedMkdcpz()?.msbjInfo.选中布局数据;
    if (data && 选中布局数据) {
      选中布局数据.模块大小配置 = data;
      this.refreshData();
    }
    this.openedMkdcpz.set(null);
  }

  mkdxpzFormulaInfos = computed(() => {
    const mkdxpz = this.activeMsbjInfo()?.选中布局数据?.模块大小配置;
    if (!mkdxpz) {
      return [];
    }
    const formulas = {...mkdxpz.算料公式};
    const key = this.activeMenshanKey();
    replaceMenshanName(key, formulas);
    const materialResult = this.lastSuanliao()?.output?.materialResult || {};
    const calcResult = this.calc.calc.calcFormulas(formulas, materialResult);
    const onChange = () => {
      this.setMkdxpz(formulas);
    };
    return getFormulaInfos(this.calc, formulas, calcResult.succeed, {shurus: mkdxpz.输入显示, onChange});
  });
  async setMkdxpz(formulas: Formulas) {
    const mkdxpz = this.activeMsbjInfo()?.选中布局数据?.模块大小配置;
    if (!mkdxpz) {
      return;
    }
    mkdxpz.算料公式 = formulas;
    this.wmm.postMessage("setMkdxpzStart", {mkdxpz, menshan: this.activeMenshanKey()});
    await this.wmm.waitForMessage("setMkdxpzEnd");
    this.wmm.postMessage("requestData");
  }

  openXhmrmsbj() {
    const data = this.data();
    if (!data || !this.isFromOrder()) {
      return;
    }
    this.status.openInNewTab(["/型号默认门扇布局"], {queryParams: {id: data.vid}});
  }

  addSbjbItemSbjb() {
    this.sbjb()?.addSbjbItemSbjb();
  }
}
