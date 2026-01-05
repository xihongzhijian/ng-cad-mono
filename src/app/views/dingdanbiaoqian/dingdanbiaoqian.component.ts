import {NgTemplateOutlet} from "@angular/common";
import {ChangeDetectorRef, Component, computed, effect, ElementRef, HostBinding, inject, OnInit, signal, viewChildren} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {ActivatedRoute} from "@angular/router";
import {getOrderBarcode, imgCadEmpty, imgLoading, remoteFilePath, session, setGlobal} from "@app/app.common";
import {CadPreviewParams, getCadPreview} from "@app/cad/cad-preview";
import {configCadDataForPrint} from "@app/cad/print";
import {
  getIsCadSuanliaoxianshi,
  setDimensionText,
  setShuangxiangLineRects,
  shouldShowIntersection,
  showIntersections,
  splitShuangxiangCad
} from "@app/cad/utils";
import {Formulas} from "@app/utils/calc";
import {getDateTimeString} from "@app/utils/get-value";
import {getIsVersion2024} from "@app/utils/table-data/zuoshuju-data";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {CalcZxpjResult, ZixuanpeijianCadItem, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {calcZxpj, getMokuaiTitle, getStep1Data, getZixuanpeijianCads} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {environment} from "@env";
import {CadData, CadLine, CadViewer, CadViewerConfig, Defaults, setLinesLength} from "@lucilor/cad-viewer";
import {isTypeOf, ObjectOf, timeout, waitFor} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {nodeFormulasKeysRaw} from "@views/msbj/msbj.utils";
import {Properties} from "csstype";
import {cloneDeep, isEmpty} from "lodash";
import {FormulasComponent} from "../../components/formulas/formulas.component";
import {TypedTemplateDirective} from "../../modules/directives/typed-template.directive";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {DdbqConfig, DdbqData, DdbqType, Form, FormItem, Order, SectionCell, SectionConfig, ShiyituInfo} from "./dingdanbiaoqian.types";

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
  ]
})
export class DingdanbiaoqianComponent implements OnInit {
  private calc = inject(CalcService);
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  @HostBinding("class") cls = [this.status.project];

