import {isTypeOf} from "@lucilor/utils";
import {tryParseJson} from "../json-helper";

export interface TableDataBase {
  vid: number;
  mingzi: string;
}

export interface TableDataBase2 extends TableDataBase {
  paixu: number;
  tingyong: boolean;
}

export abstract class TableDataWrapper<T extends TableDataBase> {
  static readonly tableName?: string;

  id: number;
  name: string;

  constructor(public raw: T) {
    this.id = raw.vid;
    this.name = raw.mingzi;
  }

  parseField<R>(field: keyof T): R | null;
  parseField<R>(field: keyof T, defaultValue: R): R;
  parseField<R>(field: keyof T, defaultValue: R | null = null) {
    const val = this.raw[field];
    if (!(typeof val === "string")) {
      return defaultValue;
    }
    return tryParseJson(val, defaultValue);
  }

  stringifyField(field: keyof this) {
    const val = this[field];
    if (isTypeOf(val, ["null", "undefined"])) {
      return "";
    }
    return JSON.stringify(val);
  }
}
