import {computed, effect, inject, Injectable, signal, untracked} from "@angular/core";
import {Validators} from "@angular/forms";
import {filePathUrl, getCopyName} from "@app/app.common";
import {Cad数据要求, getCadQueryFields} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {MokuaiItem} from "../mokuai-item/mokuai-item.types";
import {getEmptyMokuaiItem} from "../mokuai-item/mokuai-item.utils";

@Injectable({
  providedIn: "root"
})
export class BjmkStatusService {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  imgPrefix = signal(filePathUrl);

  cadYaoqiu = signal<Cad数据要求 | undefined>(undefined);
  xinghaoCadYaoqiu = signal<Cad数据要求 | undefined>(undefined);
  async fetchCadYaoqius() {
    await this.status.fetchCad数据要求List();
    this.cadYaoqiu.set(this.status.getCad数据要求("配件库"));
    this.xinghaoCadYaoqiu.set(this.status.getCad数据要求("型号CAD"));
  }

  collection: CadCollection = "peijianCad";
  private _cads = signal<CadData[]>([]);
  private _cadsCache: CadData[] | null = null;
  cads = computed<CadData[]>(() => this._cads());
  async fetchCads(force?: boolean) {
    if (!force && this._cadsCache) {
      return this._cadsCache;
    }
    await this.fetchCadYaoqius();
    const yaoqiu = this.cadYaoqiu();
    const fields = getCadQueryFields(yaoqiu);
    const result = await this.http.getCad({collection: this.collection, fields});
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
  currMokuai = signal<MokuaiItem | null>(null);
  mokuaisAllEff = effect(
    () => {
      const mokuais = this.mokuais();
      const currMokuai = untracked(() => this.currMokuai());
      if (currMokuai) {
        const currMokuai2 = mokuais.find((v) => v.id === currMokuai.id) || null;
        this.currMokuai.set(currMokuai2);
      }
    },
    {allowSignalWrites: true}
  );
  async fetchMokuais(force?: boolean) {
    if (!force && this._mokuaisCache) {
      return this._mokuaisCache;
    }
    const focusMokuaiIds: number[] = [];
    const mokuai = this.currMokuai();
    if (mokuai) {
      focusMokuaiIds.push(mokuai.id);
    }
    const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais", {focusMokuaiIds})) || [];
    this._mokuais.set(mokuais);
    this._mokuaisCache = mokuais;
    return mokuais;
  }
  async fetchMokuai(id: number) {
    let mokuai2: MokuaiItem | null = null;
    const ids = [id];
    const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais", {mokuaiIds: ids, focusMokuaiIds: ids})) || [];
    mokuai2 = mokuais[0] || null;
    this.currMokuai.set(mokuai2);
    return mokuai2;
  }
  refreshMokuais(updateMokuais?: MokuaiItem[]) {
    const mokuais: MokuaiItem[] = [];
    for (const mokuai of this._mokuais()) {
      const mokuai2 = updateMokuais?.find((v) => v.id === mokuai.id);
      mokuais.push(mokuai2 || mokuai);
    }
    this._mokuais.set(mokuais);
  }

  async getMokuaiWithForm(mokuai?: Partial<MokuaiItem>, mokuaiOverride?: Partial<MokuaiItem>) {
    const data: Partial<MokuaiItem> = mokuai ? cloneDeep(mokuai) : getEmptyMokuaiItem();
    if (mokuaiOverride) {
      Object.assign(data, mokuaiOverride);
    }
    const allNames = new Set(this.mokuais().map((v) => v.name));
    if (mokuai?.name) {
      allNames.delete(mokuai.name);
    }
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "name"},
        validators: [Validators.required, (control) => (allNames.has(control.value) ? {名字不能重复: true} : null)]
      },
      {type: "string", label: "分类", model: {data, key: "type"}, validators: Validators.required},
      {type: "number", label: "排序", model: {data, key: "order"}},
      {
        type: "image",
        label: "效果图",
        value: data.xiaoguotu,
        prefix: this.imgPrefix(),
        onChange: async (val, info) => {
          if (val) {
            const uploadResult = await this.http.uploadImage(val);
            if (uploadResult) {
              data.xiaoguotu = uploadResult.url;
            } else {
              data.xiaoguotu = "";
            }
          } else {
            data.xiaoguotu = "";
          }
          info.value = data.xiaoguotu;
        }
      }
    ];
    const result = await this.message.form(form);
    if (result) {
      return data;
    }
    return null;
  }
  async addMukuai(mokuai?: Partial<MokuaiItem>) {
    let mokuai2: Partial<MokuaiItem> | undefined | null = mokuai;
    if (!mokuai2) {
      mokuai2 = await this.getMokuaiWithForm();
    }
    if (mokuai2) {
      delete mokuai2.id;
      let mokuai3 = await this.http.getData<MokuaiItem>("ngcad/addPeijianmokuai", {item: mokuai2});
      if (mokuai3) {
        await this.fetchMokuais(true);
      }
      mokuai3 = this._mokuais().find((v) => v.id === mokuai3?.id) || null;
      return mokuai3;
    }
    return null;
  }
  async editMokuai(mokuai: Partial<MokuaiItem>, noForm?: boolean) {
    const mokuai2 = noForm ? mokuai : await this.getMokuaiWithForm(mokuai);
    if (mokuai2) {
      let mokuai3 = await this.http.getData<MokuaiItem>("ngcad/editPeijianmokuai", {item: mokuai2});
      if (mokuai3) {
        await this.fetchMokuais(true);
      }
      mokuai3 = this._mokuais().find((v) => v.id === mokuai3?.id) || null;
      return mokuai3;
    }
    return null;
  }
  async copyMokuai(mokuai: MokuaiItem) {
    const names = this.mokuais().map((v) => v.name);
    const item2 = await this.getMokuaiWithForm(mokuai, {name: getCopyName(names, mokuai.name)});
    if (item2) {
      return await this.addMukuai(item2);
    }
    return null;
  }
  async removeMokuai(mokuai: MokuaiItem) {
    if (!(await this.message.confirm(`是否确定删除【${mokuai.name}】?`))) {
      return;
    }
    const result = await this.http.getData<boolean>("ngcad/removePeijianmokuai", {item: mokuai});
    if (result) {
      await this.fetchMokuais(true);
    }
    return result;
  }
}
