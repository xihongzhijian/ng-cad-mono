import {effect, inject, Injectable, signal} from "@angular/core";
import {ObjectOf} from "@lucilor/utils";
import {NgxUiLoaderService} from "ngx-ui-loader";

export interface SpinnerConfig {
  text?: string;
  background?: boolean;
}

@Injectable({
  providedIn: "root"
})
export class SpinnerService {
  private loader = inject(NgxUiLoaderService);

  spinnerShow = signal<{id: string; config?: SpinnerConfig}>({id: ""});
  spinnerHide = signal<{id: string}>({id: ""});
  defaultLoaderId = "master";
  shownSpinners: ObjectOf<{config?: SpinnerConfig}[]> = {};

  spinnerShowEff = effect(() => {
    const {id, config} = this.spinnerShow();
    if (this.shownSpinners[id]) {
      this.shownSpinners[id].push({config});
    } else {
      this.shownSpinners[id] = [{config}];
    }
    if (config?.background) {
      this.loader.startBackgroundLoader(id);
    } else {
      this.loader.startLoader(id);
    }
  });
  spinnerHideEff = effect(() => {
    const {id} = this.spinnerHide();
    const showSpinner = this.shownSpinners[id];
    const {config} = showSpinner.shift() || {};
    if (config?.background) {
      this.loader.stopBackgroundLoader(id);
    } else {
      this.loader.stopLoader(id);
    }
  });

  show(id: string, config?: SpinnerConfig) {
    this.spinnerShow.set({id, config});
  }
  hide(id: string) {
    this.spinnerHide.set({id});
  }
}
