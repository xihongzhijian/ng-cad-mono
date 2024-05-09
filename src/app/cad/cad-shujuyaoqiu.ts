import {getValueString} from "@app/app.common";
import {cadFields} from "@app/modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {HoutaiCad, TableDataBase} from "@app/modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@app/modules/http/services/cad-data.service.utils";
import {importComponentConfigNames} from "@app/views/import/import.types";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {downloadByUrl, isTypeOf, ObjectOf, queryString} from "@lucilor/utils";

export interface Cad数据要求Raw extends TableDataBase {
  cadtanchuangxiugaishuxing: string;
  xianduantanchuangxiugaishuxing: string;
  tianjiahuodaorucadyaoqiu: string;
  xuanzhongcadyuchuli: string;
  daorucadpeizhi: string;
  xuanzecadtanchuangshaixuanshujuyaoqiu: string;
  bangzhuwendang: string;
  cankaodxfmuban: string;
}

export class Cad数据要求 {
  CAD分类: string;
  CAD弹窗修改属性: Cad数据要求Item[];
  线段弹窗修改属性: string[];
  新建CAD要求: Cad数据要求Item[];
  选中CAD要求: Cad数据要求Item[];
  search: ObjectOf<string>;
  导入配置: ObjectOf<any>;
  选择CAD弹窗筛选数据要求: string;
  帮助文档: string;
  导入参考dxf模板: string;

  constructor(raw: Cad数据要求Raw) {
    const split = (str: string) => {
      if (typeof str === "string") {
        return str
          .split("+")
          .filter(Boolean)
          .map((v) => v.replaceAll("加号", "+"));
      } else {
        return [];
      }
    };
    const emptyCad = new CadData();
    const emptyHoutaiCad = getHoutaiCad(emptyCad);
    const search: Cad数据要求["search"] = {};
    const getItems = (source: string) => {
      const items: Cad数据要求Item[] = [];
      for (const str of split(source)) {
        const arr = str.split("=");
        let key = arr[0];
        const value = arr[1];
        const item: Cad数据要求Item = {key: "", value};
        items.push(item);
        if (key.startsWith("固定")) {
          item.readonly = true;
          item.override = true;
          key = key.slice(2);
        } else if (key.startsWith("选填")) {
          item.override = true;
          key = key.slice(2);
        } else if (key.startsWith("默认")) {
          key = key.slice(2);
        } else if (key.startsWith("必填")) {
          item.required = true;
          key = key.slice(2);
        } else if (key.startsWith("保留")) {
          item.reserve = true;
          key = key.slice(2);
        } else if (key.startsWith("删除")) {
          item.remove = true;
          key = key.slice(2);
        } else {
          item.required = true;
        }
        let key2: string | undefined;
        if (key.startsWith("选项")) {
          item.key2 = key2 = key.slice(2);
          key = "选项";
        }
        item.key = key;
        if (key in emptyHoutaiCad) {
          item.isHoutaiCadKey = true;
          if (value) {
            const searchKey = key + (key2 ? `.${key2}` : "");
            search[searchKey] = value;
          }
        }
        if (key in cadFields) {
          item.cadKey = cadFields[key as keyof typeof cadFields];
        }
      }
      return items;
    };

    this.CAD分类 = raw.mingzi;
    this.CAD弹窗修改属性 = getItems(raw.cadtanchuangxiugaishuxing);
    this.线段弹窗修改属性 = split(raw.xianduantanchuangxiugaishuxing);
    this.新建CAD要求 = getItems(raw.tianjiahuodaorucadyaoqiu);
    this.选中CAD要求 = getItems(raw.xuanzhongcadyuchuli);
    this.search = search;
    this.导入配置 = {};
    this.选择CAD弹窗筛选数据要求 = raw.xuanzecadtanchuangshaixuanshujuyaoqiu;
    this.帮助文档 = raw.bangzhuwendang;
    this.导入参考dxf模板 = raw.cankaodxfmuban;
    let 导入配置Raw: ObjectOf<any> | undefined;
    try {
      导入配置Raw = JSON.parse(raw.daorucadpeizhi);
    } catch (error) {}
    if (isTypeOf(导入配置Raw, "object")) {
      for (const key in 导入配置Raw) {
        if (!importComponentConfigNames.includes(key as any)) {
          continue;
        }
        this.导入配置[key] = 导入配置Raw[key];
      }
    }
  }

