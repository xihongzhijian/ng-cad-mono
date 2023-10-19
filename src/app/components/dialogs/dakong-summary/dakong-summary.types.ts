import {DakongSummary, DakongSummaryItemDetail} from "@views/select-bancai/select-bancai.types";

export interface DakongSummaryInput {
  data: DakongSummary;
}

export type DakongSummaryOutput = void;

export interface DakongSummaryTableInfo {
  code: string;
  data: DakongSummaryTableData[];
}

export interface DakongSummaryTableData extends DakongSummaryItemDetail {
  cadId: string;
  cadName: string;
  peizhiName: string;
  hidden: boolean;
}
