import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";

export const importComponentConfigNames = ["requireLineId", "pruneLines", "addUniqCode", "dryRun", "noFilterEntities"] as const;
export type ImportComponentConfigName = (typeof importComponentConfigNames)[number];
export type ImportComponentConfig = Record<ImportComponentConfigName, boolean>;

export interface ImportCache {
  collection: CadCollection;
  yaoqiu?: Cad数据要求;
  searchYaoqiu?: boolean;
  xinghao?: string;
  lurushuju?: boolean;
  sbjbReplace?: boolean;
}
