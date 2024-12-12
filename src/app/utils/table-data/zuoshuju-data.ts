import {TableDataBase, TableDataWrapper} from "./table-data-base";

export const getIsVersion2024 = (version: any) => version === "模块版本2024";

export interface ZuoshujuTableData extends TableDataBase {
  zuoshujubanben?: string;
}
export class ZuoshujuData<T extends ZuoshujuTableData> extends TableDataWrapper<T> {
  zuoshujubanben?: string;

  constructor(public raw: T) {
    super(raw);
    this.zuoshujubanben = raw.zuoshujubanben;
  }

  get isVersion2024() {
    return getIsVersion2024(this.zuoshujubanben);
  }
}