  get 有帮助文档() {
    return !!this.帮助文档;
  }
  打开帮助文档() {
    window.open(this.帮助文档);
  }

  get 有导入参考dxf模板() {
    return !!this.导入参考dxf模板;
  }
  下载导入参考dxf模板(api: string) {
    const filename = this.CAD分类 || "导入参考dxf模板";
    const url = `${api}?path=${this.导入参考dxf模板}`;
    downloadByUrl(url, {filename});
  }
}

export interface Cad数据要求Item {
  key: string;
  key2?: string;
  cadKey?: keyof CadData;
  isHoutaiCadKey?: boolean;
  value: string;
  readonly?: boolean;
  required?: boolean;
  override?: boolean;
  remove?: boolean;
  reserve?: boolean;
}

export const filterCad = (query: string, cad: HoutaiCad, yaoqiu: Cad数据要求) => {
  for (const item of yaoqiu.CAD弹窗修改属性) {
    const key2 = item.cadKey;
    if (!key2) {
      continue;
    }
    const value = cad.json?.[key2];
    const str = getValueString(value, ",", ":");
    if (queryString(query, str)) {
      return true;
    }
  }
  return false;
};

export const setCadData = (data: CadData, yaoqiuItems: Cad数据要求Item[]) => {
  const dataAny = data as any;
  const toRemoveMap: ObjectOf<{keys2: string[]}> = {};
  const toReserveMap: typeof toRemoveMap = {};
  for (const {key, cadKey, value, key2, override, remove, reserve} of yaoqiuItems) {
    if (cadKey) {
      if (remove) {
        if (toRemoveMap[cadKey]) {
          if (key2) {
            toRemoveMap[cadKey].keys2.push(key2);
          }
        } else {
          toRemoveMap[cadKey] = {keys2: key2 ? [key2] : []};
        }
      }
      if (reserve) {
        if (toReserveMap[cadKey]) {
          if (key2) {
            toReserveMap[cadKey].keys2.push(key2);
          }
        } else {
          toReserveMap[cadKey] = {keys2: key2 ? [key2] : []};
        }
      }
    }
    if (value) {
      if (key === "展开信息") {
        let arr: any[];
        try {
          arr = JSON.parse(value);
        } catch (error) {
          continue;
        }
        const [a, b, c] = arr.map((v) => v?.toString?.() || "");
        if (data.zhankai.length < 1) {
          data.zhankai.push(new CadZhankai({name: data.name}));
        }
        const zhankai = data.zhankai[0];
        if (!zhankai.zhankaikuan || override) {
          zhankai.zhankaikuan = a || "";
        }
        if (!zhankai.zhankaigao || override) {
          zhankai.zhankaigao = b || "";
        }
        if (!zhankai.shuliang || override) {
          zhankai.shuliang = c || "";
        }
      } else if (cadKey) {
        if (key2) {
          if (!dataAny[cadKey][key2] || override) {
            dataAny[cadKey][key2] = value;
          }
        } else {
          if (!dataAny[cadKey] || override) {
            dataAny[cadKey] = value;
          }
        }
      }
    }
  }
  for (const key in toRemoveMap) {
    let {keys2} = toRemoveMap[key];
    const toReserve = toReserveMap[key];
    if (keys2.length > 0) {
      if (!isTypeOf(dataAny[key], "object")) {
        dataAny[key] = {};
      }
      if (keys2.includes("全部")) {
        keys2 = Object.keys(dataAny[key]);
        if (toReserve) {
          if (toReserve.keys2.includes("全部")) {
            keys2 = [];
          } else {
            keys2 = keys2.filter((v) => !toReserve.keys2.includes(v));
          }
        }
      }
      for (const key2 of keys2) {
        delete dataAny[key][key2];
      }
    } else if (key === "展开信息") {
      data.zhankai = [new CadZhankai({name: data.name})];
    } else {
      dataAny[key] = "";
    }
  }
};
