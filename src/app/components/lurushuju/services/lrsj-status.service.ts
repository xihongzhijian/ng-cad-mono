import {computed, effect, inject, Injectable, signal, untracked} from "@angular/core";
import {session, splitOptions} from "@app/app.common";
import {SuanliaogongshiInfo} from "@app/modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {BancaiListData} from "@app/modules/http/services/cad-data.service.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {AppStatusService} from "@app/services/app-status.service";
import {MrbcjfzHuajian} from "@app/views/mrbcjfz/mrbcjfz.types";
import {filterHuajian} from "@app/views/mrbcjfz/mrbcjfz.utils";
import {ObjectOf, queryString} from "@lucilor/utils";
import {cloneDeep, isEqual} from "lodash";
import {lastValueFrom, Subject, take} from "rxjs";
import {LrsjPieceInfos} from "../lrsj-pieces/lrsj-pieces.types";
import {defaultFenleis} from "../lrsj-pieces/lrsj-pieces.utils";
import {SuanliaoDataBtnName} from "../lrsj-pieces/lrsj-suanliao-data/lrsj-suanliao-data.types";
import {getXinghao, updateXinghaoFenleis, xiaoguotuKeys, Xinghao, XinghaoRaw, 工艺做法, 算料数据, 算料数据2} from "../xinghao-data";
import {
  MenshanOption,
  OptionsAll,
  OptionsAll2,
  SuanliaoDataInfo,
  XinghaoData,
  XinghaoDataList,
  XinghaoGongyi,
  XinghaoMenchuang
} from "./lrsj-status.types";
import {getXinghaoGongyi, getXinghaoMenchuang} from "./lrsj-status.utils";

@Injectable({
  providedIn: "root"
})
export class LrsjStatusService {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  xinghaoMenchuangs = new XinghaoDataList<XinghaoMenchuang>();
  private _xinghao = signal<Xinghao | null>(null);
  xinghao = computed(() => this._xinghao());
  suanliaoDataInfo = signal<SuanliaoDataInfo | null>(null);
  editMode = signal(false);
  varNames = signal<NonNullable<SuanliaogongshiInfo["varNames"]>>({});
  xinghaozhuanyongCadCount = signal(0);
  triggerSuanliaoDataBtn = signal<{name: SuanliaoDataBtnName} | null>(null);

  private _xinghaoFilterStrKey = "lurushujuXinghaoFilterStr";
  xinghaoFilterStr = signal(session.load<string>(this._xinghaoFilterStrKey) || "");
  activeXinghaoGingyi = signal<{i: number; j: number; refresh?: boolean} | null>(null);
  focusFenleiZuofa = signal<{i: number; j?: number} | null>(null);

  isKailiao = computed(() => {
    const projectKey = "新版本做数据可以做激光开料";
    const projectKailiao = this.status.projectConfig.getBoolean(projectKey);
    if (!projectKailiao) {
      return false;
    }
    const xinghao = this.xinghao();
    if (typeof xinghao?.是否需要激光开料 === "boolean") {
      return xinghao.是否需要激光开料;
    } else {
      return projectKailiao;
    }
  });

  constructor() {
    effect(() => {
      const str = this.xinghaoFilterStr();
      session.save(this._xinghaoFilterStrKey, str);
      untracked(() => this.filterXinghaos());
    });
    effect(() => this.refreshHuajians(), {allowSignalWrites: true});
  }

  private _dataFetched: ObjectOf<any> = {};
  private async _getDataIfNotFetched<T>(key: string, api: string, force?: boolean) {
    if (force || !this._dataFetched[key]) {
      this._dataFetched[key] = await this.http.getData<T>("shuju/api/" + api);
    }
    return this._dataFetched[key] as T | null;
  }
  deleteDataCache = (key: string) => {
    delete this._dataFetched[key];
  };
  getXinghaoOptions = async (force?: boolean) => {
    return (await this._getDataIfNotFetched<OptionsAll>("xinghaoOptionsAll", "getXinghaoOption", force)) || {};
  };
  getZuofaOptions = async (force?: boolean) => {
    return (await this._getDataIfNotFetched<OptionsAll>("gongyiOptionsAll", "getGongyizuofaOption", force)) || {};
  };
  getMenjiaoOptions = async (force?: boolean) => {
    return (await this._getDataIfNotFetched<OptionsAll2>("menjiaoOptionsAll", "getMenjiaoOptions", force)) || {};
  };

