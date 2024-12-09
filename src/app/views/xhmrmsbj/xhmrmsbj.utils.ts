import {Formulas} from "@app/utils/calc";
import {tryParseJson} from "@app/utils/json-helper";
import {matchMongoData} from "@app/utils/mongo";
import {ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {getNodeVars, isMokuaiItemEqual, updateMokuaiItems} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {isTypeOf, keysOf} from "@lucilor/utils";
import {MsbjInfo, ZuoshujuData} from "@views/msbj/msbj.utils";
import {XhmrmsbjXinghaoConfig} from "@views/xhmrmsbj-xinghao-config/xhmrmsbj-xinghao-config.types";
import {difference, intersection, isEmpty, mapValues} from "lodash";
import {
  MenshanFollowerKey,
  menshanFollowersKeys,
  MenshanKey,
  Shuruzhi,
  XhmrmsbjDataMsbjInfos,
  XhmrmsbjInfo,
  XhmrmsbjInfoMokuaiNode,
  XhmrmsbjInfoMokuaiOption,
  XhmrmsbjTableData
} from "./xhmrmsbj.types";

export class XhmrmsbjData extends ZuoshujuData {
  menshanbujuInfos: XhmrmsbjDataMsbjInfos;
  xinghaoConfig: XhmrmsbjXinghaoConfig;
  算料单模板?: string;

  constructor(
    public raw: XhmrmsbjTableData,
    menshanKeys: readonly MenshanKey[],
    typesInfo: ZixuanpeijianTypesInfo,
    msbjs: MsbjInfo[]
  ) {
    super(raw);
    this.算料单模板 = raw.suanliaodanmuban;
    const info = tryParseJson<XhmrmsbjDataMsbjInfos>(raw.peizhishuju || "", {});
    this.menshanbujuInfos = {};
    const xinghaoConfig = tryParseJson<Partial<XhmrmsbjXinghaoConfig>>(raw.xinghaopeizhi || "", {});
    this.xinghaoConfig = {
      输入: [],
      选项: [],
      公式: [],
      算料单配置: {门扇中间标注显示: []},
      企料结构配置: {},
      ...xinghaoConfig
    };
    for (const key of menshanKeys) {
      const item = info[key] || {};
      this.menshanbujuInfos[key] = item;
      if (!item.选中布局数据) {
        const msbj = msbjs.find((v) => v.vid === item.选中布局);
        if (msbj) {
          item.选中布局数据 = {
            vid: msbj.vid,
            name: msbj.name,
            模块大小关系: msbj.peizhishuju.模块大小关系,
            模块大小配置: msbj.peizhishuju.模块大小配置
          };
        }
      }
      if (item.选中布局数据 && item.选中布局 && item.选中布局数据.vid !== item.选中布局) {
        item.选中布局数据.vid = item.选中布局;
      }
      for (const node of item.模块节点 || []) {
        const mokuai = node.选中模块;
        if (node.输入值) {
          if (mokuai) {
            const shuruzhi = getShuruzhi(item, node, mokuai);
            setShuruzhi(item, node, mokuai, {...node.输入值, ...shuruzhi});
          }
          delete node.输入值;
        }
        if (mokuai) {
          const i = node.可选模块.findIndex((v2) => isMokuaiItemEqual(v2, mokuai));
          if (i >= 0) {
            node.可选模块[i] = mokuai;
          }
        }
        updateMokuaiItems(node.可选模块, typesInfo);
        this.setSelectedMokuai(node, mokuai, true);
      }
    }
    this.updateMenshanFollowers();
  }

  setSelectedMokuai(node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem | undefined | null, setIsDefault: boolean) {
    delete node.选中模块;
    for (const mokuai2 of node.可选模块) {
      const isEqual = mokuai && isMokuaiItemEqual(mokuai2, mokuai);
      if (isEqual) {
        node.选中模块 = mokuai2;
      }
      if (setIsDefault) {
        if (isEqual) {
          if (!mokuai2.info) {
            mokuai2.info = {};
          }
          mokuai2.info.isDefault = true;
        } else {
          if (mokuai2.info?.isDefault) {
            delete mokuai2.info.isDefault;
          }
        }
      }
    }
  }

  setDefaultMokuai(node: XhmrmsbjInfoMokuaiNode, id: number | undefined | null) {
    for (const mokuai2 of node.可选模块) {
      if (mokuai2.id === id) {
        if (!mokuai2.info) {
          mokuai2.info = {};
        }
        mokuai2.info.isDefault = true;
      } else {
        if (mokuai2.info?.isDefault) {
          delete mokuai2.info.isDefault;
        }
      }
    }
  }

  export() {
    for (const info of Object.values(this.menshanbujuInfos)) {
      for (const node of info.模块节点 || []) {
        for (const mokuai of node.可选模块) {
          if (mokuai.info?.isDefault) {
            node.选中模块 = mokuai;
          }
        }
      }
    }

    const data: XhmrmsbjTableData = {
      vid: this.vid,
      mingzi: this.name,
      suanliaodanmuban: this.算料单模板,
      peizhishuju: JSON.stringify(this.menshanbujuInfos),
      xinghaopeizhi: JSON.stringify(this.xinghaoConfig)
    };
    const {raw} = this;
    for (const key of menshanFollowersKeys) {
      (data as any)[key] = raw[key];
    }
    return data;
  }

  getCommonFormulas() {
    const formulas: Formulas = {};
    for (const info of Object.values(this.menshanbujuInfos)) {
      const slgs = {...info.选中布局数据?.模块大小配置?.算料公式};
      for (const node of info.模块节点 || []) {
        const vars = getNodeVars(slgs, node.层名字);
        for (const mokuai of node.可选模块) {
          const {suanliaogongshi, shuchubianliang} = mokuai;
          const vars3 = {...vars, ...suanliaogongshi};
          for (const name of shuchubianliang) {
            if (name in vars3) {
              formulas[name] = vars3[name];
            }
          }
        }
      }
    }
    return formulas;
  }

  private _menshanFollowersMap = new Map<MenshanKey, MenshanKey[]>();
  getHasSeparateMenshanFollowerKeys() {
    const keys: MenshanFollowerKey[] = ["jiaoshanzhengmianhesuoshanzhengmianxiangtong", "jiaoshanbeimianhesuoshanbeimianxiangtong"];
    return keys.every((key) => isTypeOf(this.raw[key], ["number", "boolean"]));
  }
  updateMenshanFollowers() {
    const {raw, _menshanFollowersMap: map} = this;
    map.clear();
    if (this.getHasSeparateMenshanFollowerKeys()) {
      if (raw.jiaoshanzhengmianhesuoshanzhengmianxiangtong) {
        map.set("锁扇正面", ["铰扇正面"]);
      }
      if (raw.jiaoshanbeimianhesuoshanbeimianxiangtong) {
        map.set("锁扇背面", ["铰扇背面"]);
      }
    } else {
      if (raw.jiaoshanbujuhesuoshanxiangtong) {
        map.set("锁扇正面", ["铰扇正面"]);
        map.set("锁扇背面", ["铰扇背面"]);
      }
    }
  }
  getMenshanFollowers(key: MenshanKey) {
    return this._menshanFollowersMap.get(key) || [];
  }
  getMenshanFollowees(key: MenshanKey) {
    const followees: MenshanKey[] = [];
    for (const [followee, followers] of this._menshanFollowersMap.entries()) {
      if (followers.includes(key)) {
        followees.push(followee);
      }
    }
    return followees;
  }
  isMenshanFollowee(key: MenshanKey) {
    return this._menshanFollowersMap.has(key);
  }
  isMenshanFollower(key: MenshanKey) {
    for (const followers of this._menshanFollowersMap.values()) {
      if (followers.includes(key)) {
        return true;
      }
    }
    return false;
  }
}

export const getShuruzhi = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem, xxgsId?: string) => {
  const {输入值, 选项公式输入值} = info;
  const result = {...输入值};
  if (xxgsId) {
    const xxgsKey = getMokuaiObjectKey(node, mokuai, xxgsId);
    Object.assign(result, 选项公式输入值?.[xxgsKey]);
  }
  return result;
};
export const setShuruzhi = (
  info: XhmrmsbjInfo,
  node: XhmrmsbjInfoMokuaiNode,
  mokuai: ZixuanpeijianMokuaiItem,
  shuruzhi: Shuruzhi,
  xxgsId?: string
) => {
  if (xxgsId) {
    const xxgsKey = getMokuaiObjectKey(node, mokuai, xxgsId);
    if (isEmpty(shuruzhi)) {
      if (info.选项公式输入值) {
        delete info.选项公式输入值[xxgsId];
        delete info.选项公式输入值[xxgsKey];
        if (isEmpty(info.选项公式输入值)) {
          delete info.选项公式输入值;
        }
      }
    } else {
      if (!info.选项公式输入值) {
        info.选项公式输入值 = {};
      }
      delete info.选项公式输入值[xxgsId];
      info.选项公式输入值[xxgsKey] = shuruzhi;
      if (info.输入值) {
        for (const key of Object.keys(shuruzhi)) {
          delete info.输入值[key];
        }
        if (isEmpty(info.输入值)) {
          delete info.输入值;
        }
      }
    }
  } else {
    if (isEmpty(shuruzhi)) {
      delete info.输入值;
    } else {
      info.输入值 = shuruzhi;
      if (info.选项公式输入值) {
        for (const xxgsId2 in info.选项公式输入值) {
          const xxgsKey2 = getMokuaiObjectKey(node, mokuai, xxgsId2);
          for (const key of Object.keys(shuruzhi)) {
            for (const key2 of [xxgsId2, xxgsKey2]) {
              delete info.选项公式输入值[key2][key];
            }
          }
          for (const key2 of [xxgsId2, xxgsKey2]) {
            if (isEmpty(info.选项公式输入值[key2])) {
              delete info.选项公式输入值[key2];
            }
          }
        }
        if (isEmpty(info.选项公式输入值)) {
          delete info.选项公式输入值;
        }
      }
    }
  }
};
export const purgeShuruzhi = (infos: XhmrmsbjDataMsbjInfos) => {
  for (const key of keysOf(infos)) {
    const info = infos[key];
    if (!info) {
      continue;
    }
    const varNamesXxgsMap = new Map<string, string[]>();
    const xxgsKeyMap = new Map<string, string[]>();
    const varNames = new Set<string>();
    for (const node of info.模块节点 || []) {
      for (const mokuai of node.可选模块) {
        for (const arr of mokuai.gongshishuru.concat(mokuai.xuanxiangshuru)) {
          varNames.add(arr[0]);
        }
        for (const xxgs of mokuai.xuanxianggongshi) {
          const xxgsKey = getMokuaiObjectKey(node, mokuai, xxgs._id);
          varNamesXxgsMap.set(xxgsKey, Object.keys(xxgs.公式));
          const xxgsKeys = xxgsKeyMap.get(xxgs._id);
          if (xxgsKeys) {
            xxgsKeys.push(xxgsKey);
          } else {
            xxgsKeyMap.set(xxgs._id, [xxgsKey]);
          }
        }
      }
    }
    if (info.输入值) {
      for (const shuruzhiKey of Object.keys(info.输入值)) {
        if (!varNames.has(shuruzhiKey)) {
          delete info.输入值[shuruzhiKey];
        }
      }
      if (isEmpty(info.输入值)) {
        delete info.输入值;
      }
    }
    if (info.选项公式输入值) {
      for (const xxgsKey of Object.keys(info.选项公式输入值)) {
        const xxgsKeys = xxgsKeyMap.get(xxgsKey);
        if (xxgsKeys) {
          for (const xxgsKey2 of xxgsKeys) {
            info.选项公式输入值[xxgsKey2] = {...info.选项公式输入值[xxgsKey], ...info.选项公式输入值[xxgsKey2]};
          }
          delete info.选项公式输入值[xxgsKey];
        }
      }
      for (const xxgsKey of Object.keys(info.选项公式输入值)) {
        const varNamesXxgs = varNamesXxgsMap.get(xxgsKey);
        if (varNamesXxgs) {
          const keysToRemove = difference(Object.keys(info.选项公式输入值[xxgsKey]), varNamesXxgs);
          for (const key2 of keysToRemove) {
            delete info.选项公式输入值[xxgsKey][key2];
          }
          if (isEmpty(info.选项公式输入值[xxgsKey])) {
            delete info.选项公式输入值[xxgsKey];
          }
        } else {
          delete info.选项公式输入值[xxgsKey];
        }
      }
      if (isEmpty(info.选项公式输入值)) {
        delete info.选项公式输入值;
      }
    }
  }
};

