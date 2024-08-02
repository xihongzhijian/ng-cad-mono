import {computed, inject, Injectable, signal} from "@angular/core";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {AppStatusService} from "@app/services/app-status.service";
import {ObjectOf} from "@lucilor/utils";
import {cloneDeep, isEqual} from "lodash";
import {defaultFenleis} from "../lrsj-pieces/lrsj-pieces.utils";
import {XinghaoDataList, XinghaoMenchuang} from "../lrsj-pieces/lrsj-xinghaos/lrsj-xinghaos.types";
import {getXinghao, updateXinghaoFenleis, Xinghao, XinghaoRaw, 工艺做法} from "../xinghao-data";
import {OptionsAll, OptionsAll2} from "./lrsj-status.types";

@Injectable({
  providedIn: "root"
})
export class LrsjStatusService {
  private http = inject(CadDataService);
  private status = inject(AppStatusService);

  xinghaoMenchuangs = new XinghaoDataList<XinghaoMenchuang>();
  private _xinghao = signal<Xinghao | null>(null);
  xinghao = computed(() => this._xinghao());
  editMode = signal(false);

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

  constructor() {}

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
  async refreshXinghao() {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const xinghao2 = await this.getXinghao(xinghao.名字);
    this._xinghao.set(xinghao2);
    return xinghao2;
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

  async submitZuofa(fenlei: string, zuofa: 工艺做法 | string, fields: (keyof 工艺做法)[]) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const data: Partial<工艺做法> = {};
    const 型号 = xinghao.名字;
    if (typeof zuofa === "string") {
      const zuofa2 = xinghao.产品分类[fenlei].find((v) => v.名字 === zuofa);
      if (!zuofa2) {
        return;
      }
      zuofa = zuofa2;
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      return;
    }
    const {名字} = zuofa;
    for (const field of fields) {
      data[field] = zuofa[field] as any;
    }
    const response = await this.http.post("shuju/api/editGongyi", {型号, 产品分类: fenlei, updateDatas: {[名字]: data}}, {spinner: false});
    if (response?.code === 0) {
      Object.assign(zuofa, data);
      this.updateXinghao(xinghao);
    }
  }
}
