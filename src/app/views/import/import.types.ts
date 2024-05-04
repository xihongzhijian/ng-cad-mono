import {Cad数据要求} from "@app/components/lurushuju/xinghao-data";

export type ImportComponentConfigName = "requireLineId" | "pruneLines" | "addUniqCode" | "dryRun" | "noFilterEntities";
export type ImportComponentConfig = Record<ImportComponentConfigName, {value: boolean | null; hidden?: boolean}>;

export interface ImportCache {
  yaoqiu?: Cad数据要求;
  xinghao?: string;
}