export const getMokuaiXxsjValues = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => {
  const options2 = getMokuaiOptions(info, node, mokuai);
  const values: Formulas = {};
  for (const option of mokuai.自定义数据?.选项数据 || []) {
    const option2 = options2.find((v) => v.名字 === option.名字);
    const value = option2?.选中值 || option2?.默认值 || option.可选项.find((v) => v.morenzhi)?.mingzi;
    if (value) {
      values[option.名字] = value;
    }
  }
  return values;
};

export const getMokuaiFormulasRaw = (
  info: XhmrmsbjInfo,
  node: XhmrmsbjInfoMokuaiNode,
  mokuai: ZixuanpeijianMokuaiItem,
  materialResult: Formulas | null | undefined
) => {
  const formulas: Formulas = {};
  if (mokuai.xuanxianggongshi.length > 0) {
    let xxgsList = mokuai.xuanxianggongshi;
    if (materialResult) {
      const optionValues = getMokuaiXxsjValues(info, node, mokuai);
      xxgsList = matchMongoData(xxgsList, {...materialResult, ...optionValues});
    }
    for (const xxgs of xxgsList) {
      Object.assign(formulas, xxgs.公式);
    }
  } else {
    Object.assign(formulas, mokuai.suanliaogongshi);
  }
  return formulas;
};
export const getMokuaiFormulas = (
  info: XhmrmsbjInfo,
  node: XhmrmsbjInfoMokuaiNode,
  mokuai: ZixuanpeijianMokuaiItem,
  materialResult: Formulas | null | undefined
) => {
  const formulas: Formulas = {};
  const setFormulas = (输入值: Shuruzhi) => {
    for (const arr of mokuai.gongshishuru) {
      const k = arr[0];
      const v = 输入值[k];
      if (v) {
        formulas[k] = v;
      }
    }
  };
  const optionValues = getMokuaiXxsjValues(info, node, mokuai);
  const optionFormulas = mapValues(optionValues, (v) => `"${v}"`);
  const duplicateVars = new Set<string>();
  let xxgsList = mokuai.xuanxianggongshi;
  if (xxgsList.length > 0 && materialResult) {
    xxgsList = matchMongoData(xxgsList, {...materialResult, ...optionValues});
  }
  if (xxgsList.length > 0) {
    for (const xxgs of xxgsList) {
      for (const [key, value] of Object.entries(xxgs.公式)) {
        if (isTypeOf(formulas[key], ["null", "undefined"])) {
          formulas[key] = value;
        } else {
          duplicateVars.add(key);
        }
      }
      Object.assign(formulas, xxgs.公式);
      setFormulas(getShuruzhi(info, node, mokuai, xxgs._id));
    }
  } else {
    Object.assign(formulas, mokuai.suanliaogongshi);
    setFormulas(getShuruzhi(info, node, mokuai));
  }
  Object.assign(formulas, optionFormulas);
  return {formulas, duplicateVars: Array.from(duplicateVars)};
};

