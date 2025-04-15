import {computed, effect, inject, Injectable, signal, untracked} from "@angular/core";
import {ActivatedRoute, Params, Router, UrlCreationOptions} from "@angular/router";
import {setCadData, unsetCadData} from "@app/cad/cad-data-transform";
import {getCadPreview, updateCadPreviewImg} from "@app/cad/cad-preview";
import {Cad数据要求, Cad数据要求Raw} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {
  exportCadData,
  filterCadEntitiesToSave,
  generateLineTexts2,
  getCadTotalLength,
  getLineLengthTextSize,
  isCadCollectionOfCad,
  prepareCadViewer,
  removeIntersections,
  showIntersections,
  suanliaodanZoomIn,
  suanliaodanZoomOut,
  validateCad,
  validateLines
} from "@app/cad/utils";
import {ResultWithErrors} from "@app/utils/error-message";
import {FetchManager} from "@app/utils/fetch-manager";
import {getInsertName} from "@app/utils/get-value";
import {ProjectConfig, ProjectConfigRaw} from "@app/utils/project-config";
import {算料公式} from "@components/lurushuju/xinghao-data";
import {getSbjbCadName, isSbjbItemOptionalKeys3} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.utils";
import {environment} from "@env";
import {
  CadData,
  CadDimension,
  CadDimensionLinear,
  CadEntities,
  CadEntity,
  CadHatch,
  CadLine,
  CadLineLike,
  CadMtext,
  CadViewer,
  generatePointsMap,
  getDimensionLinePoint,
  PointsMap,
  setLinesLength
} from "@lucilor/cad-viewer";
import {FileSizeOptions, getFileSize, isTypeOf, MaybePromise, ObjectOf, Point, timeout} from "@lucilor/utils";
import {refreshCadFenti} from "@modules/cad-editor/components/menu/cad-fenti-config/cad-fenti-config.utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {clamp, cloneDeep, differenceWith, isEmpty, isEqual} from "lodash";
import {BehaviorSubject, Subject, take} from "rxjs";
import {local, remoteHost, timer} from "../app.common";
import {AppConfig, AppConfigService} from "./app-config.service";
import {AppUser, CadPoints, HoutaiInputOptions, OpenCadOptions} from "./app-status.types";
import {CadStatus, CadStatusNormal} from "./cad-status";

const 合型板示意图 = new CadData();
合型板示意图.entities.add(new CadLine({start: [0, 20], end: [0, -20]}));
合型板示意图.entities.add(new CadLine({start: [0, 20], end: [8, 20]}));
合型板示意图.entities.add(new CadLine({start: [0, -20], end: [8, -20]}));
合型板示意图.entities.add(new CadLine({start: [20, 0], end: [-20, 0]}));
合型板示意图.entities.add(new CadLine({start: [20, 0], end: [20, 8]}));
合型板示意图.entities.add(new CadLine({start: [-20, 0], end: [-20, 8]}));
合型板示意图.entities.add(new CadLine({start: [20, 0], end: [20, 8]}));
const replaceMap: ObjectOf<CadData> = {合型板示意图};

@Injectable({
  providedIn: "root"
})
export class AppStatusService {
  private config = inject(AppConfigService);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private spinner = inject(SpinnerService);

  project = "";
  collection$ = new BehaviorSubject<CadCollection>("cad");
  cadTotalLength = signal(0);
  cad = new CadViewer(setCadData(new CadData({name: "新建CAD", info: {isLocal: true}}), this.project, "cad", this.config.getConfig()));
  components = {
    selected: signal<CadData[]>([]),
    mode: signal<"single" | "multiple">("single"),
    selectable: signal<boolean>(true)
  };
  openCadOptions = signal<OpenCadOptions>({});
  private _changeCadSignal = signal(0);
  emitChangeCadSignal() {
    this._changeCadSignal.set(this._changeCadSignal() + Math.random() < 0.5 ? 1 : -1);
  }
  cadData = signal(this.cad.data);
  cadDataEff = effect(() => {
    this._changeCadSignal();
    this.openCadOptions();
    this.cadData.set(new CadData());
    this.cadData.set(this.cad.data);
  });
  saveCadStart$ = new Subject<void>();
  saveCadEnd$ = new Subject<{data: CadData}>();
  saveCadLocked$ = new BehaviorSubject<boolean>(false);
  cadPoints = signal<CadPoints>([]);
  setProject$ = new Subject<void>();
  user$ = new BehaviorSubject<AppUser | null>(null);
  isAdmin$ = new BehaviorSubject<boolean>(false);
  updateTimeStamp = signal<number>(-1);
  zhewanLengths = signal<[number, number]>([1, 3]);
  changeProject$ = new Subject<string>();
  private _isZhewanLengthsFetched = false;
  projectConfig = new ProjectConfig();

