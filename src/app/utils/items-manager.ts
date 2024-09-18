import {computed, signal} from "@angular/core";
import {MaybePromise} from "packages/utils/lib";

export class ItemsManager<T> {
  private _items = signal<T[]>([]);
  private _itemsCache: T[] | null = null;
  items = computed(() => this._items());

  constructor(
    public fetchFn: () => MaybePromise<T[]>,
    public compareFn: (item1: T, item2: T) => boolean
  ) {}

  async fetch(force?: boolean) {
    if (!force && this._itemsCache) {
      return this._itemsCache;
    }
    let items = this.fetchFn();
    if (items instanceof Promise) {
      items = await items;
    }
    this._items.set(items);
    this._itemsCache = items;
    return items;
  }

  refresh(params: ItemsManagerRefreshParams<T> = {}) {
    const {update, add, remove} = params;
    const items: T[] = [];
    if (add) {
      items.push(...add);
    }
    for (const item of this._items()) {
      if (remove?.find((v) => this.compareFn(item, v))) {
        continue;
      }
      const item2 = update?.find((v) => this.compareFn(item, v));
      items.push(item2 || item);
    }
    this._items.set(items);
  }
}

export interface ItemsManagerRefreshParams<T> {
  update?: T[];
  add?: T[];
  remove?: T[];
}
