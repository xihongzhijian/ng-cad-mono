import {NgTemplateOutlet} from "@angular/common";
import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnInit, signal, viewChildren} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {ActivatedRoute} from "@angular/router";
import {getOrderBarcode, imgCadEmpty, imgEmpty, imgLoading, remoteFilePath, session, setGlobal} from "@app/app.common";
import {CadPreviewParams, getCadPreview} from "@app/cad/cad-preview";
import {configCadDataForPrint} from "@app/cad/print";
import {generateLineTexts2, setDimensionText, setShuangxiangLineRects, shouldShowIntersection, splitShuangxiangCad} from "@app/cad/utils";
import {Formulas} from "@app/utils/calc";
import {getDateTimeString} from "@app/utils/get-value";
import {getIsVersion2024} from "@app/utils/table-data/zuoshuju-data";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {CalcZxpjResult, ZixuanpeijianCadItem, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {calcZxpj, getMokuaiTitle, getStep1Data, getZixuanpeijianCads} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {environment} from "@env";
import {CadData, CadLine, CadViewer, CadViewerConfig, Defaults, setLinesLength} from "@lucilor/cad-viewer";
import {ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {nodeFormulasKeysRaw} from "@views/msbj/msbj.utils";
import {cloneDeep, isEmpty} from "lodash";
import {FormulasComponent} from "../../components/formulas/formulas.component";
import {TypedTemplateDirective} from "../../modules/directives/typed-template.directive";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {DdbqConfig, DdbqData, DdbqType, Form, Order, SectionCell, SectionConfig} from "./dingdanbiaoqian.types";

@Component({
  selector: "app-dingdanbiaoqian",
  templateUrl: "./dingdanbiaoqian.component.html",
  styleUrls: ["./dingdanbiaoqian.component.scss"],
  imports: [
    FormsModule,
    FormulasComponent,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    NgTemplateOutlet,
    TypedTemplateDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DingdanbiaoqianComponent implements OnInit {
  private calc = inject(CalcService);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  type = signal<DdbqType | null>(null);
  cadsRowNum = computed(() => (this.type() === "配件模块" ? 3 : 4));
  cadsColNum = computed(() => (this.type() === "配件模块" ? 4 : 5));
  pageSize = [1122, 792] as const;
  pagePadding = [17, 17, 5, 17] as const;
  cadsSizes = signal<{container: [number, number]; cads: {container: [number, number]; img: [number, number]}[]}[]>([]);
  开启锁向示意图Size = [207, 280] as const;
  配合框Size = [150, 90] as const;
  sectionConfig = signal<SectionConfig>({
    rows: [
      {
        cells: [
          {key: "客户名字", label: "客户", class: "alt"},
          {key: "订单编号", label: "编号", class: "alt"}
        ]
      },
      {cells: [{key: "款式"}, {key: "开启锁向", label: "开式"}]},
      {cells: [{key: "拉手信息", label: "锁型", class: "text-left"}]},
      {cells: [{key: "底框"}, {key: "门铰信息", label: "铰型"}, {key: "商标"}]},
      {
        cells: [
          {key: "猫眼", isBoolean: true},
          {key: "安装孔", isBoolean: true},
          {key: "拉片", isBoolean: true}
        ]
      },
      {cells: [{key: "套门信息", label: "内门类型"}]},
      {
        cells: [
          {key: "套门拉手信息", label: "锁型"},
          {key: "套门猫眼", label: "猫眼"},
          {key: "套门厚度", label: "页厚"}
        ]
      }
    ]
  });
  production = environment.production;
  fractionDigits = 1;

  barcodeEls = viewChildren<ElementRef<HTMLDivElement>>("barcode");
  cadsEls = viewChildren<ElementRef<HTMLDivElement>>("cadsEls");

  constructor() {
    setGlobal("ddbq", this);
  }

  ngOnInit() {
    setTimeout(() => this.getOrders(), 0);
    setGlobal("ddbq", this);
    this.route.queryParams.subscribe(({type, showBarcode}) => {
      if (type) {
        this.type.set(type);
      }
      if (showBarcode) {
        this.setConfig("showBarcode", true);
      }
    });
  }

  private _configKey = "订单标签配置";
  config = signal(
    session.load<DdbqConfig>(this._configKey) || {
      showCadSmallImg: true,
      showCadLargeImg: false,
      showBarcode: false
    }
  );
  configEff = effect(() => {
    session.save(this._configKey, this.config());
  });
  setConfig<T extends keyof DdbqConfig>(key: T, value: DdbqConfig[T]) {
    this.config.update((v) => ({...v, [key]: value}));
  }
  configInputInfos = computed(() => {
    const config = this.config();
    const infos: InputInfo[] = [
      {
        type: "boolean",
        label: "渲染小图",
        appearance: "switch",
        value: config.showCadSmallImg,
        onChange: (val) => {
          this.setConfig("showCadSmallImg", val);
        }
      },
      {
        type: "boolean",
        label: "渲染大图",
        appearance: "switch",
        value: config.showCadLargeImg,
        onChange: (val) => {
          this.setConfig("showCadLargeImg", val);
        }
      }
    ];
    return infos;
  });

  private _httpCacheKey = "订单标签请求数据";
  enableCache = signal(!environment.production);
  orders = signal<Order[]>([]);
  materialResult = signal<Formulas>({});
  forms = signal<Form[]>([]);
  isLvxingcai = signal(false);
  async getOrders() {
    const url = "order/order/dingdanbiaoqian";
    const params = this.route.snapshot.queryParams;
    const type = this.type();
    const enableCache = this.enableCache();
    this.isLvxingcai.set(!!params.铝型材);
    if (type === "配件模块") {
      await this.updateMokuais();
      return;
    }
    let ddbqData: DdbqData | null = null;
    if (enableCache) {
      ddbqData = session.load<DdbqData>(this._httpCacheKey);
    }
    if (!ddbqData) {
      ddbqData = await this.http.getData<DdbqData>(url, params, {spinner: {config: {text: "获取数据..."}}});
      if (enableCache && ddbqData) {
        try {
          session.save(this._httpCacheKey, ddbqData);
        } catch (error) {
          console.warn(error);
        }
      }
    }
    if (ddbqData) {
      const cadsRowNum = this.cadsRowNum();
      const cadsColNum = this.cadsColNum();
      const {开启锁向示意图Size, 配合框Size} = this;
      const orders = ddbqData.map<Order>((order) => {
        const maxLength = 80;
        const orderCads = order.cads || [];
        const cads = orderCads.map<Order["cads"][0]>((cad) => {
          const img = imgLoading;
          const imgLarge = imgLoading;
          const data = new CadData(cad);
          data.entities.line.forEach((e) => {
            e.显示线长格式 = "{0}";
            if (e.gongshi) {
              const vars = {...order.materialResult};
              vars.总宽 = cad.calcW;
              vars.总高 = cad.calcH;
              const res = this.calc.calc.calcExpress(e.gongshi, vars);
              if (!res.error) {
                e.显示线长 = String(res.value);
              }
            }
          });

          if (!data.type.includes("企料") && !shouldShowIntersection(data)) {
            const lines: CadLine[] = [];
            data.entities.line.forEach((e) => {
              if (e.length > maxLength) {
                lines.push(e);
                e.显示线长 = e.length.toString();
              }
            });
            const shuangxiangCads = splitShuangxiangCad(data);
            setLinesLength(data, lines, maxLength);
            setShuangxiangLineRects(shuangxiangCads);
          }

          const isLarge = this.config().showBarcode || !!data.info.isLarge;
          const forceBreak = !!data.info.forceBreak;
          return {
            houtaiId: cad.houtaiId,
            data,
            img,
            imgLarge,
            imgSize: isLarge ? [218, 240] : [218, 96],
            isLarge,
            forceBreak,
            zhankai: [{width: cad.calcW, height: cad.calcH, num: cad.num}],
            style: {},
            imgStyle: {}
          };
        });
        this.sectionConfig().rows.forEach((row) => {
          row.cells.forEach(({key, isBoolean}) => {
            if (isBoolean && order.materialResult) {
              order.materialResult[key] = order.materialResult[key] ? "✔" : "✖";
            }
          });
        });
        return {
          code: order.code,
          materialResult: order.materialResult,
          开启锁向示意图: {
            data: new CadData(order.开启锁向示意图),
            img: imgEmpty,
            style: {width: 开启锁向示意图Size[0] + "px", height: 开启锁向示意图Size[1] + "px"}
          },
          配合框: order.配合框?.map((v) => ({
            data: new CadData(v),
            img: imgEmpty,
            style: {width: 配合框Size[0] + "px", height: 配合框Size[1] + "px"}
          })),
          cads,
          positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
          style: {},
          info: Array(3).fill(order.materialResult) || [],
          forms: order.forms
        };
      });
      this.orders.set(orders);
      document.title = `${orders[0].code}_${getDateTimeString()}`;
      await this.splitOrders();
      const barcodeResult = getOrderBarcode(".barcode", {displayValue: false, margin: 0, width: 2, height: 30});
      if (barcodeResult.error) {
        console.warn(barcodeResult.error);
        this.message.alert("生成条形码出错：" + barcodeResult.error);
        if (this.production) {
          this.orders.set([]);
          return;
        }
      }
      await this.updateImgs(false);
    }
  }
  async updateImgs(configForPrint: boolean) {
    const {开启锁向示意图Size, 配合框Size} = this;
    this.spinner.show(this.spinner.defaultLoaderId, {text: "生成中..."});
    const configBase: Partial<CadViewerConfig> = {
      hideLineLength: false,
      hideLineGongshi: true,
      backgroundColor: "white",
      fontStyle: {family: "宋体"},
      dimStyle: {
        dimensionLine: {color: "#505050", dashArray: Defaults.DASH_ARRAY},
        extensionLines: {color: "#505050", length: 12},
        arrows: {color: "#505050"},
        text: {size: 36}
      }
    };
    const collection = this.status.collection$.value;
    let tmpCadViewer: CadViewer | undefined;
    const getImg = async (data: CadData, previewParams: Partial<CadPreviewParams>) => {
      const previewParams2: CadPreviewParams = {
        maxZoom: 1.3,
        showFenti: true,
        ...previewParams,
        config: {...configBase, ...previewParams.config}
      };
      if (configForPrint) {
        if (!tmpCadViewer) {
          tmpCadViewer = new CadViewer().appendTo(document.body);
          tmpCadViewer.setConfig(previewParams2.config || {});
        }
        await configCadDataForPrint(tmpCadViewer, data, {cads: [], projectConfig: this.status.projectConfig}, {isZxpj: true});
        previewParams2.fixedMtextSize = 28;
        delete previewParams2.maxZoom;
      }
      return await getCadPreview(collection, data, previewParams2);
    };
    const {showCadSmallImg, showCadLargeImg} = this.config();
    const imgLargeSize = [innerWidth * 0.85, innerHeight * 0.85] as [number, number];
    const setData = (data: CadData, materialResult: Formulas = {}) => {
      for (const e of data.entities.dimension) {
        setDimensionText(e, materialResult);
        e.setStyle({text: {color: "black"}});
      }
      for (const e of data.entities.mtext) {
        const match = e.text.match(/^#(.*)#$/);
        if (match && match[1] && match[1] in materialResult) {
          e.text = String(materialResult[match[1]]);
        }
      }
    };
    for (const [i, {cads, 开启锁向示意图, 配合框, materialResult}] of this.orders().entries()) {
      if (开启锁向示意图) {
        开启锁向示意图.data.type = "";
        开启锁向示意图.data.type2 = "";
        setData(开启锁向示意图.data, materialResult);
        for (const e of 开启锁向示意图.data.entities.line) {
          e.linewidth = 5;
        }
        const previewParams: Partial<CadPreviewParams> = {
          config: {width: 开启锁向示意图Size[0], height: 开启锁向示意图Size[1], hideLineLength: true},
          autoSize: true,
          fixedDimTextSize: 100,
          fixedMtextSize: 100
        };
        开启锁向示意图.img = await getImg(开启锁向示意图.data, previewParams);
      }
      if (配合框) {
        for (const v of 配合框) {
          for (const e of v.data.entities.line) {
            if (e.mingzi !== "背框线") {
              e.hideLength = true;
            }
          }
          if (v.data.name === "顶框") {
            v.data.transform({rotate: -Math.PI / 2}, true);
            generateLineTexts2(v.data);
          }
          v.img = await getImg(v.data, {
            config: {width: 配合框Size[0], height: 配合框Size[1], hideLineLength: false},
            autoSize: true
          });
        }
      }
      const cadsSizes = this.cadsSizes();
      for (const [j, cad] of cads.entries()) {
        cad.imgSize = cadsSizes.at(i)?.cads.at(j)?.container || [0, 0];
        setData(cad.data, materialResult);
      }
      if (showCadSmallImg) {
        await Promise.all(cads.map(async (v) => (v.img = await getImg(v.data, {config: {width: v.imgSize[0], height: v.imgSize[1]}}))));
      } else {
        await Promise.all(cads.map(async (v) => (v.img = imgCadEmpty)));
      }
      if (showCadLargeImg) {
        await Promise.all(
          cads.map(async (v) => (v.imgLarge = await getImg(v.data, {config: {width: imgLargeSize[0], height: imgLargeSize[1]}})))
        );
      } else {
        await Promise.all(cads.map(async (v) => delete v.imgLarge));
      }
    }
    this.orders.update((v) => [...v]);
    this.spinner.hide(this.spinner.defaultLoaderId);
    tmpCadViewer?.destroy();
  }
  takeEmptyPosition(positions: Order["positions"], isLarge: boolean, forceBreak: boolean) {
    const result = {position: null as number[] | null, isFull: false};
    let i = 0;
    let j = 0;
    let pts: [number, number][] | null = null;
    for (; i < positions.length; i++) {
      j = 0;
      for (; j < positions[i].length; j++) {
        pts = [[i, j]];
        if (isLarge) {
          pts.push([i + 1, j]);
        }
        if (!pts.every(([i2, j2]) => positions[i2]?.[j2] === 0)) {
          pts = null;
          continue;
        }
        result.position = [i, j];
        const count = pts.length;
        for (const [i2, j2] of pts) {
          positions[i2][j2] = count;
        }
        break;
      }
      if (pts) {
        break;
      }
    }
    result.isFull = i === positions.length && j === positions[i - 1].length;
    if (forceBreak && !result.isFull) {
      result.isFull = true;
      for (let i2 = 0; i2 < positions.length; i2++) {
        for (let j2 = 0; j2 < positions[i2].length; j2++) {
          if ((i2 > i || j2 > j) && positions[i2][j2] === 0) {
            positions[i2][j2] = -1;
          }
        }
      }
    }
    return result;
  }
  async splitOrders() {
    const type = this.type();
    if (type === "生产流程单") {
      return;
    }
    const orders = this.orders().slice();
    const orders2: typeof orders = [];
    const cadsToSet: Parameters<DingdanbiaoqianComponent["setCad"]>[] = [];
    const forms: Form[] = [];
    let i = 0;
    let j = 0;
    orders.forEach((order) => {
      const cads = order.cads;
      order.cads = [];
      const pushOrder = () => {
        const o = cloneDeep(order);
        orders2.push(o);
        return o;
      };
      switch (type) {
        case "标签贴纸":
        case "配件模块": {
          order.info = null;
          delete order.开启锁向示意图;
          delete order.配合框;
          let orderCurr: Order | null = null;
          let orderPrev: Order | null = null;
          const group1: Order["cads"][0][] = [];
          const group2: Order["cads"][0][] = [];
          for (const cad of cads) {
            if (cad.data.name.match(/^[左右顶]双包边$/)) {
              group2.push(cad);
            } else {
              group1.push(cad);
            }
          }
          const groups = [group1, group2];
          for (const group of groups) {
            if (group.length < 1) {
              continue;
            }
            orderPrev = orderCurr;
            orderCurr = pushOrder();
            for (let k = 0; k < group.length; k++) {
              const item = group[k];
              const itemNext = group[k + 1];
              const {isLarge} = item;
              let forceBreak = false;
              if (item.forceBreak && !itemNext.forceBreak) {
                forceBreak = true;
              }
              let result = this.takeEmptyPosition(orderCurr.positions, isLarge, forceBreak);
              if (result.position) {
                cadsToSet.push([group[k], i, j, result.position]);
                orderCurr.cads.push(group[k]);
                j++;
              } else {
                if (orderPrev) {
                  result = this.takeEmptyPosition(orderPrev.positions, isLarge, forceBreak);
                  if (result.position) {
                    cadsToSet.push([item, i, j, result.position]);
                    orderPrev.cads.push(item);
                  } else if (result.isFull) {
                    orderPrev = null;
                  }
                  j++;
                } else {
                  orderPrev = orderCurr;
                  orderCurr = pushOrder();
                  i++;
                  j = 0;
                  k--;
                }
              }
            }
          }
          break;
        }
        case "质检标签":
        case "合格证":
        case "流程指令卡":
          forms.push(...(order.forms || []));
          break;
        default:
          this.message.alert("未知类型：" + type);
          break;
      }
    });
    orders2.forEach((order) => {
      this.setPage(order);
    });
    this.orders.set(orders2);
    this.forms.set(forms);
    await timeout(0);
    this.updateCadsSizes();
    cadsToSet.forEach((v) => {
      this.setCad(...v);
    });
    await timeout(0);
    this.updateCadsSizes();
    cadsToSet.forEach((v) => {
      this.setCad(...v);
    });
  }
  updateCadsSizes() {
    const cadsEls = this.cadsEls();
    const cadsSizes: ReturnType<typeof this.cadsSizes> = [];
    for (const {nativeElement: cadsEl} of cadsEls) {
      const cadsElRect = cadsEl.getBoundingClientRect();
      const cadsSize: (typeof cadsSizes)[number] = {container: [cadsElRect.width, cadsElRect.height], cads: []};
      const cadWidth = cadsElRect.width / this.cadsColNum();
      const cadHeight = cadsElRect.height / this.cadsRowNum();
      cadsSizes.push(cadsSize);
      cadsEl.querySelectorAll(".cad").forEach((cadEl) => {
        const {width: imgW = 0, height: imgH = 0} = cadEl.querySelector(".cad-image")?.getBoundingClientRect() || {};
        cadsSize.cads.push({container: [cadWidth, cadHeight], img: [imgW, imgH]});
      });
    }
    this.cadsSizes.set(cadsSizes);
  }

  mokuais = signal<ZixuanpeijianMokuaiItem[]>([]);
  urlPrefix = signal("");
  calcResults = signal<CalcZxpjResult[]>([]);
  remoteFilePath = remoteFilePath;
  async updateMokuais() {
    const params = this.route.snapshot.queryParams;
    const mokuaiIds = ((params.ids as string) || "").split(",").filter(Boolean).map(Number);
    if (mokuaiIds.length <= 0) {
      return;
    }
    const httpOptions: HttpOptions = {spinner: false};
    const step1Data = await getStep1Data(this.http, httpOptions, {mokuaiIds});
    if (!step1Data) {
      return;
    }
    const typesInfo = step1Data.typesInfo;
    const typesInfo2: Parameters<typeof getZixuanpeijianCads>[2] = {};
    for (const type1 in typesInfo) {
      typesInfo2[type1] = {};
      for (const type2 in typesInfo[type1]) {
        typesInfo2[type1][type2] = {id: typesInfo[type1][type2].id};
      }
    }
    const cads = (await getZixuanpeijianCads(this.http, httpOptions, typesInfo2))?.cads;
    if (!cads) {
      return;
    }
    const mokuais: ZixuanpeijianMokuaiItem[] = [];
    for (const type1 in typesInfo) {
      for (const type2 in typesInfo[type1]) {
        const item: ZixuanpeijianMokuaiItem = {
          ...typesInfo[type1][type2],
          type1,
          type2,
          totalWidth: "",
          totalHeight: "",
          shuruzongkuan: false,
          shuruzonggao: false,
          cads: cads[type1][type2].map<ZixuanpeijianCadItem>((data) => ({
            data,
            info: {houtaiId: "", zhankai: [], calcZhankai: []}
          })),
          calcVars: {keys: nodeFormulasKeysRaw.slice()}
        };
        mokuais.push(item);
      }
    }
    this.mokuais.set(mokuais);
    this.urlPrefix.set(remoteFilePath);
    await this.calcMokuais();
  }
  async calcMokuais() {
    const mokuais = this.mokuais();
    const calcResults: CalcZxpjResult[] = [];
    for (const mokuai of mokuais) {
      const calcResult = await calcZxpj(this.dialog, this.message, this.calc, this.status, {}, [mokuai], [], {}, {useCeshishuju: true});
      calcResults.push(calcResult);
    }
    this.calcResults.set(calcResults);

    const cadsRowNum = this.cadsRowNum();
    const cadsColNum = this.cadsColNum();
    const orders: Order[] = [];
    for (const [i, mokuai] of mokuais.entries()) {
      const order: Order = {
        code: getMokuaiTitle(mokuai),
        cads: mokuai.cads.map((v) => {
          v.data.info.标签信息 = [];
          return {
            houtaiId: v.data.id,
            data: v.data,
            img: "",
            imgSize: [0, 0],
            isLarge: false,
            forceBreak: false,
            style: {},
            imgStyle: {},
            zhankai: v.info.zhankai
          };
        }),
        positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
        style: {},
        info: null
      };
      const mokuaiInfo: Order["mokuaiInfo"] = {
        index: i,
        details: [{value: getMokuaiTitle(mokuai)}],
        formulaInfos: this.getMokuaiFormulaInfos(i)
      };
      if (mokuai.zhizuoren) {
        mokuaiInfo.details.push({value: `制作人：${mokuai.zhizuoren}`});
      }
      order.mokuaiInfo = mokuaiInfo;
      orders.push(order);
    }
    this.orders.set(orders);
    await this.splitOrders();
    await this.updateImgs(true);
  }

  print() {
    window.print();
  }

  setCad(cad: Order["cads"][0], i: number, j: number, position: number[]) {
    const cadsSizes = this.cadsSizes();
    const size = cadsSizes.at(i)?.cads.at(j);
    const [w, h] = size?.container || [0, 0];
    const {isLarge} = cad;
    const top = position[0] * (h - 1);
    const left = position[1] * (w - 1);
    cad.style = {
      width: `${w}px`,
      height: `${isLarge ? h * 2 - 1 : h}px`,
      top: `${top}px`,
      left: `${left}px`
    };
    cad.imgStyle = {
      height: `${size?.img[1] || 0}px`
    };
  }

  setPage(order: Order) {
    const {pagePadding, pageSize} = this;
    order.style = {
      padding: pagePadding.join("px ") + "px",
      width: `${pageSize[0]}px`,
      height: `${pageSize[1]}px`
    };
  }

  getValue(section: ObjectOf<string | number>, cell: SectionCell) {
    const value = String(section[cell.key] || "");
    if ((cell.key || cell.label) === "页厚" && value === "0") {
      return "";
    }
    return value;
  }

  clearHttpCache() {
    session.remove(this._httpCacheKey);
  }

  getMokuaiFormulaInfos(mokuaiIndex: number) {
    const formulaInfos: NonNullable<Order["mokuaiInfo"]>["formulaInfos"] = [];
    const mokuai = this.mokuais()[mokuaiIndex];
    if (!mokuai) {
      return formulaInfos;
    }
    const addInfos = (title: string, obj: Formulas | undefined, forced = false) => {
      if (isEmpty(obj) && !forced) {
        return;
      }
      const item: (typeof formulaInfos)[number] = {title, infos: []};
      for (const [k, v] of Object.entries(obj || {})) {
        item.infos.push({
          keys: [{eq: false, name: k}],
          values: [{eq: true, name: String(v)}]
        });
      }
      formulaInfos.push(item);
    };
    const gongshishuru: Formulas = {};
    const vars = {...mokuai.suanliaogongshi, ...mokuai.ceshishuju};
    for (const [k, v] of mokuai.gongshishuru) {
      gongshishuru[k] = k in vars ? vars[k] : v;
    }
    addInfos("公式输入", gongshishuru);
    const xuanxiangshuru: Formulas = {};
    for (const [k, v] of mokuai.xuanxiangshuru) {
      xuanxiangshuru[k] = k in vars ? vars[k] : v;
    }
    addInfos("选项输入", xuanxiangshuru);
    addInfos("测试数据", mokuai.ceshishuju, true);
    return formulaInfos;
  }

  async editMokuaiFormulas(mokuaiIndex: number) {
    const mokuai = this.mokuais()[mokuaiIndex];
    if (!mokuai) {
      return;
    }
    const calcResult = this.calcResults()[mokuaiIndex];
    let formulasText = "";
    if (calcResult && !calcResult.fulfilled) {
      const errorTrim = calcResult.error?.calc?.result?.errorTrim;
      for (const key in errorTrim) {
        formulasText += `${key} = \n`;
      }
    }
    formulasText = formulasText.replace(/\n$/, "");
    const result = await openEditFormulasDialog(this.dialog, {data: {formulas: mokuai.ceshishuju, formulasText}});
    if (result) {
      const gongshiData = Object.entries(result).map(([k, v]) => [k, v]);
      const response = await this.http.post("peijian/Houtaisuanliao/edit_gongshi", {
        xiaodaohang: "配件模块",
        xiang: "ceshishuju",
        id: mokuai.id,
        gongshiData
      });
      if (response?.code === 0) {
        await this.updateMokuais();
      }
    }
  }

  hasZhankaiNum(zhankai: NonNullable<Order["cads"][0]["zhankai"]>[0]) {
    return typeof zhankai.num === "number";
  }

  returnZero() {
    return 0;
  }

  openCad(cad: Order["cads"][number], order: Order) {
    if (!this.isMokuaiVersion2024(order)) {
      this.status.openCadInNewTab(cad.houtaiId, "cad");
    }
  }
  isMokuaiVersion2024(order: Order) {
    const mokuai = this.mokuais().at(order.mokuaiInfo?.index || 0);
    return getIsVersion2024(mokuai?.zuoshujubanben);
  }
  openMokuai(order: Order) {
    const mokuai = this.mokuais().at(order.mokuaiInfo?.index || 0);
    if (!mokuai) {
      return;
    }
    this.status.openInNewTab(["/布局模块"], {queryParams: {page: "模块库", mokuaiId: mokuai.id}});
  }

  isArray(v: any) {
    return Array.isArray(v);
  }
}
