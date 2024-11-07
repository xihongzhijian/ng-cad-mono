import {WritableSignal} from "@angular/core";
import {Constructor, keysOf, ObjectOf} from "@lucilor/utils";

export const Utils = <T extends Constructor>(base = class {} as T) =>
  class extends base {
    private _ensureArray(obj: ObjectOf<any> | undefined | null, key: string) {
      if (!obj || typeof obj !== "object") {
        return false;
      }
      if (!obj[key]) {
        obj[key] = [];
      }
      return true;
    }

    arrayAdd<K>(arr: K[], value: K, index?: number) {
      if (typeof index === "number") {
        arr.splice(index, 0, value);
      } else {
        arr.push(value);
      }
    }
    arrayAdd2<K>(source: ObjectOf<any>, key: string, value: K, index?: number) {
      if (!this._ensureArray(source, key)) {
        return;
      }
      this.arrayAdd(source[key], value, index);
    }
    arrayRemove<K>(arr: K[], index: number) {
      arr.splice(index, 1);
    }
    arrayRemove2<K>(source: ObjectOf<any>, key: string, index: number) {
      if (!this._ensureArray(source, key)) {
        return;
      }
      this.arrayRemove<K>(source[key], index);
    }

    arraySignalAdd<K>(signal: WritableSignal<K[]>, value: K, index?: number) {
      const arr = signal().slice();
      this.arrayAdd(arr, value, index);
      signal.set(arr);
    }
    arraySignalRemove<K>(signal: WritableSignal<K[]>, index: number) {
      const arr = signal().slice();
      this.arrayRemove(arr, index);
      signal.set(arr);
    }

    objectAdd<K>(obj: ObjectOf<K>, value: K, key = "") {
      obj[key] = value;
    }
    objectRemove<K>(obj: ObjectOf<K>, key: string) {
      delete obj[key];
    }

    objectSignalAdd<K>(signal: WritableSignal<ObjectOf<K>>, key: string, value: K) {
      const obj = {...signal()};
      this.objectAdd(obj, value, key);
      signal.set(obj);
    }
    objectSignalRemove<K>(signal: WritableSignal<ObjectOf<K>>, key: string) {
      const obj = {...signal()};
      this.objectRemove(obj, key);
      signal.set(obj);
    }

    keysOf<K extends ObjectOf<any>>(obj: K) {
      return keysOf(obj);
    }

    changeObjectKey<K>(obj: ObjectOf<K>, oldKey: string, newKey: string | Event) {
      if (newKey instanceof Event) {
        const value = (newKey.target as any)?.value;
        if (typeof value === "string") {
          newKey = value;
        } else {
          return;
        }
      }
      if (oldKey !== newKey) {
        const tmp = obj[oldKey];
        delete obj[oldKey];
        obj[newKey] = tmp;
      }
    }

    changeObjectValue<K>(obj: ObjectOf<K>, key: string, value: K) {
      obj[key] = value;
    }

    setNumberValue<K extends ObjectOf<any>>(obj: K, key: keyof K, event: Event) {
      const value = (event.target as HTMLInputElement).value;
      obj[key] = Number(value) as any;
    }
  };
