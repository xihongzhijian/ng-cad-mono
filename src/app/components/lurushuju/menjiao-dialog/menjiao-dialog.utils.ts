import {CadListInput} from "@components/dialogs/cad-list/cad-list.types";
import {CadData} from "@lucilor/cad-viewer";
import {isTypeOf, keysOf, ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.types";
import {random} from "lodash";
import {OptionsAll2} from "../lurushuju-index/lurushuju-index.types";
import {
  cadMatchRules,
  MenjiaoCadType,
  menjiaoCadTypes,
  SuanliaoDataParams,
  孔位CAD名字对应关系,
  算料数据,
  算料数据2,
  算料数据2Keys,
  门缝配置输入
} from "../xinghao-data";

export const autoFillMenjiao = (data: 算料数据, menjiaoOptionsAll: OptionsAll2) => {
  const setOption = (key: string) => {
    const {options, multiple, disabled} = menjiaoOptionsAll[key];
    if (disabled || !options || options.length < 1) {
      return;
    }
    if (multiple) {
      const result = [];
      for (const option of options) {
        if (Math.random() > 0.5) {
          result.push(option.name);
        }
      }
      if (result.length < 1) {
        result.push(options[0]);
      }
      (data as any)[key] = result;
    } else {
      (data as any)[key] = options[random(0, options.length - 1)].name;
    }
  };
  for (const key1 in data) {
    if (key1 in menjiaoOptionsAll) {
      setOption(key1);
    } else if (key1 === menjiaoCadTypes[0]) {
      for (const key2 of 算料数据2Keys) {
        for (const key3 of keysOf(data[key1][key2])) {
          if (!data[key1][key2][key3].cad) {
            const name = 孔位CAD名字对应关系[key3] || key3;
            data[key1][key2][key3].cad = getHoutaiCad(new CadData({name}));
          }
        }
      }
    } else if (key1 === "锁扇铰扇蓝线宽固定差值") {
      data[key1] = random(0, 100);
    }
  }
  for (const item of 门缝配置输入) {
    data.门缝配置[item.name] = isTypeOf(item.defaultValue, "number") ? (item.defaultValue as number) : 1;
  }
  data.名字 = "autoFill";
  updateMenjiaoForm(data);
};

export const updateMenjiaoForm = (data: 算料数据) => {
  data.开启 = [];
  const menjiaoCadInfos = getMenjiaoCadInfos(data);
  for (const key1 in menjiaoCadInfos) {
    const key2 = key1.split("+")[1];
    if (menjiaoCadInfos[key1].isFull && !data.开启.includes(key2)) {
      data.开启.push(key2);
    }
  }
  const keys = ["vid", "产品分类", "开启", "门铰", "门扇厚度", "锁边", "铰边"] as const;
  const values = keys
    .map((k) => {
      const value = data[k];
      if (Array.isArray(value)) {
        return value.join(",");
      } else {
        return value;
      }
    })
    .filter(Boolean);
  data.名字2 = values.join("_");
};

export const getMenjiaoCadInfos = (data: 算料数据) => {
  const menjiaoCadInfos: ObjectOf<{isEmpty: boolean; isFull: boolean}> = {};
  for (const key1 of menjiaoCadTypes) {
    if (!data[key1]) {
      continue;
    }
    menjiaoCadInfos[key1] = {isEmpty: true, isFull: true};
    for (const key2 of 算料数据2Keys) {
      for (const key3 in data[key1][key2]) {
        if (data[key1][key2][key3].cad) {
          menjiaoCadInfos[key1].isEmpty = false;
        } else {
          menjiaoCadInfos[key1].isFull = false;
        }
      }
    }
  }
  return menjiaoCadInfos;
};

const matchOptionFn = `
function (value1, value2, falseIfEmpty) {
  if (value2 === undefined || value2 === null || value2 === "") {
    return !falseIfEmpty;
  }
  if (value2 === "所有") {
    return true;
  }
  if (typeof value2 === "string") {
    value2 = value2.split(";");
  }
  if (!Array.isArray(value1)) {
    value1 = [value1];
  }
  for (var i = 0; i < value1.length; i++) {
    var v = value1[i];
    if (value2.indexOf(v) >= 0) {
      return true;
    }
  }
  return false;
}`;

export const getCadSearch = (data: 算料数据, key1: MenjiaoCadType, key2: string, key3: string) => {
  const missingValues = [];
  const rule = cadMatchRules[key3];
  if (!rule) {
    throw new Error("没有对应的cad匹配规则");
  }
  const {分类, 选项} = rule;
  for (const name of 选项) {
    if (!data[name]) {
      missingValues.push(name);
    }
  }
  if (missingValues.length > 0) {
    throw new Error("请先选择" + missingValues.join("、"));
  }
  const formValues: ObjectOf<any> = {};
  for (const name of 选项) {
    const value = data[name];
    formValues[name] = value;
  }
  const [包边方向, 开启] = key1.split("+");
  const filter = `
    function fn() {
      if (!this.选项) {
        return false;
      }
      var 分类 = ${JSON.stringify(分类)};
      var 选项 = ${JSON.stringify(选项)};
      var form = ${JSON.stringify(formValues)};
      var 包边方向1 = ${JSON.stringify(包边方向)};
      var 开启1 = ${JSON.stringify(开启)};
      var 包边方向2 = this.选项.包边方向;
      var 开启2 = this.选项.开启;
      var matchOption = ${matchOptionFn};
      var check = function () {
        if (包边方向1 === "包边在外") {
          return matchOption(包边方向1, 包边方向2) && matchOption(开启1, 开启2, true);
        } else if (包边方向1 === "包边在内") {
          if (matchOption("包边在内", 包边方向2, true) && matchOption(开启1, 开启2, true)) {
            return true;
          }
          if (开启1 === "外开") {
            return matchOption("包边在外", 包边方向2) && matchOption("内开", 开启2, true);
          } else if (开启1 === "内开") {
            return matchOption("包边在外", 包边方向2) && matchOption("外开", 开启2, true);
          }
        }
      }
      if (!check()) {
        return false;
      }
      if (分类.indexOf(this.分类) < 0) {
        return false;
      }
      for (var i = 0; i < 选项.length; i++) {
        var name = 选项[i];
        var value1 = form[name];
        var value2 = this.选项[name];
        if (!matchOption(value1, value2)) {
          return false;
        }
      }
      return true;
    }
    `;
  const search: CadListInput["search"] = {$where: filter};
  const addCadData: CadListInput["addCadData"] = {分类: key3, 选项: {开启}};
  return {search, addCadData};
};

export const getShiyituCadSearch = (data: 算料数据, key1: MenjiaoCadType) => {
  const 开启 = key1.split("+")[1];
  const 产品分类 = data.产品分类;
  const 分类 = "算料单示意图";
  const filter = `
    function fn() {
      if (!this.选项) {
        return false;
      }
      var 产品分类1 = ${JSON.stringify(产品分类)};
      var 产品分类2 = this.选项.产品分类;
      var 开启1 = ${JSON.stringify(开启)};
      var 开启2 = this.选项.开启;
      var matchOption = ${matchOptionFn};
      return matchOption(产品分类1, 产品分类2) && matchOption(开启1, 开启2);
    }
    `;
  const search: CadListInput["search"] = {$where: filter, 分类, 名字: {$ne: "开启锁向示意图"}};
  const addCadData: CadListInput["addCadData"] = {分类, 选项: {产品分类, 开启}};
  return {search, addCadData};
};

export const copySuanliaoData = async (
  http: CadDataService,
  fromData: 算料数据2,
  toData: 算料数据2,
  fromParams: SuanliaoDataParams,
  toParams: SuanliaoDataParams
) => {
  const mubanIds: ObjectOf<string> = {};
  const toChangeMubanId: any[] = [];
  for (const key2 in fromData.算料CAD) {
    const cadFrom = fromData.算料CAD[key2].json;
    const cadTo = toData.算料CAD[key2].json;
    if (!cadFrom || !cadTo) {
      return;
    }
    const mubanIdFrom = cadFrom.zhankai?.[0]?.kailiaomuban;
    if (typeof mubanIdFrom === "string" && mubanIdFrom) {
      mubanIds[cadTo.id] = mubanIdFrom;
      toChangeMubanId.push(cadTo);
    }
  }
  const copyResult = await http.getData<{mubanIds: typeof mubanIds}>("shuju/api/copySuanliaoData", {
    from: fromParams,
    to: toParams,
    mubanIds
  });
  if (!copyResult) {
    return false;
  }
  const mubanIds2 = copyResult.mubanIds;
  for (const cad of toChangeMubanId) {
    cad.zhankai[0].kailiaomuban = mubanIds2[cad.id];
  }
  return true;
};