  type = signal<DdbqType | null>(null);
  cadsRowNum = computed(() => (this.type() === "配件模块" ? 3 : 4));
  cadsColNum = computed(() => (this.type() === "配件模块" ? 4 : 5));
  pageSize = [1122, 792] as const;
  pagePadding = [17, 17, 5, 17] as const;
  cadsSizes = signal<{container: [number, number]; cads: {container: [number, number]; img: [number, number]}[]}[]>([]);
  shiyituSize: ObjectOf<[number, number]> = {
    开启锁向示意图: [150, 300],
    背框示意图: [100, 100]
  };
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
      {
        cells: [
          {key: "底框信息", label: "底框", autoWidth: true},
          {key: "门铰信息", label: "铰型", autoWidth: true},
          {key: "商标", autoWidth: true}
        ]
      },
      {
        cells: [
          {key: "猫眼", autoWidth: true, isBoolean: true},
          {key: "安装孔", autoWidth: true, isBoolean: true},
          {key: "拉片", autoWidth: true, isBoolean: true},
          {key: "", class: "flex-110"}
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
  formsStyle = signal<Properties>({});
  formTitleTplType = {$implicit: "" as Form["title"]};
  formItemTplType = {$implicit: {} as FormItem};
  isLvxingcai = signal(false);

  ordersEff = effect(async () => {
    this.orders();
    await timeout(0);
    this.updateBarcodes();
  });

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
      const {shiyituSize} = this;
      const orders = ddbqData.map<Order>((order) => {
        const maxLength = 80;
        const orderCads = order.cads || [];
        const cads = orderCads.map((cad) => {
          const img = imgLoading;
          const imgLarge = imgLoading;
          const data = new CadData(cad);
          data.entities.line.forEach((e) => {
            e.显示线长格式 = "{0}";
            if (typeof e.info.线长 === "number") {
              e.显示线长 = String(e.info.线长);
            } else if (e.gongshi) {
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
                if (!e.显示线长) {
                  e.显示线长 = e.length.toString();
                }
              }
            });
            const shuangxiangCads = splitShuangxiangCad(data);
            setLinesLength(data, lines, maxLength);
            setShuangxiangLineRects(shuangxiangCads);
          }

          const isLarge = this.config().showBarcode || !!data.info.isLarge;
          const forceBreak = !!data.info.forceBreak;
          const result: Order["cads"][number] = {
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
          this.updateCadZhankaiDisplayInfos(result);
          showIntersections(data, this.status.projectConfig);
          return result;
        });
        return {
          code: order.code,
          materialResult: order.materialResult,
          shiyitus: order.shiyitus?.map((shiyitu) => {
            const [w, h] = shiyituSize[shiyitu.name] ?? [0, 0];
            const info: ShiyituInfo = {
              name: shiyitu.name,
              data: new CadData(shiyitu.data),
              img: "",
              style: {width: w + "px", height: h + "px"}
            };
            return info;
          }),
          cads,
          positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
          style: {},
          info: Array(3).fill(order.materialResult) || [],
          forms: order.forms
        };
      });
      this.orders.set(orders);
      // const intersectionCircles: CadCircle[] = [];
      // for (const order of orders) {
      //   for (const {data} of order.cads) {
      //     data.entities.forEach((e) => {
      //       if (e.info.isIntersectionEntity && e instanceof CadCircle) {
      //         intersectionCircles.push(e);
      //       }
      //     });
      //   }
      // }
      // const minCircleRadius = Math.min(...intersectionCircles.map((e) => e.radius));
      // for (const e of intersectionCircles) {
      //   e.radius = minCircleRadius;
      // }
      this.formsStyle.set(ddbqData[0]?.formsStyle || {});
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
    const collection = this.status.collection();
    let tmpCadViewer: CadViewer | undefined;
    const getImg = async (data: CadData, previewParams: Partial<CadPreviewParams>, hasLarge?: boolean) => {
      const previewParams2: CadPreviewParams = {
        showFenti: true,
        fixedLengthTextSize: 16,
        fixedDimTextSize: 16,
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
      const small = await getCadPreview(collection, data, previewParams2);
      let large = "";
      if (hasLarge) {
        const previewParams3: CadPreviewParams = {
          ...previewParams2,
          config: {...previewParams2.config, width: innerWidth * 0.85, height: innerHeight * 0.85},
          maxZoom: undefined,
          autoSize: false,
          fixedLengthTextSize: undefined,
          fixedDimTextSize: undefined
        };
        large = await getCadPreview(collection, data, previewParams3);
      }
      return {small, large};
    };
    const {showCadSmallImg, showCadLargeImg} = this.config();
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
    await timeout(0);
    for (const [i, {cads, shiyitus, materialResult}] of this.orders().entries()) {
      for (const shiyitu of shiyitus ?? []) {
        setData(shiyitu.data, materialResult);
        const [w, h] = this.shiyituSize[shiyitu.name] ?? [0, 0];
        const previewParams: Partial<CadPreviewParams> = {
          config: {width: w, height: h, hideLineLength: true},
          autoSize: true,
          fixedMtextSize: undefined,
          fixedDimTextSize: undefined
        };
        const {small, large} = await getImg(shiyitu.data, previewParams, true);
        shiyitu.img = small;
        shiyitu.imgLarge = large;
      }
      let showCads = true;
      if (this.type() === "生产流程单") {
        showCads = false;
      }
      if (showCads) {
        const cadsSizes = this.cadsSizes();
        for (const [j, cad] of cads.entries()) {
          cad.imgSize = cadsSizes.at(i)?.cads.at(j)?.img || [0, 0];
          setData(cad.data, materialResult);
        }
        if (showCadSmallImg) {
          await Promise.all(
            cads.map(async (v) => {
              const {small, large} = await getImg(v.data, {config: {width: v.imgSize[0], height: v.imgSize[1]}}, showCadLargeImg);
              v.img = small;
              v.imgLarge = large;
            })
          );
        } else {
          await Promise.all(cads.map(async (v) => (v.img = imgCadEmpty)));
        }
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
          delete order.shiyitus;
          let orderCurr: Order | null = null;
          let orderPrev: Order | null = null;
          const group1: Order["cads"][number][] = [];
          const group2: Order["cads"][number][] = [];
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
              if (item.forceBreak && !itemNext?.forceBreak) {
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
            i++;
            j = 0;
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
    const cadEls = this.cadsEls();
    await waitFor(() => {
      for (const {nativeElement: cadEl} of cadEls) {
        const imgEl = cadEl.querySelector(".cad-image");
        if (!(imgEl instanceof HTMLElement)) {
          continue;
        }
        const rect = imgEl.getBoundingClientRect();
        if (rect.height > 0) {
          return true;
        }
      }
      return null;
    });
    this.cd.markForCheck();
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

  updateBarcodes() {
    const barcodeEls = this.barcodeEls();
    for (const {nativeElement: el} of barcodeEls) {
      getOrderBarcode(el, {displayValue: false, margin: 0});
    }
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
      const calcResult = await calcZxpj(this.dialog, this.message, this.calc, this.status, {}, [mokuai], [], {useCeshishuju: true});
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
          const result: Order["cads"][number] = {
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
          this.updateCadZhankaiDisplayInfos(result);
          return result;
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

  setCad(cad: Order["cads"][number], i: number, j: number, position: number[]) {
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

  getLabel(cell: SectionCell) {
    return cell.label || cell.key;
  }

  getValue(section: ObjectOf<any>, cell: SectionCell) {
    const prefixs = ["流程单", "订货单"];
    let key = cell.key || "";
    for (const prefix of prefixs) {
      const key2 = prefix + key;
      if (key2 in section) {
        key = key2;
        break;
      }
    }
    const value = String(section[key] || "");
    if ((cell.key || cell.label) === "页厚" && value === "0") {
      return "";
    }
    if (cell.isBoolean) {
      let value2 = section[key];
      if (["安装孔", "拉片"].includes(key)) {
        value2 = section.安装 === key;
      }
      if (typeof value2 === "string") {
        if (["无", "否", ""].includes(value2)) {
          value2 = false;
        } else {
          value2 = true;
        }
      } else {
        value2 = Boolean(value2);
      }
      if (typeof value2 === "boolean") {
        return value2 ? "✔" : "✖";
      }
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

  updateCadZhankaiDisplayInfos(cad: Order["cads"][number]) {
    const {data, zhankai: zhankais} = cad;
    if (!zhankais) {
      delete cad.zhankaiDisplayInfos;
      return;
    }
    const infos: NonNullable<typeof cad.zhankaiDisplayInfos> = [];
    for (const zhankai of zhankais) {
      const kuan = getIsCadSuanliaoxianshi(data, "展开宽");
      const gao = getIsCadSuanliaoxianshi(data, "展开高");
      const sign = kuan && gao;
      const num = (kuan || gao) && isTypeOf(zhankai.num, ["number", "string"]);
      infos.push({kuan, gao, sign, num});
    }
    cad.zhankaiDisplayInfos = infos;
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

  getFormStyle(form: Form) {
    return {...this.formsStyle(), ...form.style};
  }
}