  pieceInfos: LrsjPieceInfos = {
    xinghaos: computed(() => ({show: !this.xinghao()})),
    zuofas: computed(() => ({show: !!this.xinghao() && !this.suanliaoDataInfo()})),
    suanliaoData: computed(() => ({show: !!this.suanliaoDataInfo()}))
  };
  async gotoXinghaos() {
    if (!(await this.beforeSuanliaoDataLeave())) {
      return;
    }
    this.updateXinghao(null);
    this.suanliaoDataInfo.set(null);
  }
  async gotoZuofas(xinghao: Xinghao | null) {
    if (!(await this.beforeSuanliaoDataLeave())) {
      return;
    }
    this.updateXinghao(xinghao);
    this.suanliaoDataInfo.set(null);
  }
  async gotoSuanliaoData(fenleiName: string, zuofaName: string, suanliaoData: 算料数据, xinghao?: Xinghao) {
    if (!(await this.beforeSuanliaoDataLeave())) {
      return;
    }
    if (xinghao) {
      this.gotoZuofas(xinghao);
    }
    suanliaoData.产品分类 = fenleiName;
    this.suanliaoDataInfo.set({fenleiName, zuofaName, suanliaoData});
  }
  suanliaoDataSubmit = new Subject<void>();
  async beforeSuanliaoDataLeave() {
    const info = this.pieceInfos.suanliaoData();
    if (!info.show) {
      return true;
    }
    const btn = await this.message.button({content: "是否保存数据？", buttons: ["保存", "不保存"]});
    if (btn === "保存") {
      this.triggerSuanliaoDataBtn.set({name: "保存"});
      await lastValueFrom(this.suanliaoDataSubmit.pipe(take(1)));
      return true;
    } else if (btn === "不保存") {
      return true;
    } else {
      return false;
    }
  }

