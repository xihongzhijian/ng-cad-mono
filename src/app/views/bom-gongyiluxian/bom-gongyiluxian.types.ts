import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {TableRenderData} from "@modules/http/services/cad-data.service.types";

export interface DingdanBomData extends TableDataBase {
  dingdanbianhao: string;
  xinghaobianma: string;
  fuji?: number;
  expanded?: boolean;
  children?: DingdanBomData[];
  suanliaocad?: string | null;
  kailiaocad?: string | null;
  shicadjiegouliao?: number;
  序号?: number;
}

export interface DingdanBomDataResponseData {
  data: DingdanBomData[];
  printColumns: string[];
  title: string;
  tableData: TableRenderData;
}

export interface DingdanBomCacheData {
  dataRaw: DingdanBomDataResponseData | null;
}
