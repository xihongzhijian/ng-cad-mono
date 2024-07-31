import {OutputEmitterRef} from "@angular/core";
import {ObjectOf} from "@lucilor/utils";
import {BehaviorSubject, filter, take} from "rxjs";

export type LrsjPieceInfo = ObjectOf<string>;

export abstract class LrsjPiece {
  isReadyForInfo = new BehaviorSubject<boolean>(false);
  abstract saveInfo: OutputEmitterRef<void>;

  constructor() {}

  abstract getInfo(): LrsjPieceInfo;
  abstract setInfo(info: LrsjPieceInfo): Promise<void>;
  async readyForInfo() {
    if (this.isReadyForInfo.value) {
      return;
    }
    return new Promise<void>((resolve) => {
      this.isReadyForInfo
        .pipe(
          filter((v) => v),
          take(1)
        )
        .subscribe(() => {
          resolve();
        });
    });
  }
  emitSaveInfo() {
    if (this.isReadyForInfo.value) {
      this.saveInfo.emit();
    }
  }
}