  componentsModeEff = effect(() => {
    const mode = this.components.mode();
    this.config.setConfig("subCadsMultiSelect", mode === "multiple");
  });

  constructor() {
    this.cad.setConfig(this.config.getConfig());
    this.config.configChange$.subscribe(({newVal}) => {
      const cad = this.cad;
      cad.setConfig(newVal);
    });
    this.cad.on("click", (event) => {
      if (this.config.getConfig("cadPointsAnywhere")) {
        const {clientX: x, clientY: y} = event;
        this.cadPoints.update((v) => [...v, {x, y, lines: [], active: true}]);
      }
    });
  }

  private _replaceText(source: CadData, text: string, data: CadData) {
    const mtexts = source.getAllEntities().filter((e) => e instanceof CadMtext && e.text === text);
    mtexts.forEach((mtext) => {
      const insert = (mtext as CadMtext).insert;
      const entities = data.getAllEntities().clone();
      entities.transform({translate: insert.toArray()}, true);
      source.entities.merge(entities);
    });
    source.separate(new CadData({entities: mtexts.export()}));
  }

  get refreshTimeStamp() {
    return Number(local.load("refreshTimeStamp") || -1);
  }
  set refreshTimeStamp(value) {
    local.save("refreshTimeStamp", value);
  }
  async getUpdateTimeStamp() {
    const s = await this.http.getData<string>("ngcad/getUpdateTime", {beta: environment.beta}, {spinner: false});
    let n = Number(s);
    if (typeof n !== "number" || isNaN(n)) {
      n = 0;
    }
    this.updateTimeStamp.set(n);
    return n;
  }
  async setProject(queryParams: Params) {
    this.checkEnvBeta();
    const {project, action} = queryParams;
    if (project && project !== this.project) {
      this.project = project;
      this.http.baseURL = `${origin}/n/${project}/index/`;
      if (action) {
        this.config.noUser = true;
      } else {
        const response = await this.http.get<AppUser>("ngcad/getUser", {timeStamp: new Date().getTime()}, {silent: true});
        if (!response) {
          this.http.offlineMode = true;
        }
        if (response?.data) {
          this.user$.next(response.data);
          this.isAdmin$.next(response.data.isAdmin);
        }
        await this.config.getUserConfig();
      }
      const updateTimeStamp = await this.getUpdateTimeStamp();
      if (environment.production && updateTimeStamp > this.refreshTimeStamp) {
        this.message.snack("版本更新，自动刷新页面");
        this.refreshTimeStamp = new Date().getTime();
        await timeout(1000);
        location.reload();
        return false;
      }
      this.updateTimeStamp.set(updateTimeStamp);
      this.setProject$.next();

      {
        const data = await this.http.getData<ProjectConfigRaw>("ngcad/getProjectConfig", {}, {spinner: false});
        this.projectConfig.setRaw(data || {});
      }
    }
    return true;
  }

  forceUpdateCadImg = false;
  updateCadImglLock$ = new BehaviorSubject<number>(0);
  private _cadImgToUpdate = signal(new Map<string, {t: number}>());
  getCadImgToUpdate(id: string) {
    return this._cadImgToUpdate().get(id);
  }
  addCadImgToUpdate(id: string) {
    const map = new Map(this._cadImgToUpdate());
    map.set(id, {t: Date.now()});
    this._cadImgToUpdate.set(map);
  }
  removeCadImgToUpdate(id: string) {
    const map = new Map(this._cadImgToUpdate());
    map.delete(id);
    this._cadImgToUpdate.set(map);
  }

