import {Formulas} from "@app/utils/calc";
import {Step1Data, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjPeizhishuju} from "@components/msbj-rects/msbj-rects.types";
import {ObjectOf} from "@lucilor/utils";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {MsbjData} from "@views/msbj/msbj.types";

export interface XhmrmsbjTableData extends TableDataBase {
  peizhishuju?: string;
  xinghao?: string;
  jiaoshanbujuhesuoshanxiangtong?: number;
  suanliaodanmuban?: string;
  zuoshujubanben?: string;
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

export const xhmrmsbjTabNames = ["锁边铰边", "门扇模块", "门缝配置"] as const;
export type XhmrmsbjTabName = (typeof xhmrmsbjTabNames)[number];

export const menshanKeys = ["锁扇正面", "锁扇背面", "铰扇正面", "铰扇背面", "小扇正面", "小扇背面"] as const;
export type MenshanKey = (typeof menshanKeys)[number];

export interface XhmrmsbjCloseEvent {
  isSubmited: boolean;
}

export type XhmrmsbjDataMsbjInfos = Partial<Record<MenshanKey, XhmrmsbjInfo>>;

export interface XhmrmsbjRequestData {
  型号选中门扇布局: XhmrmsbjDataMsbjInfos;
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
  step1Data: Step1Data;
  模块通用配置: Formulas;
}
export interface XhmrmsbjRequestDataOpts {
  浮动弹窗?: {门扇名字: MenshanKey; 节点名字: string};
}
