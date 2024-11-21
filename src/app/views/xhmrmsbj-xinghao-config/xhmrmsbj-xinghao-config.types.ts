import {算料公式, 输入, 选项} from "@components/lurushuju/xinghao-data";

export interface XhmrmsbjXinghaoConfig {
  输入: 输入[];
  选项: 选项[];
  公式: 算料公式[];
}
export interface XhmrmsbjXinghaoConfigInput {
  key: string;
  value?: string;
}