  cadStatusesPair = signal<{curr: CadStatus[]; prev: CadStatus[]}>({curr: [new CadStatusNormal()], prev: []});
  cadStatuses = computed(() => this.cadStatusesPair().curr);
  lastCadStatus = computed(() => this.cadStatuses().at(-1));
  hasCadStatus(predicate: (v: CadStatus) => boolean) {
    return this.cadStatuses().some(predicate);
  }
  findCadStatus<T extends CadStatus>(predicate: (v: CadStatus) => v is T): T | undefined;
  findCadStatus(predicate: (v: CadStatus) => boolean): CadStatus | undefined;
  findCadStatus(predicate: (v: CadStatus) => boolean) {
    return this.cadStatuses().find(predicate);
  }
  hasOtherCadStatus(predicate: (v: CadStatus) => boolean) {
    return this.cadStatuses().some((v) => !predicate(v));
  }
  setCadStatuses(statuses: CadStatus[]) {
    const pair = this.cadStatusesPair();
    this.cadStatusesPair.set({curr: [...statuses], prev: pair.curr});
  }
  toggleCadStatus(status: CadStatus) {
    const statusesPrev = this.cadStatuses().filter((v) => !(v instanceof CadStatusNormal));
    let statusesCurr = statusesPrev.filter((v) => v.isEquals(status));
    const statusesPrev2 = statusesPrev.filter((v) => v.name !== status.name);
    if (statusesCurr.length < 1) {
      statusesCurr = [...statusesPrev2, status];
    } else if (statusesCurr.length === statusesPrev.length) {
      statusesCurr = [new CadStatusNormal()];
    } else {
      statusesCurr = statusesPrev2;
    }
    this.setCadStatuses(statusesCurr);
  }
  enterCadStatus(status: CadStatus) {
    const statuses = this.cadStatuses();
    const status1 = statuses.find((v) => v.isEquals(status));
    if (status1) {
      return;
    }
    const status2 = statuses.find((v) => v.name === status.name);
    if (status2) {
      this.setCadStatuses([...statuses.filter((v) => v.name !== status.name), status]);
    } else {
      this.setCadStatuses([...statuses, status]);
    }
  }
  leaveCadStatus(status: CadStatus) {
    this.setCadStatuses(this.cadStatuses().filter((v) => !v.isEquals(status)));
  }
  getCadStatusEffect<T extends CadStatus>(
    predicate: (v: CadStatus) => v is T,
    onEnter: (cadStatus: T) => MaybePromise<void>,
    onLeave: (cadStatus: T) => MaybePromise<void>,
    onReplace?: (cadStatus: T, cadStatusPrev: T) => MaybePromise<void>
  ): void;
  getCadStatusEffect(
    predicate: (v: CadStatus) => boolean,
    onEnter: (cadStatus: CadStatus) => MaybePromise<void>,
    onLeave: (cadStatus: CadStatus) => MaybePromise<void>,
    onReplace?: (cadStatus: CadStatus, cadStatusPrev: CadStatus) => MaybePromise<void>
  ): void;
  getCadStatusEffect(
    predicate: (v: CadStatus) => boolean,
    onEnter: (cadStatus: CadStatus) => MaybePromise<void>,
    onLeave: (cadStatus: CadStatus) => MaybePromise<void>,
    onReplace?: (cadStatus: CadStatus, cadStatusPrev: CadStatus) => MaybePromise<void>
  ) {
    return effect(async () => {
      const pair = this.cadStatusesPair();
      const statusCurr = pair.curr.find(predicate);
      const statusPrev = pair.prev.find(predicate);
      if (statusCurr && !statusPrev) {
        await untracked(() => onEnter(statusCurr));
      } else if (!statusCurr && statusPrev) {
        await untracked(() => onLeave(statusPrev));
      } else if (statusCurr && statusPrev && !statusCurr.isEquals(statusPrev)) {
        if (onReplace) {
          await untracked(() => onReplace?.(statusCurr, statusPrev));
        } else {
          await untracked(() => onLeave(statusPrev));
          await untracked(() => onEnter(statusCurr));
        }
      }
    });
  }
  updateCadStatuses(fn: (status: CadStatus) => void) {
    const pair = this.cadStatusesPair();
    const curr: CadStatus[] = [];
    let isChanged = false;
    for (const status of pair.curr) {
      const status2 = cloneDeep(status);
      fn(status2);
      if (!isEqual(status, status2)) {
        isChanged = true;
      }
      curr.push(status2);
    }
    if (isChanged) {
      this.cadStatusesPair.set({curr, prev: pair.curr});
    }
  }

