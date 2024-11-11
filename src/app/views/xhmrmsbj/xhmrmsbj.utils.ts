import {Formulas} from "@app/utils/calc";
import {matchMongoData} from "@app/utils/mongo";
import {ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {getNodeVars, isMokuaiItemEqual, updateMokuaiItems} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {MsbjInfo, ZuoshujuData} from "@views/msbj/msbj.utils";
import {clone, cloneDeep, difference, intersection, isEmpty} from "lodash";
import {MenshanKey, Shuruzhi, XhmrmsbjDataMsbjInfos, XhmrmsbjInfo, XhmrmsbjInfoMokuaiNode, XhmrmsbjTableData} from "./xhmrmsbj.types";

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

export const getMokuaiFormulas = (info: XhmrmsbjInfo, mokuai: ZixuanpeijianMokuaiItem, materialResult: Formulas = {}) => {
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
  return formulas;
};

const getMokuaiShuchuDisabledKey = (node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => `${node.层id}-${mokuai.id}`;
export const getMokuaiShuchuVars = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem) => {
  const {输出变量禁用} = info;
  const key = getMokuaiShuchuDisabledKey(node, mokuai);
  if (输出变量禁用 && 输出变量禁用[key] && !Array.isArray(输出变量禁用[key])) {
    delete 输出变量禁用[key];
  }
  return mokuai.shuchubianliang.filter((v) => !输出变量禁用?.[key]?.includes(v));
};
export const setMokuaiShuchuVars = (info: XhmrmsbjInfo, node: XhmrmsbjInfoMokuaiNode, mokuai: ZixuanpeijianMokuaiItem, vars: string[]) => {
  if (!info.输出变量禁用) {
    info.输出变量禁用 = {};
  }
  const key = getMokuaiShuchuDisabledKey(node, mokuai);
  info.输出变量禁用[key] = difference(mokuai.shuchubianliang, vars);
};
export const purgeShuchuDisabled = (info: XhmrmsbjInfo) => {
  if (!info.输出变量禁用) {
    return;
  }
  type MapItem = (typeof info.输出变量禁用)[string];
  const map = new Map<string, MapItem>();
  for (const node of info.模块节点 || []) {
    for (const mokuai2 of node.可选模块) {
      const item: MapItem = mokuai2.shuchubianliang;
      map.set(getMokuaiShuchuDisabledKey(node, mokuai2), item);
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
};
