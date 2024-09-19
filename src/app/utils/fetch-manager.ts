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
  data = computed(() => {
    if (!this._isDataFetched) {
      untracked(() => this.fetch());
    }
    return this._data();
  });

  async fetch(force?: boolean) {
    if (!force && this._isDataFetched) {
      return this._data();
    }
    const data = await this.fetchFn();
    if (data) {
      this._isDataFetched = true;
      this._data.set(data);
    }
    return this._data();
  }

  setData(data: T) {
    this._data.set(data);
  }
}
