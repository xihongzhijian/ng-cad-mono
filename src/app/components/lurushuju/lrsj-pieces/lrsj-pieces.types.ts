import {Signal} from "@angular/core";

export interface LrsjPieceInfo {
  show: boolean;
}

export interface LrsjPieceInfos {
  xinghaos: Signal<LrsjPieceInfo>;
  zuofas: Signal<LrsjPieceInfo>;
  suanliaoData: Signal<LrsjPieceInfo>;
}
