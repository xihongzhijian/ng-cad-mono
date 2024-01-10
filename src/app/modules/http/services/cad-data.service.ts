import {Injectable, Injector} from "@angular/core";
import {DomSanitizer} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgCadEmpty} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {CadData, CadMtextInfo} from "@lucilor/cad-viewer";
import {dataURLtoBlob, downloadByUrl, DownloadOptions, isTypeOf, ObjectOf} from "@lucilor/utils";
import {
  BancaiCad,
  BancaiList,
  BancaiListData,
  CadSearchData,
  Changelog,
  GetCadParams,
  GetOptionsParams,
  OptionsData,
  OptionsDataData,
  QueryMongodbParams,
  QueryMysqlParams,
  SetCadParams,
  TableDataBase,
  TableDeleteFile,
  TableDeleteParams,
  TableInsertParams,
  TableRenderData,
  TableUpdateParams,
  TableUploadFile,
  后台CAD
} from "./cad-data.service.types";
import {CadImgCache} from "./cad-img-cache";
import {HttpService} from "./http.service";
import {CustomResponse, HttpOptions} from "./http.service.types";

@Injectable({
  providedIn: "root"
})
export class CadDataService extends HttpService {
  public cadImgCache = new CadImgCache();
  private domSanitizer: DomSanitizer;
  private route: ActivatedRoute;

  constructor(injector: Injector) {
    super(injector);
    this.domSanitizer = injector.get(DomSanitizer);
    this.route = injector.get(ActivatedRoute);
    this.route.queryParams.subscribe((params) => {
      const {token} = params;
      if (token) {
        this.token = token;
      }
    });
  }

  private async _resolveMissingCads(response: CustomResponse<any>) {
    const missingCads: CadData[] = response.data?.missingCads;
    if (missingCads) {
      const names = missingCads.map((v) => v.name).join(", ");
      const toHide = document.querySelectorAll<HTMLElement>(".ngx-overlay.loading-foreground");
      toHide.forEach((el) => {
        el.classList.add("hidden");
      });
      const button = await this.message.button({
        content: "CAD模块中不存在以下数据，你可以选择生成这些CAD，或从模板中删除这些CAD。<br>" + names,
        disableCancel: true,
        buttons: ["生成CAD", "删除CAD"]
      });
      toHide.forEach((el) => {
        el.classList.remove("hidden");
      });
      return button === "生成CAD";
    }
    return null;
  }

  async getCad(params: GetCadParams, options?: HttpOptions): Promise<{cads: CadData[]; total: number}> {
    const response = await this.post<any>("ngcad/getCad", params, {bypassCodes: [10], ...options});
    const result: {cads: CadData[]; total: number} = {cads: [], total: 0};
    if (response && response.data) {
      if (response.code === 10) {
        const data = new CadData(response.data.cad);
        data.info.isOnline = true;
        result.cads = [data];
      } else {
        const restore = await this._resolveMissingCads(response);
        if (typeof restore === "boolean") {
          return await this.getCad({...params, restore});
        } else {
          result.cads = response.data.map((v: any) => {
            const v2 = new CadData(v);
            v2.info.isOnline = true;
            return v2;
          });
          result.total = response.count || 0;
        }
      }
    }
    return result;
  }

  async getCadRaw(params: GetCadParams) {
    return await this.getDataAndCount<后台CAD[]>("peijian/cad/getCad", {...params, raw: true});
  }

  exportCadData(data: CadData, hideLineLength: boolean) {
    const exportData = data.export();
    const count = data.entities.line.length + data.entities.arc.length;
    for (const type of ["line", "arc"]) {
      const entities = exportData.entities?.[type];
      if (!isTypeOf(entities, "object")) {
        continue;
      }
      for (const id in entities) {
        const e = entities[id];
        const mtexts = e.children?.mtext;
        if (mtexts) {
          for (const mtextId of Object.keys(mtexts)) {
            const mtext = mtexts[mtextId];
            const {isLengthText, isGongshiText, isBianhuazhiText} = (mtext.info || {}) as CadMtextInfo;
            if (isGongshiText || isBianhuazhiText) {
              delete mtexts[mtextId];
            } else if (isLengthText) {
              if (count > 30 && (hideLineLength || e.hideLength)) {
                delete mtexts[mtextId];
              } else {
                const keys = ["type", "info", "insert", "lineweight", "anchor"];
                for (const key of Object.keys(mtext)) {
                  if (!keys.includes(key)) {
                    delete mtext[key];
                  }
                }
              }
            }
          }
        }
      }
    }
    return exportData;
  }

