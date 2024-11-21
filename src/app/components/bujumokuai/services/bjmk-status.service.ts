import {effect, inject, Injectable, signal, untracked} from "@angular/core";
import {Validators} from "@angular/forms";
import {filePathUrl, getCopyName} from "@app/app.common";
import {getCadQueryFields} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {FetchManager} from "@app/utils/fetch-manager";
import {ItemsManager} from "@app/utils/items-manager";
import {OptionsAll} from "@components/lurushuju/services/lrsj-status.types";
import {VarNames} from "@components/var-names/var-names.types";
import {getVarNames} from "@components/var-names/var-names.utils";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {MsbjData} from "@views/msbj/msbj.types";
import {MsbjInfo} from "@views/msbj/msbj.utils";
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

  varNamesManager = new FetchManager<VarNames>([], async () => getVarNames(this.http, "门扇布局用"));

  cadYaoqiuManager = new FetchManager(null, async () => {
    return await this.status.fetchAndGetCadYaoqiu("配件库");
  });
  cadYaoqiu = this.cadYaoqiuManager.data;
  xinghaoCadYaoqiu = new FetchManager(null, async () => {
    return await this.status.fetchAndGetCadYaoqiu("型号CAD");
  }).data;

  collection: CadCollection = "peijianCad";
  cadsManager = new ItemsManager(
    async () => {
      const yaoqiu = await this.cadYaoqiuManager.fetch();
      const fields = getCadQueryFields(yaoqiu);
      const result = await this.http.getCad({collection: this.collection, fields});
      return result.cads;
    },
    (item1, item2) => item1.id === item2.id
  );

  mokuaisManager = new ItemsManager(
    async () => {
      const focusMokuaiIds: number[] = [];
      const mokuai = this.currMokuai();
      if (mokuai) {
        focusMokuaiIds.push(mokuai.id);
      }
      const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais", {focusMokuaiIds})) || [];
      return mokuais;
    },
    (item1, item2) => item1.id === item2.id
  );
  currMokuai = signal<MokuaiItem | null>(null);
  mokuaisAllEff = effect(
    () => {
      const noFetch = this.mokuaisManager.fetchManager.noFetch;
      this.mokuaisManager.fetchManager.noFetch = true;
      const mokuais = this.mokuaisManager.items();
      this.mokuaisManager.fetchManager.noFetch = noFetch;
      const currMokuai = untracked(() => this.currMokuai());
      if (currMokuai) {
        const currMokuai2 = mokuais.find((v) => v.id === currMokuai.id) || null;
        this.currMokuai.set(currMokuai2);
      }
    },
    {allowSignalWrites: true}
  );
  async fetchMokuai(id: number) {
    let mokuai2: MokuaiItem | null = null;
    const ids = [id];
    const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais", {mokuaiIds: ids, focusMokuaiIds: ids})) || [];
    mokuai2 = mokuais.at(0) || null;
    return mokuai2;
  }

  async getMokuaiWithForm(mokuai?: Partial<MokuaiItem>, mokuaiOverride?: Partial<MokuaiItem>) {
    const data: Partial<MokuaiItem> = mokuai ? cloneDeep(mokuai) : getEmptyMokuaiItem();
    if (mokuaiOverride) {
      Object.assign(data, mokuaiOverride);
    }
    const allNames = new Set(this.mokuaisManager.items().map((v) => v.name));
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
  async addMukuai(mokuai?: Partial<MokuaiItem>, mokuaiOverride?: Partial<MokuaiItem>) {
    let mokuai2: Partial<MokuaiItem> | undefined | null = mokuai;
    if (!mokuai2) {
      mokuai2 = await this.getMokuaiWithForm(undefined, mokuaiOverride);
    }
    if (mokuai2) {
      delete mokuai2.id;
      let mokuai3 = await this.http.getData<MokuaiItem>("ngcad/addPeijianmokuai", {item: mokuai2});
      if (mokuai3) {
        this.mokuaisManager.refresh({add: [mokuai3]});
      }
      mokuai3 = this.mokuaisManager.items().find((v) => v.id === mokuai3?.id) || null;
      return mokuai3;
    }
    return null;
  }
  async editMokuai(mokuai: Partial<MokuaiItem>, noForm?: boolean) {
    const mokuai2 = noForm ? mokuai : await this.getMokuaiWithForm(mokuai);
    if (mokuai2) {
      let mokuai3 = await this.http.getData<MokuaiItem>("ngcad/editPeijianmokuai", {item: mokuai2});
      if (mokuai3) {
        this.mokuaisManager.refresh({update: [mokuai3]});
      }
      mokuai3 = this.mokuaisManager.items().find((v) => v.id === mokuai3?.id) || null;
      return mokuai3;
    }
    return null;
  }
  async copyMokuai(mokuai: MokuaiItem) {
    const names = this.mokuaisManager.items().map((v) => v.name);
    const mokuai2 = await this.getMokuaiWithForm(mokuai, {name: getCopyName(names, mokuai.name)});
    if (mokuai2) {
      if (mokuai2.cads) {
        const cadIdMap = new Map<string, string>();
        mokuai2.cads = mokuai2.cads.map((v) => {
          const idPrev = v._id;
          const cad = new CadData(v.json).clone(true);
          cadIdMap.set(idPrev, cad.id);
          delete cad.info.imgId;
          return getHoutaiCad(cad);
        });
        for (const item of Object.values(mokuai2.morenbancai || {})) {
          item.CAD = item.CAD.map((v) => cadIdMap.get(v) || v);
        }
      }
      const mokuai3 = await this.http.getData<MokuaiItem>("ngcad/copyPeijianmokuai", {item: mokuai2});
      if (mokuai3) {
        this.mokuaisManager.refresh({add: [mokuai3]});
      }
      return this.mokuaisManager.items().find((v) => v.id === mokuai3?.id) || null;
    }
    return null;
  }
  async removeMokuai(mokuai: MokuaiItem) {
    if (!(await this.message.confirm(`是否确定删除【${mokuai.name}】?`))) {
      return;
    }
    const result = await this.http.getData<boolean>("ngcad/removePeijianmokuai", {item: mokuai});
    if (result) {
      this.mokuaisManager.refresh({remove: [mokuai]});
    }
    return result;
  }

  msbjsManager = new ItemsManager(
    async () => {
      const result = await this.http.queryMySql<MsbjData>({table: "p_menshanbuju"});
      const msbjs = result.map((v) => new MsbjInfo(v));
      return msbjs;
    },
    (item1, item2) => item1.vid === item2.vid
  );

  xinghaoOptionsManager = new FetchManager({}, async () => (await this.http.getData<OptionsAll>("shuju/api/getXinghaoOptions")) || {});
  mokuaiOptionsManager = new FetchManager({}, async () => (await this.http.getData<OptionsAll>("shuju/api/getMokuaiOptions")) || {});

  async showXhmrmsbjsUsingMokuai(mokuaiId: number) {
    const data = await this.http.getData<{url: string}>("shuju/api/showXhmrmsbjsUsingMokuai", {mokuaiId});
    const url = data?.url;
    if (url) {
      open(url);
    }
  }
}