  async tryMoveCad() {
    const data = this.cad.data;
    const line = data.entities.line[0];
    const threshold = 1e5;
    if (!line) {
      return;
    }
    let dx = 0;
    let dy = 0;
    if (Math.abs(line.minX) > threshold) {
      dx = -line.minX;
    } else if (Math.abs(line.maxX) > threshold) {
      dx = -line.maxX;
    }
    if (Math.abs(line.minY) > threshold) {
      dy = -line.minY;
    } else if (Math.abs(line.maxY) > threshold) {
      dy = -line.maxY;
    }
    if (dx !== 0 || dy !== 0) {
      data.transform({translate: [dx, dy]}, true);
    }
  }
  async moveCadToOrigin() {
    const data = this.cad.data;
    const rect = data.getBoundingRect();
    data.transform({translate: [-rect.left, -rect.bottom]}, true);
    await this.cad.render();
    this.cad.center();
  }
  async openCad(opts: OpenCadOptions = {}) {
    const timerName = "openCad";
    timer.start(timerName);
    const cad = this.cad;
    opts = {center: false, isLocal: false, ...opts};
    const {data, center, beforeOpen, isDialog} = opts;
    let collection = opts.collection;
    if (data) {
      cad.data = data;
    }
    this.tryMoveCad();
    const isLocal = opts.isLocal || cad.data.info.isLocal || false;
    const newConfig: Partial<AppConfig> = {};
    if (collection && this.collection$.value !== collection) {
      this.collection$.next(collection);
    } else {
      collection = this.collection$.value;
    }
    if (collection === "CADmuban") {
      this.config.setConfig({hideLineLength: true, hideLineGongshi: true}, {sync: false});
    }
    const parentEl = cad.dom.parentElement;
    if (parentEl) {
      this.cad.resize(parentEl.clientWidth, parentEl.clientHeight);
    }

    const id = cad.data.id;
    const {id: id2, collection: collection2} = this.route.snapshot.queryParams;
    if (!isLocal && (id !== id2 || collection !== collection2)) {
      if (this.router.url.startsWith("/index")) {
        this.router.navigate(["/index"], {queryParams: {id, collection}, queryParamsHandling: "merge"});
      }
    }
    this.config.setUserConfig(newConfig);
    await prepareCadViewer(cad);

    const updatePreview = async (data2: CadData, mode: Parameters<typeof updateCadPreviewImg>[1]) => {
      const result = await Promise.all(data2.components.data.map(async (v) => await updateCadPreviewImg(v, mode, !shouldUpdatePreview)));
      return result.flat();
    };
    const 算料单CAD模板使用图片装配 = this.projectConfig.getBoolean("算料单CAD模板使用图片装配");
    const shouldUpdatePreview = collection === "CADmuban" && 算料单CAD模板使用图片装配;
    const prevConfig = this.config.setConfig({hideLineLength: true, hideLineGongshi: true}, {sync: false});
    await cad.reset().render();
    if (data) {
      setCadData(data, this.project, collection, this.config.getConfig());
      if (!environment.production) {
        showIntersections(data, this.projectConfig);
      }
      for (const key in replaceMap) {
        this._replaceText(data, key, replaceMap[key]);
      }
      if (Object.keys(data.对应计算条数的配件).length < 1) {
        data.对应计算条数的配件[""] = "";
      }
      suanliaodanZoomIn(data);
      if (isCadCollectionOfCad(collection)) {
        validateLines(collection, data);
      }
      this.generateLineTexts();
      await updatePreview(data, "pre");
    }

    if (center) {
      cad.center();
    }
    this.config.setConfig(prevConfig);
    await this.updateCadTotalLength();
    if (!isDialog) {
      this.updateTitle();
    }

    if (data) {
      await cad.render(await updatePreview(data, "post"));
    } else {
      await cad.render();
    }

    if (beforeOpen) {
      const res = beforeOpen(cad.data);
      if (res instanceof Promise) {
        await res;
      }
    }
    this.openCadOptions.set({...opts});
    timer.end(timerName, "打开CAD");
    return opts;
  }

  closeCad(data?: CadData) {
    if (!data) {
      data = this.cad.data;
    }
    const data2 = data.clone();
    unsetCadData(data2);
    if (!environment.production) {
      removeIntersections(data2);
    }
    data2.getAllEntities().forEach((e) => (e.visible = true));
    suanliaodanZoomOut(data2);

    const dimNames = data2.entities.dimension.filter((e) => e.mingzi).map((e) => e.mingzi);
    for (const e of data2.entities.dimension) {
      if (!e.mingzi) {
        e.mingzi = getInsertName(dimNames, "活动标注");
      }
    }

    return data2;
  }