export const getMokuaiObjectKey = (node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem, xxgsId?: string) => {
  const arr: (string | number)[] = [node.层id, mokuai.id];
  if (xxgsId) {
    arr.push(xxgsId);
  }
  return arr.join("-");
};

export const getMokuaiShuchuVarsRaw = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => {
  const vars = [...mokuai.shuchubianliang];
  for (const option of mokuai.自定义数据?.选项数据 || []) {
    if (option.可选项.length > 0 && option.输出变量) {
      vars.push(option.名字);
    }
  }
  return vars;
};
export const getMokuaiShuchuVars = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => {
  const {输出变量禁用} = info;
  const key = getMokuaiObjectKey(node, mokuai);
  const varsDisabled = 输出变量禁用?.[key] || [];
  const varsRaw = getMokuaiShuchuVarsRaw(info, node, mokuai);
  return difference(varsRaw, varsDisabled);
};
export const setMokuaiShuchuVars = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem, vars: string[]) => {
  if (!info.输出变量禁用) {
    info.输出变量禁用 = {};
  }
  const key = getMokuaiObjectKey(node, mokuai);
  const varsRaw = getMokuaiShuchuVarsRaw(info, node, mokuai);
  info.输出变量禁用[key] = difference(varsRaw, vars);
};
export const purgeShuchuDisabled = (infos: XhmrmsbjDataMsbjInfos) => {
  for (const key of keysOf(infos)) {
    const info = infos[key];
    if (!info?.输出变量禁用) {
      continue;
    }
    type MapItem = (typeof info.输出变量禁用)[string];
    const map = new Map<string, MapItem>();
    for (const node of info.模块节点 || []) {
      for (const mokuai of node.可选模块) {
        const item: MapItem = getMokuaiShuchuVarsRaw(info, node, mokuai);
        map.set(getMokuaiObjectKey(node, mokuai), item);
      }
    }
    for (const key of Object.keys(info.输出变量禁用)) {
      const item = map.get(key);
      info.输出变量禁用[key] = intersection(info.输出变量禁用[key], item);
      if (info.输出变量禁用[key].length < 1) {
        delete info.输出变量禁用[key];
      }
    }
    if (isEmpty(info.输出变量禁用)) {
      delete info.输出变量禁用;
    }
  }
};

