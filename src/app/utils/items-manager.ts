import {computed} from "@angular/core";
import {MaybePromise} from "@lucilor/utils";
import {FetchManager} from "./fetch-manager";

export class ItemsManager<T> {
  constructor(
    public fetchFn: () => MaybePromise<T[]>,
    public compareFn: (item1: T, item2: T) => boolean
  ) {}

  private _fetchManager = new FetchManager([], this.fetchFn);
  items = computed(() => this._fetchManager.data());

  async fetch(force?: boolean) {
    return await this._fetchManager.fetch(force);
  }

  refresh(params: ItemsManagerRefreshParams<T> = {}) {
    const {update, add, remove} = params;
    const items: T[] = [];
    if (add) {
      items.push(...add);
    }
    for (const item of this.items()) {
      if (remove?.find((v) => this.compareFn(item, v))) {
        continue;
      }
      const item2 = update?.find((v) => this.compareFn(item, v));
      items.push(item2 || item);
    }
    this._fetchManager.setData(items);
  }
}

export interface ItemsManagerRefreshParams<T> {
  update?: T[];
  add?: T[];
  remove?: T[];
}