  async saveCad(loaderId?: string, query?: OpenCadOptions["query"]): Promise<CadData | null> {
    await timeout(100); // 等待input事件触发
    const {http, message, spinner} = this;
    const collection = this.collection$.value;

    let data = this.cad.data;
    const {entities, minLineLength} = filterCadEntitiesToSave(data);
    const toDeleteCount = data.entities.length - entities.length;
    if (toDeleteCount > 0) {
      const btn = await this.message.button({
        content: `需要删除${toDeleteCount}条线长小于${minLineLength}的线`,
        buttons: ["删除", "不删除保存"],
        btnTexts: {cancel: "取消保存"}
      });
      if (btn === "取消保存") {
        return null;
      } else if (btn === "删除") {
        data.entities = entities;
      }
    }

    let resData: CadData | null = null;
    const result = this.validate(true);
    const blockError = "不能包含块";
    if (result.errors.some((v) => v.content === blockError)) {
      const button = await message.button({content: blockError, buttons: ["删除块实体"]});
      if (button !== "删除块实体") {
        return null;
      }
      data.blocks = {};
      data.entities.insert = [];
      result.errors = result.errors.filter((v) => v.content !== blockError);
    }
    if (result.hasError()) {
      const errMsgs: string[] = ["CAD存在错误，"];
      const hasFatalError = result.hasFatalError();
      if (hasFatalError) {
        errMsgs[0] += "请检查。";
      } else {
        errMsgs[0] += "是否继续保存？";
      }
      errMsgs.push(...result.errors.map((v, i) => `${i + 1}.${v.content}`));
      const errMsg = errMsgs.join("<br>");
      if (hasFatalError) {
        await message.alert(errMsg);
        return null;
      } else {
        const yes = await message.confirm(errMsg);
        if (!yes) {
          return null;
        }
      }
    }

    this.saveCadStart$.next();
    this.saveCadLocked$.next(true);
    data = this.closeCad();
    const isLocal = this.openCadOptions().isLocal;
    if (isLocal) {
      this.saveCadEnd$.next({data});
      this.saveCadLocked$.next(false);
      return data;
    }
    if (!loaderId) {
      loaderId = spinner.defaultLoaderId;
    }
    const {hideLineLength} = this.config.getConfig();
    spinner.show(loaderId, {text: `正在保存CAD: ${data.name}`});
    const cadQuery = query || this.getCadQuery();
    if (cadQuery) {
      const params: ObjectOf<any> = {...cadQuery, id: data.id, data: getHoutaiCad(data)};
      const resData2 = await this.http.getData<HoutaiCad>("shuju/api/getOrSetCad", params);
      resData = resData2 ? new CadData(resData2.json) : null;
    } else {
      delete data.info.imgId;
      delete data.info.imgUpdate;
      resData = await http.setCad({collection, cadData: data, force: true}, hideLineLength);
    }
    if (resData) {
      this.saveCadEnd$.next({data: resData});
      await this.openCad({
        data: resData,
        collection,
        beforeOpen: async (data2) => {
          const url = await getCadPreview(collection, data2);
          await http.setCadImg(data2.id, url, {silent: true});
          this.addCadImgToUpdate(data2.id);
        }
      });
    }
    this.saveCadLocked$.next(false);
    spinner.hide(loaderId);
    return resData;
  }

  generateLineTexts() {
    const data = this.cad.data;
    if (this.collection$.value === "CADmuban") {
      data.entities.line.forEach((e) => {
        e.children.mtext = e.children.mtext.filter((mt) => !mt.info.isLengthText && !mt.info.isGongshiText);
      });
      data.components.data.forEach((v) => {
        generateLineTexts2(v);
      });
    } else {
      generateLineTexts2(data);
    }
  }

  getCadPoints(map?: PointsMap | CadEntities, mid?: boolean) {
    if (!map) {
      return [];
    }
    if (map instanceof CadEntities) {
      const midPoints: PointsMap = [];
      if (mid) {
        map.forEach((e) => {
          if (e instanceof CadLineLike) {
            midPoints.push({point: e.middle, lines: [e], selected: false});
          }
        }, true);
      }
      map = generatePointsMap(map).concat(midPoints);
    }
    return map.map<CadPoints[number]>((v) => {
      const {x, y} = this.cad.getScreenPoint(v.point.x, v.point.y);
      return {x, y, active: v.selected, lines: v.lines.map((vv) => vv.id)};
    });
  }

  setCadPoints(map: PointsMap | CadEntities = [], opts: {include?: CadPoints; exclude?: {x: number; y: number}[]; mid?: boolean} = {}) {
    const {include, exclude, mid} = opts;
    const points = this.getCadPoints(map, mid);
    this.cadPoints.set(differenceWith(points, exclude || [], (a, b) => a.x === b.x && a.y === b.y).concat(include || []));
  }