export const filterMokuaiOptions = (mokuai: ZixuanpeijianMokuaiItem, options: XhmrmsbjInfoMokuaiOption[]) => {
  const names = mokuai.自定义数据?.选项数据.map((v) => v.名字) || [];
  return options.filter((v) => names.includes(v.名字));
};
export const getMokuaiOptions = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => {
  const {模块选项} = info;
  const key = getMokuaiObjectKey(node, mokuai);
  return filterMokuaiOptions(mokuai, 模块选项?.[key] || []);
};
export const setMokuaiOptions = (
  info: XhmrmsbjInfo,
  node: XhmrmsbjInfoMokuaiNode,
  mokuai: ZixuanpeijianMokuaiItem,
  options: XhmrmsbjInfoMokuaiOption[]
) => {
  if (!info.模块选项) {
    info.模块选项 = {};
  }
  const key = getMokuaiObjectKey(node, mokuai);
  options = filterMokuaiOptions(mokuai, options);
  info.模块选项[key] = options;
};
export const purgeMokuaiOptions = (infos: XhmrmsbjDataMsbjInfos) => {
  for (const key of keysOf(infos)) {
    const info = infos[key];
    if (!info?.模块选项) {
      continue;
    }
    const map = new Map<string, ZixuanpeijianMokuaiItem>();
    for (const node of info.模块节点 || []) {
      for (const mokuai2 of node.可选模块) {
        map.set(getMokuaiObjectKey(node, mokuai2), mokuai2);
      }
    }
    for (const [key, value] of Object.entries(info.模块选项)) {
      const mokuai = map.get(key);
      if (!mokuai) {
        delete info.模块选项[key];
        continue;
      }
      const options = filterMokuaiOptions(mokuai, value);
      if (options.length < 1) {
        delete info.模块选项[key];
      }
    }
    if (isEmpty(info.模块选项)) {
      delete info.模块选项;
    }
  }
};

export const purgeMsbjInfo = (infos: XhmrmsbjDataMsbjInfos) => {
  purgeShuruzhi(infos);
  purgeMokuaiOptions(infos);
  purgeShuchuDisabled(infos);
};
