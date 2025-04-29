import {inject, Injectable, signal} from "@angular/core";
import {ObjectOf} from "@lucilor/utils";
import {NgxUiLoaderService} from "ngx-ui-loader";

export interface SpinnerConfig {
  text?: string;
  background?: boolean;
  taskId?: string;
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

  show(id: string, config?: SpinnerConfig) {
    if (this.shownSpinners[id]) {
      this.shownSpinners[id].push({config});
    } else {
      this.shownSpinners[id] = [{config}];
    }
    const {background, taskId} = config || {};
    if (background) {
      this.loader.startBackgroundLoader(id, taskId);
    } else {
      this.loader.startLoader(id, taskId);
    }
    this.spinnerShow.set({id, config});
  }

  hide(id: string) {
    const showSpinner = this.shownSpinners[id];
    if (!showSpinner) {
      return;
    }
    const {config} = showSpinner.shift() || {};
    const {background, taskId} = config || {};
    if (background) {
      this.loader.stopBackgroundLoader(id, taskId);
    } else {
      this.loader.stopLoader(id, taskId);
    }
    this.spinnerHide.set({id});
  }
}
