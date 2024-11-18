import {Formulas} from "@app/utils/calc";
import {matchMongoData} from "@app/utils/mongo";
import {ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {getNodeVars, isMokuaiItemEqual, updateMokuaiItems} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {keysOf} from "@lucilor/utils";
import {MsbjInfo, ZuoshujuData} from "@views/msbj/msbj.utils";
import {clone, cloneDeep, difference, intersection, isEmpty} from "lodash";
import {
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
  铰扇跟随锁扇?: boolean;
  算料单模板?: string;

  constructor(data: XhmrmsbjTableData, menshanKeys: readonly MenshanKey[], typesInfo: ZixuanpeijianTypesInfo, msbjs: MsbjInfo[]) {
    super(data);
    this.铰扇跟随锁扇 = data.jiaoshanbujuhesuoshanxiangtong === 1;
    this.算料单模板 = data.suanliaodanmuban;
    let info: any = null;
    this.menshanbujuInfos = {};
    try {
      info = JSON.parse(data.peizhishuju || "");
    } catch {}
    if (!info || typeof info !== "object") {
      info = {};
    }
    for (const key of menshanKeys) {
      const item = (info[key] || {}) as XhmrmsbjInfo;
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
      const 模块节点 = item.模块节点 || [];
      for (const v of 模块节点) {
        const 选中模块 = v.选中模块;
        if (v.输入值) {
          const shuruzhi = getShuruzhi(item);
          setShuruzhi(item, {...v.输入值, ...shuruzhi});
          delete v.输入值;
        }
        if (选中模块) {
          const i = v.可选模块.findIndex((v2) => isMokuaiItemEqual(v2, 选中模块));
          if (i >= 0) {
            v.可选模块[i] = 选中模块;
          }
        }
        updateMokuaiItems(v.可选模块, typesInfo);
        this.setSelectedMokuai(v, 选中模块, true);
      }
    }
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

  export(): XhmrmsbjTableData {
    return {vid: this.vid, ...this.exportWithoutVid()};
  }
  exportWithoutVid() {
    for (const info of Object.values(this.menshanbujuInfos)) {
      for (const node of info.模块节点 || []) {
        for (const mokuai of node.可选模块) {
          if (mokuai.info?.isDefault) {
            node.选中模块 = mokuai;
          }
        }
      }
    }
    const data: Omit<XhmrmsbjTableData, "vid"> = {
      mingzi: this.name,
      jiaoshanbujuhesuoshanxiangtong: this.铰扇跟随锁扇 ? 1 : 0,
      suanliaodanmuban: this.算料单模板,
      peizhishuju: JSON.stringify(this.menshanbujuInfos)
    };
    return data;
  }

  clone(deep: boolean) {
    return deep ? cloneDeep(this) : clone(this);
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
}

export const getShuruzhi = (info: XhmrmsbjInfo, xxgsId?: string) => {
  if (xxgsId) {
    if (!info.选项公式输入值) {
      info.选项公式输入值 = {};
    }
    if (!info.选项公式输入值[xxgsId]) {
      info.选项公式输入值[xxgsId] = {};
    }
    delete info.输入值;
    return info.选项公式输入值[xxgsId];
  } else {
    if (!info.输入值) {
      info.输入值 = {};
    }
    delete info.选项公式输入值;
    return info.输入值;
  }
};
export const setShuruzhi = (info: XhmrmsbjInfo, shuruzhi: Shuruzhi, xxgsId?: string) => {
  if (xxgsId) {
    if (isEmpty(shuruzhi)) {
      if (info.选项公式输入值) {
        delete info.选项公式输入值[xxgsId];
        if (isEmpty(info.选项公式输入值)) {
          delete info.选项公式输入值;
        }
      }
    } else {
      if (!info.选项公式输入值) {
        info.选项公式输入值 = {};
      }
      info.选项公式输入值[xxgsId] = shuruzhi;
    }
  } else {
    if (isEmpty(shuruzhi)) {
      delete info.输入值;
    } else {
      info.输入值 = shuruzhi;
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
    const varNames = new Set<string>();
    for (const node of info.模块节点 || []) {
      for (const mokuai of node.可选模块) {
        for (const arr of mokuai.gongshishuru.concat(mokuai.xuanxiangshuru)) {
          varNames.add(arr[0]);
        }
        for (const xxgs of mokuai.xuanxianggongshi) {
          varNamesXxgsMap.set(xxgs._id, Object.keys(xxgs.公式));
        }
      }
    }
    if (info.输入值) {
      for (const key of Object.keys(info.输入值)) {
        if (!varNames.has(key)) {
          delete info.输入值[key];
        }
      }
      if (isEmpty(info.输入值)) {
        delete info.输入值;
      }
    }
    if (info.选项公式输入值) {
      for (const key of Object.keys(info.选项公式输入值)) {
        const varNamesXxgs = varNamesXxgsMap.get(key);
        if (varNamesXxgs) {
          const keysToRemove = difference(Object.keys(info.选项公式输入值[key]), varNamesXxgs);
          for (const key2 of keysToRemove) {
            delete info.选项公式输入值[key][key2];
          }
          if (isEmpty(info.选项公式输入值[key])) {
            delete info.选项公式输入值[key];
          }
        } else {
          delete info.选项公式输入值[key];
        }
      }
      if (isEmpty(info.选项公式输入值)) {
        delete info.选项公式输入值;
      }
    }
  }
};

export const getMokuaiFormulas = (
  info: XhmrmsbjInfo,
  node: XhmrmsbjInfoMokuaiNode,
  mokuai: ZixuanpeijianMokuaiItem,
  materialResult: Formulas = {}
) => {
  const formulas: Formulas = {};
  const setFormulas = (输入值: Shuruzhi | undefined) => {
    for (const arr of mokuai.gongshishuru) {
      const k = arr[0];
      const v = 输入值?.[k];
      if (v) {
        formulas[k] = v;
      }
    }
  };
  if (mokuai.xuanxianggongshi.length > 1) {
    let xxgsList = mokuai.xuanxianggongshi;
    if (!isEmpty(materialResult)) {
      xxgsList = matchMongoData(xxgsList, materialResult);
    }
    for (const xxgs of xxgsList) {
      Object.assign(formulas, xxgs.公式);
      setFormulas(info.选项公式输入值?.[xxgs._id]);
    }
  } else {
    Object.assign(formulas, mokuai.suanliaogongshi);
    setFormulas(info.输入值);
  }
  const options2 = getMokuaiOptions(info, node, mokuai);
  for (const option of mokuai.自定义数据?.选项数据 || []) {
    const option2 = options2.find((v) => v.名字 === option.名字);
    const value = option2?.选中值 || option2?.默认值 || option.可选项.find((v) => v.morenzhi)?.mingzi;
    if (value) {
      formulas[option.名字] = `"${value}"`;
    }
  }
  return formulas;
};

const getMokuaiObjectKey = (node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => `${node.层id}-${mokuai.id}`;

export const getMokuaiShuchuVars = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => {
  const {输出变量禁用} = info;
  const key = getMokuaiObjectKey(node, mokuai);
  const vars = mokuai.shuchubianliang.filter((v) => !输出变量禁用?.[key]?.includes(v));
  for (const option of mokuai.自定义数据?.选项数据 || []) {
    if (option.可选项.length > 0 && option.输出变量) {
      vars.push(option.名字);
    }
  }
  return vars;
};
export const setMokuaiShuchuVars = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem, vars: string[]) => {
  if (!info.输出变量禁用) {
    info.输出变量禁用 = {};
  }
  const key = getMokuaiObjectKey(node, mokuai);
  const names1 = intersection(mokuai.shuchubianliang, vars);
  const names2 = difference(vars, names1);
  info.输出变量禁用[key] = difference(mokuai.shuchubianliang, vars);
  for (const option of mokuai.自定义数据?.选项数据 || []) {
    if (names2.includes(option.名字)) {
      option.输出变量 = true;
    } else {
      delete option.输出变量;
    }
  }
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
        const item: MapItem = mokuai.shuchubianliang;
        map.set(getMokuaiObjectKey(node, mokuai), item);
        for (const option of mokuai.自定义数据?.选项数据 || []) {
          if ("输出变量" in option && !option.输出变量) {
            delete option.输出变量;
          }
        }
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
export const getAllShuchuVars = (
  infos: XhmrmsbjDataMsbjInfos,
  opts?: {check?: (key: MenshanKey, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => boolean}
) => {
  const vars = new Set<string>();
  for (const key of keysOf(infos)) {
    const msbjInfo = infos[key];
    if (!msbjInfo) {
      continue;
    }
    for (const node of msbjInfo.模块节点 || []) {
      const mokuai = node.选中模块;
      if (mokuai) {
        if (opts?.check && !opts.check(key, node, mokuai)) {
          continue;
        }
        const varsEnabled2 = getMokuaiShuchuVars(msbjInfo, node, mokuai);
        for (const varName of varsEnabled2) {
          vars.add(varName);
        }
      }
    }
  }
  return Array.from(vars);
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