  async setCad(params: SetCadParams, hideLineLength: boolean, options?: HttpOptions): Promise<CadData | null> {
    const cadData = this.exportCadData(params.cadData, hideLineLength);
    const data = {...params, cadData};
    const response = await this.post<any>("peijian/cad/setCad", data, options);
    if (response && response.data) {
      const resData = response.data;
      const restore = await this._resolveMissingCads(response);
      if (typeof restore === "boolean") {
        if (params.collection === "CADmuban") {
          params.cadData.components.data.forEach((v) => {
            const entities = v.entities;
            entities.image = entities.image.filter((e) => !e.info.convertCadToImage);
          });
        }
        return await this.setCad({...params, restore}, hideLineLength, options);
      } else {
        this.cadImgCache.remove(resData.id);
        return new CadData(resData);
      }
    } else {
      return null;
    }
  }

  async getYuanshicadwenjian(params: GetCadParams) {
    const response = await this.post<any[]>("peijian/cad/getYuanshicadwenjian", params);
    const result: {cads: any[]; total: number} = {cads: [], total: 0};
    if (response && response.data) {
      result.cads = response.data;
      result.total = response.count || 0;
    }
    return result;
  }

  async getCadSearchForm() {
    const response = await this.get("peijian/cad/getSearchForm");
    if (response) {
      return response.data as CadSearchData;
    }
    return [];
  }

  async getCadSearchOptions(table: string) {
    const response = await this.post("peijian/cad/getSearchOptions", {table});
    if (response) {
      return response.data as CadSearchData[0]["items"][0];
    }
    return null;
  }

