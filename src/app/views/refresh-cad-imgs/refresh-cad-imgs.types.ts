import {WritableSignal} from "@angular/core";

export interface RefreshCadImgsConfig {
  step: WritableSignal<number>;
  startIndex: WritableSignal<number>;
  endIndex: WritableSignal<number>;
}
