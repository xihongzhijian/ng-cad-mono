import {TableDataBase, TableDataWrapper} from "./table-data-base";

export interface QiliaoTableData extends TableDataBase {
  fenti1?: string;
  fenti2?: string;
}
export interface QiliaoFenti {
  id?: string;
  唯一码?: string;
}

export class Qiliao extends TableDataWrapper<QiliaoTableData> {
  static readonly tableName = "p_qiliao";

  constructor(public raw: QiliaoTableData) {
    super(raw);
    this._fenti1 = this.parseField<QiliaoFenti>("fenti1");
    this._fenti2 = this.parseField<QiliaoFenti>("fenti2");
  }

  private _fenti1: QiliaoFenti | null;
  get fenti1() {
    return this._fenti1;
  }
  set fenti1(val: QiliaoFenti | null) {
    this._fenti1 = val;
    this.raw.fenti1 = this.stringifyField("fenti1");
  }

  private _fenti2: QiliaoFenti | null;
  get fenti2() {
    return this._fenti2;
  }
  set fenti2(val: QiliaoFenti | null) {
    this._fenti2 = val;
    this.raw.fenti2 = this.stringifyField("fenti2");
  }
}
