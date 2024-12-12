import {computed, signal, untracked, WritableSignal} from "@angular/core";
import {MaybePromise} from "@lucilor/utils";

export class FetchManager<T> {
  constructor(
    initValue: T,
    public fetchFn: () => MaybePromise<T>
  ) {
    this._data = signal(initValue);
  }

  private _data: WritableSignal<T>;
  private _isDataFetched = false;
  noFetch = false;
  data = computed(() => {
    if (!this._isDataFetched && !this.noFetch) {
      untracked(() => this.fetch());
    }
    return this._data();
  });

  fetchPromise: Promise<T> | null = null;
  async fetch(force?: boolean) {
    if (!force && this._isDataFetched) {
      return this._data();
    }
    let data: T;
    if (this.fetchPromise) {
      data = await this.fetchPromise;
    } else {
      const fetchResult = this.fetchFn();
      if (fetchResult instanceof Promise) {
        this.fetchPromise = fetchResult;
      }
      data = await fetchResult;
    }
    this._isDataFetched = true;
    this.fetchPromise = null;
    this._data.set(data);
    return this._data();
  }

  setData(data: T) {
    this._data.set(data);
  }
}
