import {inject, Injectable, signal} from "@angular/core";
import {Validators} from "@angular/forms";
import {filePathUrl} from "@app/app.common";
import {getCadQueryFields} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {FetchManager} from "@app/utils/fetch-manager";
import {getCopyName, getDateTimeString} from "@app/utils/get-value";
import {ItemsManager} from "@app/utils/items-manager";
import {OptionsAll} from "@components/lurushuju/services/lrsj-status.types";
import {VarNames} from "@components/var-names/var-names.types";
import {getVarNames} from "@components/var-names/var-names.utils";
import {CadData} from "@lucilor/cad-viewer";
import {DataListComponent} from "@modules/data-list/components/data-list/data-list.component";
import {DataListNavNode, getNodePathSelect, moveDataListNavNode} from "@modules/data-list/components/data-list/data-list.utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {MsbjData} from "@views/msbj/msbj.types";
import {MsbjInfo} from "@views/msbj/msbj.utils";
import {cloneDeep, difference} from "lodash";
import {v4} from "uuid";
import {MokuaiItem} from "../mokuai-item/mokuai-item.types";
import {mokuaiSubmitAfter, mokuaiSubmitBefore} from "../mokuai-item/mokuai-item.utils";

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
      const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais", {compact: true})) || [];
      return mokuais;
    },
    (item1, item2) => item1.id === item2.id
  );
  async fetchMokuais(ids: number[]) {
    const mokuais = (await this.http.getData<MokuaiItem[]>("ngcad/getPeijianmokuais", {mokuaiIds: ids})) || [];
    return mokuais;
  }
  async fetchMokuai(id: number) {
    return (await this.fetchMokuais([id])).at(0) || null;
  }
  async checkMokuaisExist(ids: number[]) {
    const mokuais = await this.fetchMokuais(ids);
    const ids2 = mokuais.map((v) => v.id);
    const missingMokuais = difference(ids, ids2);
    return {mokuais, missingMokuais};
  }

  async getMokuaiWithForm(mokuai?: Partial<MokuaiItem>, opts?: {mokuaiOverride?: Partial<MokuaiItem>; dataList?: DataListComponent}) {
    const data: Partial<MokuaiItem> = {
      id: mokuai?.id,
      name: mokuai?.name,
      type: mokuai?.type,
      order: mokuai?.order,
      xiaoguotu: mokuai?.xiaoguotu
    };
    const {mokuaiOverride, dataList} = opts || {};
    if (mokuaiOverride) {
      Object.assign(data, mokuaiOverride);
    }
    const allNames = new Set(this.mokuaisManager.items().map((v) => v.name));
    if (mokuai?.name) {
      allNames.delete(mokuai.name);
    }
    const getter = new InputInfoWithDataGetter(data, {clearable: true});
    let nodePathSelect: ReturnType<typeof getNodePathSelect> | null = null;
    if (dataList) {
      const node = dataList.activeNavNode();
      if (node) {
        nodePathSelect = getNodePathSelect(dataList.navNodes(), node);
      }
    }
    const form: InputInfo[] = [
      getter.string("name", {
        label: "名字",
        validators: [Validators.required, (control) => (allNames.has(control.value) ? {名字不能重复: true} : null)]
      }),
      ...(nodePathSelect ? [nodePathSelect.inputInfo] : []),
      getter.string("type", {label: "分类", validators: Validators.required}),
      getter.number("order", {label: "排序"}),
      getter.image("xiaoguotu", this.http, {label: "效果图", prefix: this.imgPrefix()})
    ];
    const result = await this.message.form(form);
    if (result) {
      if (dataList && nodePathSelect) {
        const nodes = dataList.navNodes();
        let node = dataList.activeNavNode();
        if (node) {
          const {from, to} = nodePathSelect.data;
          if (to && data.type) {
            if (!to.children) {
              to.children = [];
            }
            if (!to.children.some((v) => !v.hasChild() && v.name === data.type)) {
              node = new DataListNavNode({id: v4(), name: data.type});
              to.children.push(node);
            }
          }
          moveDataListNavNode(nodes, node, from, to);
          await dataList.setNavNodes();
          dataList.activeNavNode.set(node);
        }
      }
      return data;
    }
    return null;
  }
  async addMukuai(mokuai?: Partial<MokuaiItem>, opts?: {mokuaiOverride?: Partial<MokuaiItem>; dataList?: DataListComponent}) {
    let mokuai2: Partial<MokuaiItem> | undefined | null = cloneDeep(mokuai);
    if (!mokuai2) {
      mokuai2 = await this.getMokuaiWithForm(undefined, opts);
    }
    if (mokuai2) {
      mokuaiSubmitBefore(mokuai2);
      delete mokuai2.id;
      let mokuai3 = await this.http.getData<MokuaiItem>("ngcad/addPeijianmokuai", {item: mokuai2});
      if (mokuai3) {
        mokuaiSubmitAfter(mokuai3);
        this.mokuaisManager.refresh({add: [mokuai3]});
      }
      mokuai3 = this.mokuaisManager.items().find((v) => v.id === mokuai3?.id) || null;
      return mokuai3;
    }
    return null;
  }
  async editMokuai(mokuai: Partial<MokuaiItem>, opts?: {noForm?: boolean; dataList?: DataListComponent; isCompact?: boolean}) {
    const {noForm, dataList, isCompact} = opts || {};
    if (!noForm) {
      const mokuai2 = await this.getMokuaiWithForm(mokuai, {dataList});
      if (mokuai2) {
        if (isCompact) {
          mokuai = mokuai2;
        } else {
          Object.assign(mokuai, mokuai2);
        }
      } else {
        return null;
      }
    }
    mokuaiSubmitBefore(mokuai);
    let mokuai2 = await this.http.getData<MokuaiItem>("ngcad/editPeijianmokuai", {item: mokuai});
    if (mokuai2) {
      mokuaiSubmitAfter(mokuai2);
      this.mokuaisManager.refresh({update: [mokuai2]});
    }
    mokuai2 = this.mokuaisManager.items().find((v) => v.id === mokuai2?.id) || null;
    return mokuai2;
  }
  private _copyMokuaiBefore(mokuai: Partial<MokuaiItem>) {
    if (mokuai.cads) {
      const cadIdMap = new Map<string, string>();
      mokuai.cads = mokuai.cads.map((v) => {
        const idPrev = v._id;
        const cad = new CadData(v.json).clone(true);
        cadIdMap.set(idPrev, cad.id);
        delete cad.info.imgId;
        return getHoutaiCad(cad);
      });
      for (const item of Object.values(mokuai.morenbancai || {})) {
        item.CAD = item.CAD.map((v) => cadIdMap.get(v) || v);
      }
    }
  }
  async copyMokuai(mokuai: MokuaiItem) {
    const names = this.mokuaisManager.items().map((v) => v.name);
    const mokuai2 = await this.fetchMokuai(mokuai.id);
    if (!mokuai2) {
      return;
    }
    const mokuai2WithForm = await this.getMokuaiWithForm(mokuai2, {mokuaiOverride: {name: getCopyName(names, mokuai.name)}});
    if (mokuai2WithForm) {
      Object.assign(mokuai2, mokuai2WithForm);
    }
    this._copyMokuaiBefore(mokuai2);
    const mokuai3 = await this.http.getData<MokuaiItem>("ngcad/copyPeijianmokuai", {item: mokuai2});
    if (mokuai3) {
      this.mokuaisManager.refresh({add: [mokuai3]});
    }
    return this.mokuaisManager.items().find((v) => v.id === mokuai3?.id) || null;
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
    (item1, item2) => item1.id === item2.id
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

  async exportMokuais(ids: number[]) {
    const itmes = await this.http.getData<MokuaiItem[]>("ngcad/exportPeijianmokuais", {ids});
    if (!itmes) {
      return;
    }
    await this.message.exportData(itmes, `配件模块_${getDateTimeString()}`);
  }
  async importMokuais() {
    this.message.importData<MokuaiItem[]>(true, async (items) => {
      const names = this.mokuaisManager.items().map((v) => v.name);
      for (const item of items) {
        this._copyMokuaiBefore(item);
        item.name = getCopyName(names, item.name);
        names.push(item.name);
      }
      const items2 = await this.http.getData<MokuaiItem[]>("ngcad/importPeijianmokuais", {items});
      if (items2) {
        this.mokuaisManager.refresh({add: items2});
      }
    });
  }
}