  addCadPoint(point: CadPoints[0], i?: number) {
    const points = this.cadPoints();
    if (typeof i !== "number") {
      i = points.length;
    }
    points.splice(i, 0, point);
    this.cadPoints.set([...points]);
  }
  removeCadPoint(i: number) {
    const points = this.cadPoints();
    i = clamp(i, 0, points.length - 1);
    points.splice(i, 1);
    this.cadPoints.set([...points]);
  }
  setCadPoint(i: number, point: Partial<CadPoints[number]> | ((point: CadPoints[number]) => Partial<CadPoints[number]>)) {
    const points = this.cadPoints();
    if (typeof point === "function") {
      point = point(points[i]);
    }
    points[i] = {...points[i], ...point};
    this.cadPoints.set([...points]);
  }

  validate(force?: boolean) {
    const noInfo = !this.config.getConfig("validateLines");
    const collection = this.collection$.value;
    const result = new ResultWithErrors(null);
    if (!isCadCollectionOfCad(collection)) {
      return result;
    }
    if (!force && noInfo) {
      return result;
    }
    result.learnFrom(validateCad(collection, this.cad.data, noInfo));
    this.cad.render();
    return result;
  }

  async updateCadTotalLength() {
    this.cadTotalLength.set(getCadTotalLength(this.cad.data));
    await this.refreshCadFenti();
  }

  async setLinesLength(lines: CadLine[], length: number) {
    setLinesLength(this.cad.data, lines, length);
    for (const line of lines) {
      line.lengthTextSize = getLineLengthTextSize(line);
    }
    await this.updateCadTotalLength();
  }

  async refreshCadFenti() {
    const skipCollections: CadCollection[] = ["CADmuban", "kailiaocadmuban"];
    if (skipCollections.includes(this.collection$.value)) {
      return;
    }
    return await refreshCadFenti(this.cad);
  }

  updateTitle() {
    document.title = this.cad.data.name || "无题";
  }

  focus(entities?: CadEntities | CadEntity[], opt?: {selected?: boolean | ((e: CadEntity) => boolean)}) {
    entities = entities ?? this.cad.data.getAllEntities();
    const selected = opt?.selected ?? false;
    entities.forEach((e) => {
      if (!e.visible) {
        return;
      }
      e.selectable = !(e instanceof CadHatch);
      e.selected = (typeof selected === "function" ? selected(e) : selected) ?? false;
      e.opacity = 1;
      e.highlighted = false;
    });
  }

  blur(entities?: CadEntities | CadEntity[], opt?: {selected?: boolean | ((e: CadEntity) => boolean | null)}) {
    entities = entities ?? this.cad.data.getAllEntities();
    const selected = opt?.selected ?? false;
    entities.forEach((e) => {
      if (!e.visible) {
        return;
      }
      e.selectable = false;
      e.selected = (typeof selected === "function" ? selected(e) : selected) ?? false;
      e.opacity = 0.3;
      e.highlighted = false;
    });
  }

  openCadInNewTab(id: string, collection: CadCollection, mokuaiName?: string) {
    if (!id) {
      return;
    }
    const params: Params = {collection, id};
    if (mokuaiName) {
      params.模块 = mokuaiName;
    }
    this.openInNewTab(["index"], {queryParams: params});
  }
  openMokuaiCadInNewTab(id: string, mokuaiName: string) {
    if (!id) {
      return;
    }
    const params = {模块: mokuaiName, id};
    this.openInNewTab(["index"], {queryParams: params});
  }
  getUrl(commands: any[], navigationExtras?: UrlCreationOptions) {
    if (!navigationExtras) {
      navigationExtras = {};
    }
    navigationExtras.queryParams = {...navigationExtras.queryParams, project: this.project};
    const url = this.router.createUrlTree(commands, navigationExtras).toString();
    if (environment.production) {
      return `${remoteHost}/static/ng-cad2${url}`;
    } else {
      return url;
    }
  }
  openInNewTab(commands: any[], navigationExtras?: UrlCreationOptions) {
    open(this.getUrl(commands, navigationExtras));
  }

  async updateZhewanLengths() {
    if (this._isZhewanLengthsFetched) {
      return;
    }
    const data = await this.http.getData<[number, number]>("ngcad/getZhewan");
    if (data) {
      this.zhewanLengths.set(data);
      this._isZhewanLengthsFetched = true;
    }
  }

  exportSelected() {
    const entities = this.cad.selected();
    const data = new CadData();
    data.entities = entities;
    return exportCadData(data).entities;
  }

  exportCadData() {
    return exportCadData(this.cad.data);
  }

