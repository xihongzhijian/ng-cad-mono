import {AfterViewInit, Component, computed, ElementRef, HostListener, inject, OnDestroy, signal, viewChild} from "@angular/core";
import {toSignal} from "@angular/core/rxjs-interop";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {DomSanitizer} from "@angular/platform-browser";
import {ActivatedRoute, Params} from "@angular/router";
import {session, setGlobal, timer} from "@app/app.common";
import {configCadDataForPrint, printCads} from "@app/cad/print";
import {PrintCadsParams} from "@app/cad/print.types";
import {getCadCalcZhankaiText} from "@app/cad/utils";
import {toFixed} from "@app/utils/func";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianCadItem, ZixuanpeijianInfo, ZixuanpeijianOutput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {exportZixuanpeijian, importZixuanpeijian} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {Debounce} from "@decorators/debounce";
import {environment} from "@env";
import {CadData, CadLine, CadMtext, CadViewer} from "@lucilor/cad-viewer";
import {downloadByBlob, downloadByUrl, DownloadOptions, loadImage, ObjectOf, selectFiles, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {
  slideInDownOnEnterAnimation,
  slideInRightOnEnterAnimation,
  slideOutRightOnLeaveAnimation,
  slideOutUpOnLeaveAnimation
} from "angular-animations";
import imageCompression from "browser-image-compression";
import {intersection} from "lodash";
import {ContentImage} from "pdfmake/interfaces";
import printJS from "print-js";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {SpinnerComponent} from "../../modules/spinner/components/spinner/spinner.component";

const duration = 400;
@Component({
  selector: "app-print-cad",
  templateUrl: "./print-cad.component.html",
  styleUrls: ["./print-cad.component.scss"],
  animations: [
    slideInDownOnEnterAnimation({anchor: "toolbarEnter", duration}),
    slideOutUpOnLeaveAnimation({anchor: "toolbarLeave", duration}),
    slideInRightOnEnterAnimation({anchor: "toolbarToggleEnter", duration}),
    slideOutRightOnLeaveAnimation({anchor: "toolbarToggleLeave", duration})
  ],
  imports: [
    FormsModule,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    SpinnerComponent
  ]
})
export class PrintCadComponent implements AfterViewInit, OnDestroy {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  loaderId = "printLoader";
  pdfUrlRaw = signal("");
  pdfUrl = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrlRaw()));
  imageContents: ContentImage[] = [];
  pdfFile: File | null = null;
  showDxfInput = signal(false);
  private _paramKey = "printCad-paramCache";
  private _httpCacheKey = "printCad-httpCache";
  fonts = ["微软雅黑", "宋体", "锐字工房云字库魏体GBK", "等距更纱黑体 SC"];
  downloadUrl = signal<string | null>(null);
  mode = signal<"edit" | "print">("print");
  showSavePdf = computed(() => this.status.projectConfig.getBoolean("算料单有保存PDF文件功能"));
  printParams = signal<Required<PrintCadsParams>>({
    cads: [],
    projectConfig: this.status.projectConfig,
    codes: [],
    type: "",
    config: {fontStyle: {family: this.fonts[0]}},
    linewidth: 2,
    dimStyle: {},
    designPics: {
      设计图: {
        urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
        showSmall: true,
        showLarge: false,
        styles: {
          margin: 10,
          anchorBg: [1, 0.5],
          anchorImg: [1, 0.5]
        }
      },
      花件图: {
        urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
        showSmall: true,
        showLarge: false,
        styles: {
          margin: 10,
          anchorBg: [0.5, 0.5],
          anchorImg: [0.5, 0.5]
        }
      }
    },
    extra: {
      拉手信息宽度: 578
    },
    url: "",
    keepCad: true,
    info: {},
    orders: [],
    textMap: {},
    dropDownKeys: [],
    projectName: this.status.project,
    errors: [],
    printType: ""
  });
  cad: CadViewer | null = null;
  zixuanpeijian: Pick<Required<ZixuanpeijianOutput>, "模块" | "零散"> = {模块: [], 零散: []};
  comments: CadMtext[] = [];
  production = environment.production;
  checkEmpty = signal(this.production ? true : false);
  orderImageUrl = signal("");
  shuchubianliangKeys = signal<string[]>([]);

  queryParams = toSignal(this.route.queryParams, {initialValue: {} as Params});

  materialResult = computed(() => {
    return this.printParams().orders[0]?.materialResult || {};
  });

  private _getPrintType(params: PrintCadsParams, queryParams: Params) {
    let type = params.printType || "算料单";
    if (type === "算料单") {
      const {指定分类} = queryParams;
      if (指定分类) {
        type = 指定分类;
      }
    }
    return type;
  }
  printType = computed(() => this._getPrintType(this.printParams(), this.queryParams()));
  enableZixuanpeijian = computed(() => {
    return this.printParams().cads.length === 1 && this.printType() === "算料单";
  });
  enableOrderImageMenu = computed(() => {
    return this.printType() !== "算料单";
  });

  fontFamilyInputInfo = computed(() => {
    const printParams = this.printParams();
    const config = printParams.config;
    const info: InputInfo = {
      type: "string",
      label: "字体",
      options: this.fonts,
      value: config.fontStyle?.family,
      onChange: (val) => {
        if (!config.fontStyle) {
          config.fontStyle = {};
        }
        config.fontStyle.family = val;
        this.printParams.set({...printParams});
      },
      style: {flex: "0 0 250px"}
    };
    return info;
  });

  async ngAfterViewInit() {
    await timeout(0);
    setGlobal("print", this);
    const queryParams = {...this.route.snapshot.queryParams};
    const action = queryParams.action as string;
    delete queryParams.action;
    if (!action) {
      this.showDxfInput.set(true);
      this._loadPrintParams();
      if (this.printParams().cads.length > 0) {
        await this.generateSuanliaodan();
      }
      return;
    }
    this.spinner.show(this.loaderId, {text: "正在获取数据..."});
    try {
      let responseData = session.load<PrintCadsParams>(this._httpCacheKey);
      if (!responseData) {
        responseData = await this.http.getData<PrintCadsParams>(action, queryParams, {encrypt: "both", spinner: false});
        if (!this.production) {
          try {
            session.save(this._httpCacheKey, responseData);
          } catch {}
        }
      }
      if (responseData) {
        if (responseData.errors && responseData.errors.length > 0) {
          this.spinner.hide(this.loaderId);
          await this.message.error(responseData.errors.join("<br>"));
        }
        responseData.cads = responseData.cads.map((v) => new CadData(v));
        if (responseData.orders) {
          for (const order of responseData.orders) {
            if (order.unfold) {
              for (const v of order.unfold) {
                v.cad = new CadData(v.cad, true);
              }
            }
          }
        }
        this.downloadUrl.set(responseData.url || null);
        const printParams = {...this.printParams(), ...responseData};
        const printType = this._getPrintType(printParams, queryParams);
        printParams.info.title = `${printParams.codes.join("、")} ${printType}`;
        document.title = printParams.info.title;
        const {codes, type} = printParams;
        if (codes.length === 1) {
          const response2 = await this.http.post<ZixuanpeijianOutput>(
            "ngcad/getOrderZixuanpeijian",
            {
              code: codes[0],
              type
            },
            {spinner: false}
          );
          if (response2?.data) {
            const {模块, 零散, 备注, 文本映射} = importZixuanpeijian(response2.data);
            this.zixuanpeijian = {模块, 零散};
            this.comments = 备注;
            printParams.textMap = Array.isArray(文本映射) ? {} : 文本映射;
          } else {
            this.zixuanpeijian = {模块: [], 零散: []};
          }
        }
        this.printParams.set(printParams);
        await this.setZixuanpeijian();
        await this.generateSuanliaodan();
      }
    } catch (error) {
      console.error(error);
      const printType = this.printType();
      this.message.alert(`打印${printType}出错`);
    } finally {
      this.spinner.hide(this.loaderId);
    }
    await this.getOrderImage();
  }

  ngOnDestroy() {
    this.cad?.destroy();
  }

  private _loadPrintParams() {
    const params = session.load<Required<PrintCadsParams>>(this._paramKey);
    if (params) {
      const cads = params.cads.map((v) => new CadData(v));
      this.printParams.update((v) => ({...v, cads}));
    }
  }

  private _savePrintParams() {
    const cads = this.printParams().cads.map((v) => v.export());
    session.save(this._paramKey, {...this.printParams, cads});
  }

  private _translateCadData(displayedData: CadData | null, info: ZixuanpeijianInfo, dx: number, dy: number) {
    displayedData?.transform({translate: [dx, dy]}, true);
    const translate = info.translate;
    if (translate) {
      translate[0] += dx;
      translate[1] += dy;
    } else {
      info.translate = [dx, dy];
    }
  }

  @HostListener("window:keydown", ["$event"])
  @Debounce(500)
  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "p") {
      event.preventDefault();
      this.print();
    }
  }

  async print() {
    printJS({printable: this.pdfUrlRaw(), type: "pdf"});
  }

  async generateSuanliaodan() {
    const params = this.printParams();
    timer.start(this.loaderId);
    const printType = this.printType();
    this.spinner.show(this.loaderId, {text: `正在生成${printType}...`});
    const cads = params.cads.map((v) => this.splitCads(v)).flat();
    // cads.forEach((v) => {
    //     v.entities.forEach((e) => (e.selectable = false));
    // });
    if (this.enableZixuanpeijian()) {
      params.keepCad = true;
    } else {
      params.keepCad = false;
    }
    const {url, errors, cad, pdfFile, imageContents} = await printCads({...params, cads});
    this.imageContents = imageContents;
    if (this.enableZixuanpeijian()) {
      this.cad = cad;
      if (this.mode() === "edit") {
        this.initCad();
      } else {
        this.uninitCad();
      }
    }
    this.spinner.hide(this.loaderId);
    if (errors.length > 0) {
      console.warn(errors);
    }
    this.pdfUrlRaw.set(url);
    this.pdfFile = pdfFile;
    timer.end(this.loaderId, `生成${printType}`);
  }

  async uploadDxf(type: "dxf" | "json") {
    const files = await selectFiles({accept: `.${type}`});
    const file = files?.[0];
    if (!file) {
      return;
    }
    let data: CadData | null = null;
    if (file.name.endsWith(".dxf")) {
      this.spinner.show(this.loaderId, {text: "正在上传文件..."});
      data = await this.http.uploadDxf(file);
    } else {
      data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
          resolve(new CadData(JSON.parse(reader.result as string)));
        };
      });
    }
    if (!data) {
      return;
    }
    this.printParams.update((v) => ({...v, cads: [data]}));
    await this.generateSuanliaodan();
    this.spinner.hide(this.loaderId);
    this._savePrintParams();
  }

  toolbarVisible = signal(true);
  toggleToolbarVisible() {
    this.toolbarVisible.update((v) => !v);
  }

  downloadDxf(original: boolean) {
    const options: DownloadOptions = {filename: document.title + ".dxf"};
    if (original) {
      const url = this.downloadUrl();
      if (url !== null) {
        downloadByUrl(url, options);
      } else {
        this.message.alert("没有提供下载地址");
      }
    } else {
      if (this.cad && this.enableZixuanpeijian()) {
        this.http.downloadDxf(this.cad.data, options);
      } else {
        this.message.alert("没有提供下载数据");
      }
    }
  }

  splitCads(source: CadData) {
    const {top, bottom} = source.getBoundingRect();
    const yValues = [bottom - 500, top + 500];
    const layerName = "分页线";
    source.entities.line.forEach((e) => {
      if (e.layer === layerName) {
        yValues.push(e.start.y);
      }
    });
    const count = yValues.length - 1;
    if (count < 2) {
      return [source];
    }
    yValues.sort((a, b) => a - b);
    const result: CadData[] = Array(count);
    for (let i = 0; i < yValues.length - 1; i++) {
      result[i] = new CadData();
    }
    source.entities.forEach((e) => {
      if (e.layer === layerName) {
        return;
      }
      const {bottom: y1, top: y2} = e.boundingRect;
      const index = yValues.findIndex((v, i) => {
        if (i === 0) {
          return false;
        }
        return yValues[i - 1] < y1 && v > y2;
      });
      if (index < 1) {
        return;
      }
      result[count - index].entities.add(e);
    });
    return result;
  }

  async toggleMode() {
    // if (this.mode === "edit") {
    //     location.reload();
    //     return;
    // } else {
    //     this.mode = "edit";
    // }
    this.mode.update((v) => (v === "edit" ? "print" : "edit"));
    await timeout(0);
    if (this.mode() === "edit") {
      await this.initCad();
    } else {
      this.uninitCad();
      if (this.cad) {
        const cads = this.printParams().cads.slice();
        cads[0] = this.cad.data;
        this.printParams.update((v) => ({...v, cads}));
      }
      await this.generateSuanliaodan();
    }
  }

  private _getCommentInputInfo(value: string): InputInfo {
    return {value, validators: Validators.required, type: "string", label: "备注", textarea: {autosize: {minRows: 2, maxRows: 5}}};
  }

  cadContainer = viewChild<ElementRef<HTMLDivElement>>("cadContainer");
  async initCad() {
    const cad = this.cad;
    const container = this.cadContainer()?.nativeElement;
    if (!cad || !container) {
      return;
    }
    const {width, height} = container.getBoundingClientRect();
    cad.setConfig({width, height, padding: [10], hideLineLength: false});
    if (cad.dom.parentElement !== container) {
      container.appendChild(cad.dom);
    }
    cad.on("entitiesselect", (entities) => {
      const data = cad.data.components.data;
      const ids = entities.toArray(true).map((e) => e.id);
      cad.unselectAll();
      for (const v of data) {
        const ids2 = v.entities.toArray(true).map((e) => e.id);
        if (intersection(ids, ids2).length === ids.length) {
          v.entities.forEach((e) => (e.selected = true));
        }
      }
      entities.forEach((e) => {
        if (e.info.isComment) {
          e.selected = true;
        }
      });
    });
    cad.on("entitiesunselect", (entities) => {
      const data = cad.data.components.data;
      const ids = entities.toArray(true).map((e) => e.id);
      data.forEach((v) => {
        const ids2 = v.entities.toArray(true).map((e) => e.id);
        if (intersection(ids, ids2).length > 0) {
          v.entities.forEach((e) => (e.selected = false));
        }
      });
    });
    cad.on("moveentities", (entities, translate) => {
      const data = cad.data.components.data;
      const ids = entities.toArray(true).map((e) => e.id);
      data.forEach((v) => {
        const ids2 = v.entities.toArray(true).map((e) => e.id);
        if (intersection(ids, ids2).length > 0) {
          let cadItem = this.zixuanpeijian.模块.flatMap((vv) => vv.cads).find((vv) => vv.displayedData?.id === v.id);
          if (!cadItem) {
            cadItem = this.zixuanpeijian.零散.find((vv) => vv.displayedData?.id === v.id);
          }
          if (cadItem) {
            this._translateCadData(null, cadItem.info, ...translate);
          }
        }
      });
    });
    cad.on("entitydblclick", async (_, entity) => {
      if (entity instanceof CadMtext) {
        const isComment = entity.info.isComment;
        const canModify = isNaN(Number(entity.text));
        if (isComment || canModify) {
          const text = await this.message.prompt(this._getCommentInputInfo(entity.text));
          if (text) {
            if (!text) {
              this.printParams.update((v) => ({...v, textMap: {...v.textMap, [entity.text]: text}}));
            }
            entity.text = text;
            this.cad?.render(entity);
          }
        }
      }
    });
    cad.on("entitiesremove", (entities) => {
      const comments: CadMtext[] = [];
      for (const e of entities.mtext) {
        if (e.info.isComment) {
          comments.push(e);
        } else {
          this.printParams.update((v) => ({...v, textMap: {...v.textMap, [e.text]: ""}}));
        }
      }
      this.comments = this.comments.filter((e) => !comments.find((ee) => ee.id === e.id));
    });
  }

  uninitCad() {
    const cad = this.cad;
    if (!cad) {
      return;
    }
    cad.destroy();
  }

  async openZixuanpeijianDialog() {
    const printParams = this.printParams();
    const code = printParams.codes[0];
    if (!code) {
      this.message.alert("订单没保存，无法操作");
      return;
    }
    const data = await openZixuanpeijianDialog(this.dialog, {
      data: {
        step: 2,
        data: this.zixuanpeijian,
        checkEmpty: this.checkEmpty(),
        cadConfig: {fontStyle: {family: printParams.config.fontStyle?.family}},
        order: {code, type: printParams.type, materialResult: this.materialResult()},
        dropDownKeys: printParams.dropDownKeys
      }
    });
    if (data) {
      this.zixuanpeijian = data;
      this.spinner.show(this.loaderId, {text: "正在保存自选配件"});
      await this.setZixuanpeijian();
      this.cad?.center();
      await this.setOrderZixuanpeijian();
      this.spinner.hide(this.loaderId);
    }
  }

  async setZixuanpeijian(resetTranslate = false) {
    const cad = this.cad;
    const cads: CadData[] = [];
    const cads2: CadData[] = [];
    const infos: ObjectOf<ZixuanpeijianInfo> = {};

    const setCadItem = (item: ZixuanpeijianCadItem) => {
      if (cad) {
        delete item.displayedData;
      }
      if (resetTranslate) {
        delete item.info.translate;
      }
      if (!item.displayedData) {
        item.displayedData = item.data.clone();
        const translate = item.info.translate;
        if (translate) {
          item.displayedData.transform({translate}, true);
        }
      }
      if (!item.info.hidden) {
        const data = item.displayedData;
        cads.push(data);
        cads2.push(item.data);
        infos[data.id] = item.info;
        for (const e of data.entities.dimension) {
          if (e.mingzi === "<>") {
            const points = item.data.getDimensionPoints(e);
            if (points.length < 4) {
              continue;
            }
            e.mingzi = toFixed(points[2].distanceTo(points[3]), 0);
          }
        }
      }
    };

    const shuchubianliangKeys = new Set<string>();
    const printParams = this.printParams();
    for (const key of printParams.dropDownKeys) {
      shuchubianliangKeys.add(key);
    }
    for (const item of this.zixuanpeijian.模块) {
      for (const cadItem of item.cads) {
        setCadItem(cadItem);
      }
      for (const v of item.shuchubianliang) {
        shuchubianliangKeys.add(v);
      }
    }
    for (const item of this.zixuanpeijian.零散) {
      setCadItem(item);
    }
    this.shuchubianliangKeys.set(Array.from(shuchubianliangKeys));
    if (cad) {
      cad.data.entities.mtext = cad.data.entities.mtext.filter((e) => !e.info.isComment);
      for (const e of this.comments) {
        this.addCommentText(e);
      }
    } else {
      const cads3 = printParams.cads.slice();
      cads3[0].entities.mtext = cads3[0].entities.mtext.filter((e) => !e.info.isComment);
      for (const e of this.comments) {
        cads3[0].entities.add(e);
      }
      this.printParams.update((v) => ({...v, cads: cads3}));
    }
    if (cad) {
      const tol = 2;
      const toArrange: [number, CadData][] = [];
      cad.data.components.data = cads;
      await cad.reset().render();
      for (const [i, v] of cads.entries()) {
        const info = infos[v.id];
        if (!info.translate) {
          toArrange.push([i, v]);
        }
        await configCadDataForPrint(cad, v, printParams, {isZxpj: true, lineLengthFontStyle: {size: 40}});
        await cad.render(v.entities);
        const rect = v.getBoundingRect();
        let zhankaiText = v.entities.mtext.find((e) => e.info.isZhankaiText);
        if (v.suanliaochuli.includes("显示展开")) {
          if (!zhankaiText) {
            zhankaiText = new CadMtext({info: {isZhankaiText: true}});
            v.entities.add(zhankaiText);
          }
          let 展开算料文字大小 = Number(this.status.projectConfig.get("展开算料文字大小"));
          if (isNaN(展开算料文字大小) || 展开算料文字大小 <= 0) {
            展开算料文字大小 = 40;
          }
          zhankaiText.fontStyle.size = 展开算料文字大小;
          zhankaiText.text = this.getCalcZhankaiText(v, info);
          zhankaiText.anchor.set(0, 0);
          zhankaiText.insert.set(rect.left, rect.bottom - 10);
          await cad.render(zhankaiText);
        } else {
          if (zhankaiText) {
            v.entities.remove(zhankaiText);
          }
        }
      }

      if (toArrange.length > 0) {
        if (toArrange.length === cads.length) {
          let hLinesMaxLength = -1;
          const hLines: CadLine[] = [];
          let vLinesMaxLength = -1;
          const vLines: CadLine[] = [];
          cad.data.entities.line.forEach((e) => {
            if (e.isHorizontal()) {
              hLines.push(e);
              hLinesMaxLength = Math.max(hLinesMaxLength, e.length);
            } else if (e.isVertical()) {
              vLines.push(e);
              vLinesMaxLength = Math.max(vLinesMaxLength, e.length);
            }
          });
          const hLines2 = hLines.filter((e) => Math.abs(e.length - hLinesMaxLength) < tol);
          hLines2.sort((a, b) => a.start.y - b.start.y);
          const vLines2 = vLines.filter((e) => Math.abs(e.length - vLinesMaxLength) < tol);
          vLines2.sort((a, b) => a.start.x - b.start.x);
          const leftLine = vLines2[0];
          const bottomLine1 = hLines2[0];
          const bottomLine2 = hLines2[1];
          let bottomLine: CadLine;
          if (bottomLine2 && bottomLine2.start.y - bottomLine1.start.y < 500) {
            bottomLine = bottomLine2;
          } else {
            bottomLine = bottomLine1;
          }
          const leftLineX = leftLine.maxX;
          const hLines3 = hLines.filter(
            (e) => e.start.y > bottomLine.start.y && (Math.abs(e.start.x - leftLineX) < tol || Math.abs(e.end.x - leftLineX) < tol)
          );
          hLines3.sort((a, b) => a.start.y - b.start.y);
          const left = leftLine.start.x;
          const bottom = bottomLine.start.y;
          const right = leftLine.start.x + hLines3[0].length;
          const top = hLines3[0].start.y;
          const cols = toArrange.length > 6 ? 3 : 2;
          const boxWidth = (right - left) / cols;
          const boxHeight = (top - bottom) / 3;
          for (const [i, v] of toArrange) {
            const x = left + (i % cols) * boxWidth + boxWidth / 2;
            const y = top - Math.floor(i / cols) * boxHeight - boxHeight / 2;
            const rect2 = v.getBoundingRect();
            const dx = x - rect2.x;
            const dy = y - rect2.y;
            this._translateCadData(v, infos[v.id], dx, dy);
            await cad.render(v.getAllEntities());
          }
        } else {
          const rectBg = cad.data.entities.getBoundingRect();
          const rects = toArrange.map(([, v]) => v.getBoundingRect());
          const spaceX = 50;
          const spaceY = 50;
          const height = rects.reduce((a, b) => a + b.height, 0) + spaceY * (rects.length - 1);
          let currY = rectBg.y + height / 2;
          for (const [i, [, v]] of toArrange.entries()) {
            const rect = rects[i];
            const dx = rectBg.right - rect.left + spaceX;
            const dy = currY - rect.top;
            this._translateCadData(v, infos[v.id], dx, dy);
            currY -= rect.height + spaceY;
            await cad.render(v.getAllEntities());
          }
        }
      }
    } else {
      const cads3 = printParams.cads.slice();
      cads3[0].components.data = cads;
      this.printParams.update((v) => ({...v, cads: cads3}));
    }
  }

  async setOrderZixuanpeijian() {
    const printParams = this.printParams();
    const {codes, type} = printParams;
    const cad = this.cad;
    if (!cad) {
      return;
    }
    const {模块, 零散} = this.zixuanpeijian;
    const 备注 = this.comments;
    const 文本映射 = printParams.textMap;
    const 输出变量: ObjectOf<string> = {};
    const materialResult = this.materialResult();
    for (const key of this.shuchubianliangKeys()) {
      输出变量[key] = key in materialResult ? String(materialResult[key]) : "";
    }
    await this.http.post<void>("ngcad/setOrderZixuanpeijian", {
      code: codes[0],
      type,
      data: exportZixuanpeijian({模块, 零散, 备注, 文本映射, 输出变量})
    });
  }

  async getOrderImage() {
    const printParams = this.printParams();
    const responseData = await this.http.getData<{prefix: string; data: {zhengmiantu: string}[]}>(
      "order/api/getImage",
      {
        code: printParams.codes[0],
        type: printParams.type
      },
      {spinner: false}
    );
    if (responseData && responseData.data.length > 0) {
      const {prefix, data} = responseData;
      this.orderImageUrl.set(data[0].zhengmiantu ? prefix + data[0].zhengmiantu : "");
    }
  }

  async uploadOrderImage() {
    const files = await selectFiles({accept: "imagee/*"});
    let file = files?.[0];
    if (!file) {
      return;
    }
    const blob = await imageCompression(file, {maxSizeMB: 1, useWebWorker: true});
    file = new File([blob], file.name, {type: file.type});
    const printParams = this.printParams();
    const data = await this.http.getData<{prefix: string; save_path: string}>(
      "order/api/uploadImage",
      {
        code: printParams.codes[0],
        type: printParams.type,
        field: "zhengmiantu",
        file
      },
      {spinner: false}
    );
    if (data) {
      const {prefix, save_path} = data;
      this.orderImageUrl.set(prefix + save_path);
      const cad = this.cad;
      if (cad) {
        cad.data.entities.image
          .filter((e) => e.info.designPicKey === "设计图")
          .forEach((e) => {
            e.url = this.orderImageUrl();
            cad.render(e);
          });
      }
      const 设计图 = this.printParams().designPics.设计图;
      if (设计图) {
        设计图.urls = 设计图.urls.map((v) => v.map(() => this.orderImageUrl()));
      }
    }
  }

  async addCommentText(mtext?: CadMtext) {
    const cad = this.cad;
    if (!cad) {
      return;
    }
    if (!mtext) {
      const text = await this.message.prompt(this._getCommentInputInfo(""));
      if (!text) {
        return;
      }
      mtext = new CadMtext({text});
      const rect = cad.data.getBoundingRect();
      mtext.anchor.set(0, 0.5);
      mtext.insert.set(rect.right + 50, rect.y);
      this.comments.push(mtext);
    }
    mtext.fontStyle.size = 40;
    mtext.info.isComment = true;
    cad.add(mtext);
  }

  clearHttpCache() {
    session.remove(this._httpCacheKey);
  }

  async resetTextMap() {
    this.printParams.update((v) => ({...v, textMap: {}}));
    this.spinner.show(this.loaderId, {text: "正在保存自选配件"});
    await this.setZixuanpeijian();
    await this.setOrderZixuanpeijian();
    this.spinner.hide(this.loaderId);
  }

  async resetTranslate() {
    await this.setZixuanpeijian(true);
    this.cad?.center();
  }

  getCalcZhankaiText(cad: CadData, info: ZixuanpeijianInfo) {
    const materialResult = this.materialResult || {};
    const calcZhankai = info.calcZhankai;
    const 项目配置 = this.status.projectConfig.getRaw();
    const 项目名 = this.status.project;
    const text = getCadCalcZhankaiText(cad, calcZhankai, materialResult, info.bancai || {}, 项目配置, 项目名);
    return text;
  }

  openCadMuban() {
    const id = this.printParams().cads[0]?.id;
    if (!id) {
      this.message.alert("没有cad模板");
      return;
    }
    this.status.openCadInNewTab(id, "CADmuban");
  }

  async savePdf() {
    const {pdfFile} = this;
    if (!pdfFile) {
      await this.message.alert("没有pdf文件");
      return;
    }
    const {codes} = this.printParams();
    if (codes.length < 1) {
      await this.message.alert("没有订单号");
      return;
    }
    if (codes.length > 1) {
      await this.message.alert("错误：只能保存一个订单的pdf文件");
      return;
    }
    const table = "j_dingdansuandanshenhe";
    const records = await this.http.queryMySql({table, fields: ["vid"], filter: {where: {mingzi: codes[0]}}});
    const record = records[0];
    if (!record) {
      await this.message.alert("【订单算单审核】查询不到订单");
      return;
    }
    await this.http.post("jichu/jichu/upload_file", {
      table,
      vid: record.vid,
      field: "suanliaodanpdf",
      file: pdfFile
    });
  }

  async saveAsImage(space = 10) {
    const canvas = document.createElement("canvas");
    let canvasWidth = 0;
    let canvasHeight = 0;
    const images2: HTMLImageElement[] = [];
    this.spinner.show(this.loaderId, {text: "正在生成图片..."});
    for (const [i, {image}] of this.imageContents.entries()) {
      let image2: HTMLImageElement;
      try {
        image2 = await loadImage(image);
      } catch {
        continue;
      }
      images2.push(image2);
      const imgWidth = image2.width;
      const imgHeight = image2.height;
      canvasWidth = Math.max(canvasWidth, imgWidth);
      canvasHeight += imgHeight;
      if (i > 0) {
        canvasHeight += space;
      }
    }
    this.spinner.hide(this.loaderId);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    let heightCanvas2 = 0;
    for (const image2 of images2) {
      const {width, height} = image2;
      ctx.drawImage(image2, 0, heightCanvas2, width, height);
      heightCanvas2 += height + space;
    }
    canvas.toBlob((blob) => {
      if (blob) {
        const title = this.printParams().info.title;
        downloadByBlob(blob, {filename: `${title}.png`});
      } else {
        this.message.alert("生成图片失败");
      }
    });
  }
}
