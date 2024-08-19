import {computed, inject, Injectable, signal} from "@angular/core";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {AppStatusService} from "@app/services/app-status.service";
import {CadData} from "@lucilor/cad-viewer";
import {MokuaiItem} from "../mokuai-item/mokuai-item.types";

@Injectable({
  providedIn: "root"
})
export class BjmkStatusService {
  private http = inject(CadDataService);
  private status = inject(AppStatusService);

  cadYaoqiu = signal<Cad数据要求 | undefined>(undefined);
  async fetchCadYaoqiu() {
    await this.status.fetchCad数据要求List();
    const yaoqiu = this.status.getCad数据要求("配件库");
    this.cadYaoqiu.set(yaoqiu);
    return yaoqiu;
  }

  collection: CadCollection = "peijianku";
  private _cads = signal<CadData[]>([]);
  private _cadsCache: CadData[] | null = null;
  cads = computed<CadData[]>(() => this._cads());
  async fetchCads(force?: boolean) {
    if (!force && this._cadsCache) {
      return this._cadsCache;
    }
    const yaoqiu = await this.fetchCadYaoqiu();
    const fields = new Set<string>(["json.id", "json.name", "json.type"]);
    if (yaoqiu) {
      for (const item of yaoqiu.CAD弹窗修改属性) {
        if (item.cadKey) {
          fields.add(`json.${item.cadKey}`);
        }
      }
    }
    const result = await this.http.getCad({collection: this.collection, fields: Array.from(fields)});
    const cads = result.cads;
    this._cads.set(cads);
    this._cadsCache = cads;
    return cads;
  }
  refreshCads() {
    this._cads.update((v) => [...v]);
  }

  private _mokuais = signal<MokuaiItem[]>([]);
  private _mokuaisCache: MokuaiItem[] | null = null;
  mokuais = computed<MokuaiItem[]>(() => this._mokuais());
  async fetchMokuais(force?: boolean) {
    if (!force && this._mokuaisCache) {
      return this._mokuaisCache;
    }
    const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais")) || [];
    this._mokuais.set(mokuais);
    this._mokuaisCache = mokuais;
    return mokuais;
  }
}