  getItemSize(item: any, options?: FileSizeOptions) {
    if (isTypeOf(item, "undefined")) {
      return getFileSize(0, options);
    }
    if (isTypeOf(item, "string")) {
      return getFileSize(item.length, options);
    }
    const num = JSON.stringify(item).length;
    return getFileSize(num, options);
  }

  getCadSize(options?: FileSizeOptions) {
    return this.getItemSize(this.exportCadData(), options);
  }

  getSelectedSize(options?: FileSizeOptions) {
    return this.getItemSize(this.exportSelected(), options);
  }

  changeProject(project: string, clearParams?: boolean) {
    const {url} = this.route.snapshot;
    const opts: UrlCreationOptions = {};
    if (!project) {
      project = this.project;
    }
    this.changeProject$.next(project);
    setTimeout(() => {
      opts.queryParams = {project};
      if (!clearParams) {
        opts.queryParamsHandling = "merge";
      }
      const url2 = this.router.createUrlTree(url, opts);
      location.href = document.baseURI + url2.toString().slice(1);
    }, 0);
  }

  cadYaoqiusManager = new FetchManager([], async () => {
    const cadYaoqiusRaw = await this.http.queryMySql<Cad数据要求Raw>({table: "p_tongyongcadshujujiemianyaoqiu"});
    return cadYaoqiusRaw.map((v) => new Cad数据要求(v));
  });
  getCadYaoqiu(name: string | CadData) {
    if (name instanceof CadData) {
      name = name.name;
    }
    const yaoqius = this.cadYaoqiusManager.data();
    let result = yaoqius.find((v) => v.CAD分类 === name);
    if (isSbjbItemOptionalKeys3(name)) {
      const name2 = getSbjbCadName(name);
      if (!result && name2) {
        result = yaoqius.find((v) => v.CAD分类 === name2);
      }
    }
    if (!result) {
      result = yaoqius.find((v) => v.CAD分类 === "配件库");
      if (result) {
        result = cloneDeep(result);
        result.CAD分类 = name;
        yaoqius.push(result);
      }
    }
    return result;
  }
  async fetchAndGetCadYaoqiu(name: string | CadData, force?: boolean) {
    await this.cadYaoqiusManager.fetch(force);
    if (name instanceof CadData) {
      name = name.name;
    }
    let result = this.cadYaoqiusManager.data().find((v) => v.CAD分类 === name);
    if (!result) {
      result = this.cadYaoqiusManager.data().find((v) => v.CAD分类 === "配件库");
    }
    return result;
  }

  private _testModeWarningTimeKey = "testModeWarningIgnoreTime";
  setTestModeWarningIgnore(time: number) {
    local.save(this._testModeWarningTimeKey, new Date().getTime() + time);
  }

  async toggleEnvBeta(noConfirm = false) {
    if (!noConfirm) {
      let msg: string;
      if (!environment.production) {
        msg = `testMode: ${this.config.getConfig("testMode")}`;
      } else if (environment.beta) {
        msg = "是否切换到正式版？";
      } else {
        msg = "是否切换到测试版（功能可能不稳定）？";
      }
      if (!(await this.message.confirm(msg))) {
        return;
      }
    }
    this.config.setConfigWith("testMode", (v) => !v);
    this.setTestModeWarningIgnore(1000 * 60 * 60 * 24);
    this.config.userConfigSaved$.pipe(take(1)).subscribe(() => {
      this.checkEnvBeta();
    });
  }
  async checkEnvBeta() {
    if (!environment.production) {
      return;
    }
    const testMode = this.config.getConfig("testMode");
    const masterPath = "ng-cad2";
    const nextPath = "ng-cad2-beta";
    const masterReg = new RegExp(`/${masterPath}/`);
    const nextReg = new RegExp(`/${nextPath}/`);
    const url = location.href;
    if (masterReg.test(url) && testMode) {
      location.href = url.replace(masterReg, `/${nextPath}/`);
    } else if (nextReg.test(url)) {
      if (testMode) {
        const time = local.load(this._testModeWarningTimeKey) || 0;
        if (time < new Date().getTime()) {
          const button = await this.message.button({
            content: "当前为测试版，仅供测试使用！",
            disableCancel: true,
            buttons: ["走错了", "确定", "确定，24小时内不再提示"]
          });
          switch (button) {
            case "走错了":
              this.toggleEnvBeta(true);
              break;
            case "确定，24小时内不再提示":
              this.setTestModeWarningIgnore(1000 * 60 * 60 * 24);
              break;
          }
        }
      } else {
        location.href = url.replace(nextReg, `/${masterPath}/`);
      }
    }
  }

