import {Formulas} from "@app/utils/calc";
import {ErrorDetail, ErrorItem} from "@app/utils/error-message";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {Step1Data, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjPeizhishuju} from "@components/msbj-rects/msbj-rects.types";
import {ObjectOf} from "@lucilor/utils";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {MsbjData} from "@views/msbj/msbj.types";
import {xhmrmsbjXinghaoConfigComponentTypes} from "@views/xhmrmsbj-xinghao-config/xhmrmsbj-xinghao-config.types";

export interface XhmrmsbjTableData extends TableDataBase {
  peizhishuju?: string;
  xinghao?: string;
  jiaoshanbujuhesuoshanxiangtong?: number | boolean;
  jiaoshanzhengmianhesuoshanzhengmianxiangtong?: number | boolean;
  jiaoshanbeimianhesuoshanbeimianxiangtong?: number | boolean;
  suanliaodanmuban?: string;
  zuoshujubanben?: string;
  xinghaopeizhi?: string;
}
export const menshanFollowersKeys = [
  "jiaoshanbujuhesuoshanxiangtong",
  "jiaoshanzhengmianhesuoshanzhengmianxiangtong",
  "jiaoshanbeimianhesuoshanbeimianxiangtong"
] as const;
export type MenshanFollowerKey = (typeof menshanFollowersKeys)[number];

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
  输入值?: Shuruzhi;
  模块输入值?: ObjectOf<Shuruzhi>;
  选项公式输入值?: ObjectOf<Shuruzhi>;
  输入变量下单隐藏?: ObjectOf<string[]>;
  输入变量下单隐藏覆盖默认?: ObjectOf<string[]>;
  输出变量禁用?: ObjectOf<string[]>;
  模块选项?: ObjectOf<XhmrmsbjInfoMokuaiOption[]>;
}
export interface XhmrmsbjInfoItem {
  名字: string;
  布局模块: XhmrmsbjInfo;
  选项?: ObjectOf<string>;
  条件?: string;
  默认?: boolean;
  排序?: number;
  停用?: boolean;
}

export type Shuruzhi = ObjectOf<string>;
export interface XhmrmsbjInfoMokuaiOption {
  名字: string;
  默认值?: string;
  选中值?: string;
}

export interface XhmrmsbjInfoMokuaiNode {
  层id: number;
  层名字: string;
  可选模块: ZixuanpeijianMokuaiItem[];
  选中模块?: ZixuanpeijianMokuaiItem;
  排序?: number;
  输入值?: Shuruzhi;
}

export const xhmrmsbjTabNames = [...xhmrmsbjXinghaoConfigComponentTypes, "可选锁边铰边", "门扇模块", "门缝配置"] as const;
export type XhmrmsbjTabName = (typeof xhmrmsbjTabNames)[number];

export const menshanKeys = ["锁扇正面", "锁扇背面", "铰扇正面", "铰扇背面", "小扇正面", "小扇背面"] as const;
export const menshanKeys2 = ["正面"] as const;
export type MenshanKey = (typeof menshanKeys | typeof menshanKeys2)[number];

export interface XhmrmsbjCloseEvent {
  isSubmited: boolean;
}

export type XhmrmsbjDataMsbjInfos = Partial<Record<MenshanKey, XhmrmsbjInfo>>;
export type XhmrmsbjDataMsbjInfos2 = Partial<Record<MenshanKey, XhmrmsbjInfoItem[]>>;

export interface XhmrmsbjRequestData {
  型号选中门扇布局: XhmrmsbjDataMsbjInfos;
  型号选中板材: MrbcjfzXinghaoInfo["默认板材"];
  铰扇跟随锁扇?: boolean;
  铰扇正面跟随锁扇正面?: boolean;
  铰扇背面跟随锁扇背面?: boolean;
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

export type XhmrmsbjError = ErrorItem<XhmrmsbjErrorDetailTextInfo>;
export type XhmrmsbjErrorDetail = ErrorDetail<XhmrmsbjErrorDetailTextInfo>;
export interface XhmrmsbjErrorDetailTextInfo {
  jumpTo?: XhmrmsbjErrorJumpTo;
}
export interface XhmrmsbjErrorJumpTo {
  门扇模块?: {
    menshanKey?: MenshanKey;
    itemIndex?: number;
    nodeName?: string;
    mokuai?: string;
    openMokuai?: boolean;
    mkdx?: boolean;
    xinghaoConfig?: boolean;
  };
  型号配置?: boolean;
}
