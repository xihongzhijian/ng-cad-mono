import {Formulas} from "@app/utils/calc";
import {ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {isMokuaiItemEqual, updateMokuaiItems} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {MsbjPeizhishuju} from "@components/msbj-rects/msbj-rects.types";
import {ObjectOf} from "@lucilor/utils";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {MsbjData} from "@views/msbj/msbj.types";
import {MsbjInfo, ZuoshujuData} from "@views/msbj/msbj.utils";
import {cloneDeep} from "lodash";

export interface XhmrmsbjTableData extends TableDataBase {
  peizhishuju?: string;
  xinghao?: string;
  jiaoshanbujuhesuoshanxiangtong?: number;
  suanliaodanmuban?: string;
  zuoshujubanben?: string;
}

export class XhmrmsbjData extends ZuoshujuData {
  menshanbujuInfos: Partial<Record<MenshanKey, XhmrmsbjInfo>>;
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

  clone() {
    return cloneDeep(this);
  }
}

export interface XhmrmsbjInfo {
  选中布局?: number;
  选中布局数据?: {
    vid: number;
    name: string;
    模块大小关系: MsbjPeizhishuju["模块大小关系"];
    模块大小配置: MsbjPeizhishuju["模块大小配置"];
  };
  模块大小输入?: Formulas;
  模块大小输出?: Formulas;
  模块节点?: XhmrmsbjInfoMokuaiNode[];
}

export interface XhmrmsbjInfoMokuaiNode {
  层id: number;
  层名字: string;
  可选模块: ZixuanpeijianMokuaiItem[];
  选中模块?: ZixuanpeijianMokuaiItem;
  排序?: number;
  输入值?: ObjectOf<string>;
}

export const xhmrmsbjTabNames = ["锁边铰边", "门扇模块"] as const;
export type XhmrmsbjTabName = (typeof xhmrmsbjTabNames)[number];

export const menshanKeys = ["锁扇正面", "锁扇背面", "铰扇正面", "铰扇背面", "小扇正面", "小扇背面"] as const;
export type MenshanKey = (typeof menshanKeys)[number];

export interface XhmrmsbjCloseEvent {
  isSubmited: boolean;
}

export interface XhmrmsbjRequestData {
  型号选中门扇布局: XhmrmsbjData["menshanbujuInfos"];
  型号选中板材: MrbcjfzXinghaoInfo["默认板材"];
  铰扇跟随锁扇?: boolean;
  materialResult: Formulas;
  menshanKeys: MenshanKey[];
  houtaiUrl: string;
  id: number;
  user: {经销商名字: string} | null;
  localServerUrl: string;
  opts?: XhmrmsbjRequestDataOpts;
  menshanbujus: MsbjData[];
  peijianmokuais: ZixuanpeijianMokuaiItem[];
}
export interface XhmrmsbjRequestDataOpts {
  浮动弹窗?: {门扇名字: string; 节点名字: string; consumed: boolean};
}
