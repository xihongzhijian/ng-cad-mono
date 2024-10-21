import {Formulas} from "@app/utils/calc";
import {ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {getNodeVars, isMokuaiItemEqual, updateMokuaiItems} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {MsbjInfo, ZuoshujuData} from "@views/msbj/msbj.utils";
import {clone, cloneDeep} from "lodash";
import {MenshanKey, XhmrmsbjDataMsbjInfos, XhmrmsbjInfo, XhmrmsbjInfoMokuaiNode, XhmrmsbjTableData} from "./xhmrmsbj.types";

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
        if (选中模块) {
          const i = v.可选模块.findIndex((v2) => isMokuaiItemEqual(v2, 选中模块));
          if (i >= 0) {
            v.可选模块[i] = 选中模块;
          }
        }
        updateMokuaiItems(v.可选模块, typesInfo, true);
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
