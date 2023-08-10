import {cloneDeep} from "lodash";

export class ListRandom<T> {
  private _listRand: T[];
  private _index = -1;

  constructor(public list: T[]) {
    this._listRand = cloneDeep(list);
  }

  next() {
    const {_listRand: list} = this;
    if (this._index >= list.length - 1) {
      this._index = -1;
    }
    if (this._index < 0) {
      list.sort(() => (Math.random() < 0.5 ? 1 : -1));
      this._index = 0;
      return list[0];
    }
    return list[++this._index];
  }
}
