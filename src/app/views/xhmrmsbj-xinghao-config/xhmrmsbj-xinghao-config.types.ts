import {算料公式, 输入, 选项} from "@components/lurushuju/xinghao-data";
import {SbjbItemCadKey2} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.types";
import {MongodbDataFilterable} from "@modules/http/services/cad-data.service.types";
import {MenshanKey} from "@views/xhmrmsbj/xhmrmsbj.types";

export const xhmrmsbjXinghaoConfigComponentTypes = ["型号配置", "算料单配置", "企料结构配置"] as const;
export type XhmrmsbjXinghaoConfigComponentType = (typeof xhmrmsbjXinghaoConfigComponentTypes)[number];
export const isXhmrmsbjXinghaoConfigComponentType = (v: any): v is XhmrmsbjXinghaoConfigComponentType =>
  xhmrmsbjXinghaoConfigComponentTypes.includes(v);

export interface XhmrmsbjXinghaoConfig {
  输入: 输入[];
  选项: 选项[];
  公式: 算料公式[];
  算料单配置: SuanliaoConfig;
  企料结构配置: QiliaoConfig;
}
export interface XhmrmsbjXinghaoConfigInput {
  key: string;
  value?: string;
}

export interface SuanliaoConfigItem<T extends string = string, K extends string = string, R extends boolean = boolean>
  extends MongodbDataFilterable {
  名字: T;
  位置: K[];
  cad: R extends true ? {id?: string; 唯一码?: string} : null | undefined;
}

export interface SuanliaoConfig {
  门扇中间标注显示?: SuanliaoMszjbzxs[];
}

export const suanliaoMszjbzxsNames = ["卡位宽", "中间宽"] as const;
export type SuanliaoMszjbzxsName = (typeof suanliaoMszjbzxsNames)[number];
export type SuanliaoMszjbzxs = SuanliaoConfigItem<SuanliaoMszjbzxsName, MenshanKey, false>;

export interface QiliaoConfig {
  企料刨坑位置?: QiliaoPkwz[];
  企料分体位置显示?: QiliaoFtwzxs[];
  企料前后封口?: QiliaoQhfk[];
  虚拟企料分类?: QiliaoXnqlfl[];
}

export const qiliaoPkwzNames = ["前刨坑", "后刨坑"] as const;
export type QiliaoPkwzName = (typeof qiliaoPkwzNames)[number];
export type QiliaoPkwz = SuanliaoConfigItem<QiliaoPkwzName, SbjbItemCadKey2, false>;

export const qiliaoFtwzxsNames = ["分体位置显示"] as const;
export type QiliaoFtwzxsName = (typeof qiliaoFtwzxsNames)[number];
export type QiliaoFtwzxs = SuanliaoConfigItem<QiliaoFtwzxsName, SbjbItemCadKey2, false>;

export const qiliaoQhfkNames = ["前封口", "后封口"] as const;
export type QiliaoQhfkName = (typeof qiliaoQhfkNames)[number];
export type QiliaoQhfk = SuanliaoConfigItem<QiliaoQhfkName, SbjbItemCadKey2, true>;

export const qiliaoXnqlflNames = ["虚拟企料"] as const;
export type QiliaoXnqlflName = (typeof qiliaoXnqlflNames)[number];
export type QiliaoXnqlfl = SuanliaoConfigItem<QiliaoXnqlflName, SbjbItemCadKey2, false>;

export type SuanliaoConfigItemsGetter<T extends SuanliaoConfigItem> = (xinghaoConfig: XhmrmsbjXinghaoConfig) => T[];
export type SuanliaoConfigItemsSetter<T extends SuanliaoConfigItem> = (xinghaoConfig: XhmrmsbjXinghaoConfig, items: T[]) => void;

export interface SuanliaoConfigItemCadInfo {
  index: number;
}
