export interface LrsjPieceInfo {
  show: boolean;
}

export interface LrsjPieceInfos {
  xinghaos: LrsjPieceInfo;
  zuofas: LrsjPieceInfo & {restoreZuofas: boolean};
  suanliaoData: LrsjPieceInfo;
  suanliaoCads: LrsjPieceInfo;
}
