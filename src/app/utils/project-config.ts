import {ObjectOf} from "@lucilor/utils";
import {getTrbl} from "./trbl";

export class ProjectConfig {
  constructor(private raw: ProjectConfigRaw = {}) {}

  getRaw() {
    return {...this.raw};
  }

  setRaw(raw: ProjectConfigRaw = {}) {
    this.raw = {...raw};
  }

  get<T extends string>(key: string): T;
  get<T extends string>(key: string, defaultValue: string): T;
  get<T extends string>(key?: string, defaultValue?: string) {
    if (key) {
      return (this.raw[key] || defaultValue || "") as T;
    } else {
      return this.raw;
    }
  }

  getBoolean(key: string) {
    const value = this.get(key);
    return value === "是";
  }

  getNumber(key: string, defaultValue = 0) {
    const value = this.get(key);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  getTrbl(key: string, defaultNum = 0) {
    return getTrbl(this.get(key), defaultNum);
  }

  getArray(key: string, defaultValue: string[] = []) {
    const value = this.get(key);
    if (!value) {
      return defaultValue;
    }
    return value.split("+").map((item) => item.trim());
  }

  getObject(key: string, defaultValue: ObjectOf<string> = {}) {
    const value = this.get(key);
    if (!value) {
      return defaultValue;
    }
    const arr = this.getArray(key);
    const obj: ObjectOf<string> = {};
    for (const item of arr) {
      const [k, v] = item.split("=").map((part) => part.trim());
      if (k && v) {
        obj[k] = v || "";
      }
    }
    return obj;
  }

  getIsEqual<T extends string>(key: string, value: T) {
    return this.get<T>(key) === value;
  }

  set<T extends string>(key: string, value: T) {
    this.raw[key] = value;
  }

  setBoolean(key: string, value: boolean) {
    this.set(key, value ? "是" : "否");
  }

  remove(key: string) {
    delete this.raw[key];
  }

  exists(key: string) {
    return key in this.raw;
  }
}

export type ProjectConfigRaw = ObjectOf<string>;
