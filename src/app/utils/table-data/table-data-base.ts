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
  constructor(public raw: T) {}

  parseFeild<R>(field: keyof T): R | null;
  parseFeild<R>(field: keyof T, defaultValue: R): R;
  parseFeild<R>(field: keyof T, defaultValue: R | null = null) {
    const val = this.raw[field];
    if (!(typeof val === "string")) {
      return defaultValue;
    }
    return tryParseJson(val, defaultValue);
  }
}