  inputOptionsManager = new FetchManager(null, async () => {
    const result = await this.http.getData<HoutaiInputOptions>("shuju/api/getInputNames", {}, {spinner: false});
    if (!result || !isTypeOf(result, "object")) {
      return null;
    }
    return result;
  });
  getGongshiOptions(gongshis: 算料公式[] | null | undefined) {
    const inputOptions = this.inputOptionsManager.data();
    const result = new Set<string>(inputOptions?.公式 || []);
    for (const gongshi of gongshis || []) {
      for (const key in gongshi.公式 || {}) {
        result.add(key);
      }
    }
    return Array.from(result);
  }

  getCadQuery() {
    const keyGroups = [["型号", "产品分类", "工艺做法", "门铰锁边铰边", "包边方向", "开启"], ["模块"]];
    const queryParams = this.route.snapshot.queryParams;
    for (const keys of keyGroups) {
      const result: ObjectOf<string> = {};
      for (const key of keys) {
        const value = queryParams[key];
        if (!value) {
          continue;
        }
        result[key] = value;
      }
      if (isEmpty(result)) {
        continue;
      }
      return result;
    }
    return null;
  }

  private _highlightDimensionsMap = new Map<string, CadEntity[]>();
  highlightDimensions(dimensions?: CadDimension[], highlightedPrev?: CadEntities) {
    const points: Point[] = [];
    const cad = this.cad;
    const dimensionsAll = cad.data.getAllEntities().dimension;
    const highlightedEntities = new CadEntities();
    if (!dimensions) {
      dimensions = dimensionsAll;
    }
    const map = this._highlightDimensionsMap;
    for (const dimension of dimensions) {
      if (!(dimension instanceof CadDimensionLinear)) {
        continue;
      }
      const esPrev = map.get(dimension.id);
      const esCurr: CadEntity[] = [];
      if (dimension.selected) {
        for (const info of [dimension.entity1, dimension.entity2]) {
          const line = cad.data.findEntity(info.id);
          if (!(line instanceof CadLineLike)) {
            continue;
          }
          line.highlighted = true;
          points.push(getDimensionLinePoint(line, info.location, dimension.axis));
          esCurr.push(line);
          highlightedEntities.add(line);
        }
        if (esPrev) {
          for (const e of esPrev) {
            if (!esCurr.includes(e) && !highlightedPrev?.find(e.id)) {
              e.highlighted = false;
            }
          }
        }
      } else if (esPrev) {
        for (const e of esPrev) {
          if (!highlightedPrev?.find(e.id)) {
            e.highlighted = false;
          }
        }
      }
      if (esCurr.length > 0) {
        map.set(dimension.id, esCurr);
      } else {
        map.delete(dimension.id);
      }
    }
    const dimensionIdsAll = dimensionsAll.map((v) => v.id);
    for (const [id, es] of map) {
      if (!dimensionIdsAll.includes(id)) {
        for (const e of es) {
          if (!highlightedPrev?.find(e.id)) {
            e.highlighted = false;
          }
        }
        map.delete(id);
      }
    }
    this.setCadPoints(points.map((v) => ({point: v, lines: [], selected: false})));
    return highlightedEntities;
  }

  highlightLineTexts(entities?: CadEntities, highlightedPrev?: CadEntities) {
    const cad = this.cad;
    if (!entities) {
      entities = cad.data.getAllEntities();
    }
    const highlightedEntities = new CadEntities();
    entities.forEach((e) => {
      if (!(e instanceof CadLineLike)) {
        return;
      }
      const selectedMtexts = e.children.mtext.filter((mtext) => {
        const {isLengthText, isGongshiText, isBianhuazhiText} = mtext.info;
        if (!isLengthText && !isGongshiText && !isBianhuazhiText) {
          return false;
        }
        return mtext.selected && mtext.visible;
      });
      if (selectedMtexts.length > 0) {
        e.highlighted = true;
        highlightedEntities.add(e);
      } else if (!highlightedPrev?.find(e.id)) {
        e.highlighted = false;
      }
    });
    return highlightedEntities;
  }

  private _isDrakModeKey = "isDrakMode";
  isDrakMode = signal(local.load(this._isDrakModeKey) ?? false);
  isDrakModeEff = effect(() => {
    const isDrakMode = this.isDrakMode();
    local.save(this._isDrakModeKey, isDrakMode);
    if (isDrakMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });
}
