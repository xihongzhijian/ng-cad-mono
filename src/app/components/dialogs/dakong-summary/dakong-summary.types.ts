import {ObjectOf} from "@lucilor/utils";

export interface DakongSummaryInput {
  data: DakongSummary;
}

export type DakongSummaryOutput = void;

export type DakongSummary = ObjectOf<DakongSummaryItem[] | null>;

export interface DakongSummaryItem {
  cadId: string;
  cadName: string;
  summary: DakongSummaryItemDetail[];
}

export interface DakongSummaryItemDetail {
  peizhiId: string;
  kongId: string;
  kongName: string;
  face: string;
  count: number;
  error: string;
}

export interface DakongSummaryTableInfo {
  code: string;
  data: DakongSummaryTableData[];
}

export interface DakongSummaryTableData {
  cadId: string;
  cadName: string;
  peizhiId: string;
  peizhiName: string;
  kongId: string;
  kongName: string;
  face: string;
  count: number;
  error: string;
  hidden: boolean;
}
