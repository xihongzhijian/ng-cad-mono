import {FormulaInfo} from "@components/formulas/formulas.types";
import {DakongSummary, DakongSummaryItem, DakongSummaryItemDetail} from "@views/select-bancai/select-bancai.types";

export interface DakongSummaryInput {
  data: DakongSummary;
}

export type DakongSummaryOutput = void;

export interface DakongSummaryTableInfo {
  code: string;
  data: DakongSummaryTableData[];
}

export interface DakongSummaryTableData extends DakongSummaryItemDetail {
  cadId: DakongSummaryItem["cadId"];
  cadName: DakongSummaryItem["cadName"];
  cadImgId: DakongSummaryItem["cadImgId"];
  cadQuery: DakongSummaryItem["cadQuery"];
  muban: DakongSummaryItem["muban"];
  peizhiName: DakongSummaryItem["peizhiName"];
  hidden: boolean;
  formulaInfos?: FormulaInfo[];
}

export interface DakongSummaryTableColumn {
  field: keyof DakongSummaryTableData;
  name: string;
}