  async getXinghao(name: string) {
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/getXinghao", {名字: name});
    return getXinghao(xinghaoRaw);
  }
  async setXinghao(data: Partial<Xinghao>, silent?: boolean, name = this.xinghao()?.名字) {
    if (!name) {
      return;
    }
    return await this.http.post("shuju/api/setXinghao", {名字: name, data, silent}, {spinner: false});
  }
  async refreshXinghao(fetch: boolean) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return xinghao;
    }
    if (fetch) {
      const xinghao2 = await this.getXinghao(xinghao.名字);
      this._xinghao.set(xinghao2);
      return xinghao2;
    } else {
      this._xinghao.set({...xinghao});
      return xinghao;
    }
  }
  async updateXinghao(xinghao: Xinghao | null) {
    if (xinghao) {
      const fenleisBefore = cloneDeep(xinghao.产品分类);
      const xinghaoOptionsAll = await this.getXinghaoOptions();
      const menjiaoOptionsAll = await this.getMenjiaoOptions();
      const allFenleis = xinghaoOptionsAll.产品分类.map((v) => v.name);
      const 选项要求 = menjiaoOptionsAll.选项要求?.options || [];
      updateXinghaoFenleis(xinghao, allFenleis, defaultFenleis, 选项要求);
      this._xinghao.set(xinghao);
      const fenleisAfter = xinghao.产品分类;
      if (!isEqual(fenleisBefore, fenleisAfter)) {
        await this.setXinghao({产品分类: fenleisAfter}, true);
      }
    } else {
      this._xinghao.set(xinghao);
    }
  }
  async updateXinghaoFenlei(产品分类: Xinghao["产品分类"] = {}) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    xinghao.产品分类 = 产品分类;
    this.updateXinghao({...xinghao});
  }

  async submitZuofa(fenleiName: string, zuofa: 工艺做法 | string, fields: (keyof 工艺做法)[]) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const data: Partial<工艺做法> = {};
    const 型号 = xinghao.名字;
    if (typeof zuofa === "string") {
      const zuofa2 = xinghao.产品分类[fenleiName].find((v) => v.名字 === zuofa);
      if (!zuofa2) {
        return;
      }
      zuofa = zuofa2;
    } else {
      const zuofaName = zuofa.名字;
      const zuofas = xinghao.产品分类[fenleiName];
      const i = zuofas.findIndex((v) => v.名字 === zuofaName);
      if (i >= 0) {
        zuofas[i] = zuofa;
      } else {
        zuofas.push(zuofa);
      }
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      return;
    }
    const {名字} = zuofa;
    for (const field of fields) {
      data[field] = zuofa[field] as any;
    }
    const response = await this.http.post(
      "shuju/api/editGongyi",
      {型号, 产品分类: fenleiName, updateDatas: {[名字]: data}},
      {spinner: false}
    );
    if (response?.code === 0) {
      Object.assign(zuofa, data);
      this.updateXinghao(xinghao);
    }
  }

  async getXinghaos() {
    const xinghaos = await this.http.getData<XinghaoData[]>("shuju/api/getXinghaos");
    const fields = ["vid", "mingzi"];
    const menchuangs = await this.http.queryMySql<XinghaoMenchuang>({table: "p_menchuang", fields});
    const gongyis = await this.http.queryMySql<XinghaoGongyi>({table: "p_gongyi", fields: [...fields, "menchuang"]});
    const iPrev = this.xinghaoMenchuangs.index();
    const jPrev = this.xinghaoMenchuangs.item()?.gongyis?.index();
    this.xinghaoMenchuangs.items.set([]);
    for (const menchuang of menchuangs) {
      const xinghaoMenchuang = getXinghaoMenchuang(menchuang);
      xinghaoMenchuang.gongyis = new XinghaoDataList();
      this.xinghaoMenchuangs.items.update((v) => [...v, xinghaoMenchuang]);
      for (const gongyi of gongyis) {
        const menchuangIds = splitOptions(String(gongyi.menchuang)).map(Number);
        if (!menchuangIds.includes(menchuang.vid)) {
          continue;
        }
        const xinghaoGongyi = getXinghaoGongyi(gongyi);
        xinghaoMenchuang.gongyis.items.update((v) => [...v, xinghaoGongyi]);
      }
    }
    if (xinghaos) {
      for (const xinghao of xinghaos) {
        const {menchuang, gongyi} = xinghao;
        const menchuangs = splitOptions(menchuang);
        const gongyis = splitOptions(gongyi);
        const menchuangItems = this.xinghaoMenchuangs.items().filter((v) => menchuangs.includes(v.mingzi));
        for (const menchuangItem of menchuangItems) {
          const gongyiItems = menchuangItem.gongyis?.items().filter((v) => gongyis.includes(v.mingzi));
          for (const gongyiItem of gongyiItems || []) {
            if (!gongyiItem.xinghaos) {
              gongyiItem.xinghaos = new XinghaoDataList();
            }
            gongyiItem.xinghaos.items.update((v) => [...v, xinghao]);
          }
        }
      }
      if (typeof iPrev === "number") {
        this.xinghaoMenchuangs.index.set(iPrev);
        const menchuangItem = this.xinghaoMenchuangs.items()[iPrev];
        if (menchuangItem?.gongyis && typeof jPrev === "number") {
          menchuangItem.gongyis.index.set(jPrev);
        }
      }
      this.filterXinghaos();
    }
  }
  filterXinghaos() {
    const str = this.xinghaoFilterStr();
    const menchuangs = this.xinghaoMenchuangs;
    if (menchuangs.items().length < 1) {
      return;
    }
    let menchuangCount = 0;
    const foundGongyis: [number, number][] = [];
    for (const [i, menchuang] of menchuangs.items().entries()) {
      if (!menchuang.gongyis) {
        menchuang.gongyis = new XinghaoDataList<XinghaoGongyi>();
      }
      const gongyis = menchuang.gongyis;
      let gongyiCount = 0;
      for (const [j, gongyi] of gongyis.items().entries()) {
        if (!gongyi.xinghaos) {
          gongyi.xinghaos = new XinghaoDataList();
        }
        const xinghaos = gongyi.xinghaos;
        let xinghaoCount = 0;
        for (const xinghao of xinghaos.items()) {
          xinghao.hidden = !queryString(str, xinghao.mingzi);
          if (!xinghao.hidden) {
            xinghaoCount++;
            gongyiCount++;
            menchuangCount++;
          }
        }
        xinghaos.count.set(xinghaoCount);
        if (xinghaoCount) {
          foundGongyis.push([i, j]);
        }
      }
      gongyis.count.set(gongyiCount);
    }
    menchuangs.count.set(menchuangCount);
    if (str) {
      const foundCount = foundGongyis.length;
      if (foundCount < 1) {
        this.message.snack("搜索不到数据");
      } else if (foundCount === 1) {
        const [i, j] = foundGongyis[0];
        this.activeXinghaoGingyi.set({i, j, refresh: true});
      }
    } else {
      const iPrev = this.xinghaoMenchuangs.index();
      const jPrev = this.xinghaoMenchuangs.item()?.gongyis?.index();
      this.activeXinghaoGingyi.set({i: iPrev || 0, j: jPrev || 0, refresh: true});
    }
  }

  menshanOptions = signal<MenshanOption[]>([]);
  private _isMenshanOptionsFetched = signal(false);
  async refreshMenshanOptions(force?: boolean) {
    if (!force && this._isMenshanOptionsFetched()) {
      return;
    }
    const menshans =
      (
        await this.http.getOptions<MenshanOption>({
          name: "p_menshan",
          fields: ["zuchenghuajian"]
        })
      )?.data || [];
    this.menshanOptions.set(menshans);
    this._isMenshanOptionsFetched.set(true);
  }

  bancaiList = signal<BancaiListData | null>(null);
  private _isBancaiListFetched = signal(false);
  async refreshBancaiList(force?: boolean) {
    if (!force && this._isBancaiListFetched()) {
      return;
    }
    const bancaiList = await this.http.getBancaiList(6);
    this.bancaiList.set(bancaiList);
    this._isBancaiListFetched.set(true);
  }

  private _huajiansCache: ObjectOf<MrbcjfzHuajian[]> = {};
  huajians = signal<MrbcjfzHuajian[]>([]);
  getHuajianIds(menshanOptions: MenshanOption[]) {
    const huajianIds = new Set<number>();
    for (const optionRaw of menshanOptions) {
      if (typeof optionRaw.zuchenghuajian === "string") {
        for (const v of optionRaw.zuchenghuajian.split("*")) {
          if (v) {
            huajianIds.add(Number(v));
          }
        }
      }
    }
    return huajianIds;
  }
  async refreshHuajians() {
    const huajianIds = this.getHuajianIds(this.menshanOptions());
    if (huajianIds.size > 0) {
      const ids = Array.from(huajianIds);
      const cacheKey = ids.join(",");
      if (this._huajiansCache[cacheKey]) {
        this.huajians.set(this._huajiansCache[cacheKey]);
      } else {
        const huajians = await this.http.queryMySql<MrbcjfzHuajian>(
          {
            table: "p_huajian",
            fields: ["vid", "mingzi", "xiaotu", "shihuajian"],
            filter: {where_in: {vid: ids}}
          },
          {spinner: false}
        );
        this.huajians.set(huajians);
        this._huajiansCache[cacheKey] = huajians;
      }
    } else {
      this.huajians.set([]);
    }
  }
  filterHuajians(data: 算料数据2) {
    const xiaoguotuValues = new Set<string>();
    for (const key of xiaoguotuKeys) {
      const value = data[key];
      if (typeof value === "string" && value) {
        xiaoguotuValues.add(value);
      }
    }
    const menshanOptions = this.menshanOptions().filter((v) => xiaoguotuValues.has(v.name));
    const huajianIds = this.getHuajianIds(menshanOptions);
    return this.huajians().filter((v) => huajianIds.has(v.vid) && filterHuajian(v));
  }
}