  async downloadDxf(data: CadData, downloadOptions?: DownloadOptions) {
    const result = await this.post<any>("peijian/cad/downloadDxf", {cadData: JSON.stringify(data.export())});
    if (result) {
      try {
        downloadByUrl(origin + "/" + result.data.path, downloadOptions);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    return false;
  }

  async uploadDxf(dxf: File, skipLineContent?: boolean, httpOptions?: HttpOptions) {
    const response = await this.post<any>("peijian/cad/uploadDxf", {dxf, skipLineContent}, httpOptions);
    if (response) {
      return new CadData(response.data);
    }
    return null;
  }

  async replaceData(source: CadData, target: string, collection: CadCollection) {
    source.sortComponents();
    const response = await this.post<any>("peijian/cad/replaceCad", {
      source: JSON.stringify(source.export()),
      target,
      collection
    });
    if (response) {
      return new CadData(response.data);
    }
    return null;
  }

  async getOptions(params: GetOptionsParams, httpOptions?: HttpOptions) {
    const postData: ObjectOf<any> = {...params};
    if (params.data instanceof CadData) {
      delete postData.data;
      const exportData = params.data.export();
      postData.mingzi = exportData.name;
      postData.fenlei = exportData.type;
      postData.xuanxiang = exportData.options;
      postData.tiaojian = exportData.conditions;
    }
    const result = await this.getDataAndCount<OptionsDataData[]>("ngcad/getOptions", postData, httpOptions);
    if (result && !Array.isArray(result.data)) {
      result.data = [];
    }
    return result as OptionsData | null;
  }

  async removeBackup(name: string, time: number) {
    const response = await this.post("peijian/cad/removeBackup", {name, time});
    return response ? true : false;
  }

  async getSuanliaodan(codes: string[]) {
    const data = await this.getData<any[]>("order/order/suanliaodan", {codes});
    return (data || []).map((v) => new CadData(v));
  }

  async removeCads(collection: CadCollection, ids: string[], options?: HttpOptions) {
    return await this.getData<string[]>("peijian/cad/removeCad", {collection, ids}, options);
  }

  async getBancais(table: string, codes: string[]) {
    return await this.getData<{
      bancaiList: BancaiList[];
      bancaiCads: BancaiCad[];
      errors: {code: string; msg: string}[];
      downloadName: string;
      上下走线: string;
      开料孔位配置: string;
      开料参数: string;
    }>("order/order/getBancais", {table, codes});
  }

  async getChangelog(page?: number, pageSize?: number, options?: HttpOptions) {
    const result = await this.getDataAndCount<Changelog>("ngcad/getChangelog", {page, pageSize}, options);
    return {changelog: result?.data || [], count: result?.count || 0};
  }

  async setChangelogItem(changelogItem: Changelog[0], index: number, options?: HttpOptions) {
    return await this.getData("ngcad/setChangelogItem", {changelogItem, index}, options);
  }

  async addChangelogItem(changelogItem: Changelog[0], index: number, options?: HttpOptions) {
    return await this.post("ngcad/addChangelogItem", {changelogItem, index}, options);
  }

  async removeChangelogItem(index: number, options?: HttpOptions) {
    return await this.getData("ngcad/removeChangelogItem", {index}, options);
  }

  async queryMongodb<T extends ObjectOf<any>>(params: QueryMongodbParams, options?: HttpOptions) {
    const data = await this.getData<T[]>("ngcad/queryMongodb", params, options);
    return data || [];
  }

  async queryMySql<T extends TableDataBase>(params: QueryMysqlParams, options?: HttpOptions) {
    const data = await this.getData<T[]>("ngcad/queryMysql", params, {testData: params.table, ...options});
    return data || [];
  }

  getCadImgUrl(id: string) {
    let url = "";
    if (id) {
      url = this.getUrl("ngcad/cadImg", {id});
    }
    if (!url) {
      url = imgCadEmpty;
    }
    return this.domSanitizer.bypassSecurityTrustUrl(url);
  }

  async getCadImg(id: string, useCache = true, options?: HttpOptions) {
    if (useCache) {
      const url = this.cadImgCache.get(id);
      if (url) {
        return url;
      }
    }
    const result = await this.getData<{url: string | null}>("ngcad/getCadImg", {id}, options);
    return result?.url || null;
  }

  async setCadImg(id: string, dataURL: string, options?: HttpOptions) {
    const blob = dataURLtoBlob(dataURL);
    const file = new File([blob], `${id}.png`);
    await this.post("ngcad/setCadImg", {id, file}, options);
  }

  async getShortUrl(name: string, data: ObjectOf<any> = {}, options?: HttpOptions) {
    return await this.getData<string>("ngcad/getShortUrl", {name, data}, options);
  }

  async tableInsert<T extends TableDataBase = TableDataBase>(params: TableInsertParams<T>, options?: HttpOptions) {
    return await this.getData<void>("jichu/jichu/table_insert", params, options);
  }

  async tableUpdate<T extends TableDataBase = TableDataBase>(params: TableUpdateParams<T>, options?: HttpOptions) {
    const data = params.data;
    const getParams2 = (params1: TableUpdateParams<T>) => {
      const params2: ObjectOf<any> = {...params1};
      params2.tableData = params2.data;
      delete params2.data;
      return params2;
    };
    if (Object.keys(data).length > 1) {
      const fields = Object.keys(data).filter((v) => v !== "vid");
      const results = await Promise.all(
        fields.map(async (field) => {
          const data2 = {vid: data.vid, [field]: (data as any)[field]} as any;
          const params2 = getParams2({...params, data: data2});
          const response = await this.post<void>("jichu/jichu/table_update", params2, options);
          return response?.code === 0;
        })
      );
      return results.every(Boolean);
    } else {
      const params2 = getParams2(params);
      const response = await this.post<void>("jichu/jichu/table_update", params2, options);
      return response?.code === 0;
    }
  }

  async tableDelete(params: TableDeleteParams, options?: HttpOptions) {
    const response = await this.post<void>("jichu/jichu/table_delete", params, options);
    return response?.code === 0;
  }

  async tableUploadFile<T extends TableDataBase = TableDataBase>(params: TableUploadFile<T>, options?: HttpOptions) {
    const response = await this.post<void>("jichu/jichu/upload_file", params, options);
    return response?.code === 0;
  }

  async tableDeleteFile<T extends TableDataBase = TableDataBase>(params: TableDeleteFile<T>, options?: HttpOptions) {
    const response = await this.post<void>("jichu/jichu/delete_file", params, options);
    return response?.code === 0;
  }

  async getRedisData(key: string, isString = true, options?: HttpOptions) {
    const data = await this.getData<{value: any}>("ngcad/getRedisData", {key, isString}, options);
    return data?.value;
  }

  async setRedisData(value: any, key?: string, expireTime?: number, options?: HttpOptions) {
    await this.post<{key: string; expireTime: number}>("ngcad/setRedisData", {key, value, expireTime}, options);
  }

  async getBancaiList(fubanNumber?: number) {
    return await this.getData<BancaiListData>("ngcad/getBancaiList", {fubanNumber});
  }

  async getTableRenderData(table: string) {
    return await this.getData<TableRenderData>("ngcad/getTableData", {table});
  }

  async downloadExcel(data: string[][], title?: string, filename?: string) {
    const response = await this.post("ngcad/downloadExcel", {data, title, filename}, {responseType: "blob"});
    return response?.code === 0;
  }

  async uploadImage(file: File | FileList, options?: HttpOptions) {
    if (file instanceof FileList) {
      file = file[0];
    }
    if (!file) {
      return null;
    }
    type UploadImageResult = {url: string; name: string; size: number};
    return await this.getData<UploadImageResult>("ngcad/uploadImage", {key: "file", file}, options);
  }
}
