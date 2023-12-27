import {Injectable} from "@angular/core";
import {ObjectOf} from "@lucilor/utils";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject} from "rxjs";

export interface SpinnerConfig {
  text?: string;
  background?: boolean;
}

@Injectable({
  providedIn: "root"
})
export class SpinnerService {
  spinnerShow$ = new BehaviorSubject<{id: string; config?: SpinnerConfig}>({id: ""});
  spinnerHide$ = new BehaviorSubject<{id: string}>({id: ""});
  defaultLoaderId = "master";
  shownSpinners: ObjectOf<{config?: SpinnerConfig}[]> = {};

  constructor(private loader: NgxUiLoaderService) {
    this.spinnerShow$.subscribe(({id, config}) => {
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
    this.spinnerHide$.subscribe(({id}) => {
      const showSpinner = this.shownSpinners[id];
      const {config} = showSpinner.shift() || {};
      if (showSpinner.length < 1) {
        if (config?.background) {
          this.loader.stopBackgroundLoader(id);
        } else {
          this.loader.stopLoader(id);
        }
        this.loader.stopLoader(id);
      }
    });
  }

  show(id: string, config?: SpinnerConfig) {
    this.spinnerShow$.next({id, config});
  }

  hide(id: string) {
    this.spinnerHide$.next({id});
  }
}
