import {算料公式, 输入, 选项} from "@components/lurushuju/xinghao-data";
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

export interface SuanliaoConfig {
  门扇中间标注显示: SuanliaoConfigMszjbzxs[];
}
export interface SuanliaoConfigMszjbzxs extends MongodbDataFilterable {
  名字: string;
  显示位置: MenshanKey[];
}

export type QiliaoConfig = Record<string, never>;
