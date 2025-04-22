import {Component, effect, inject, input, signal, untracked, viewChild} from "@angular/core";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {isEqual} from "lodash";
import {NgxUiLoaderComponent, NgxUiLoaderConfig, NgxUiLoaderModule} from "ngx-ui-loader";

@Component({
  selector: "app-spinner",
  templateUrl: "./spinner.component.html",
  styleUrls: ["./spinner.component.scss"],
  imports: [NgxUiLoaderModule]
})
export class SpinnerComponent {
  private spinner = inject(SpinnerService);

  idIn = input("master", {alias: "id"});
  textIn = input("", {alias: "text"});
  inline = input(false);
  configIn = input<NgxUiLoaderConfig>({}, {alias: "config"});

  id = signal("");
  idEff = effect(() => this.id.set(this.idIn()));
  text = signal("");
  textEff = effect(() => this.text.set(this.textIn()));
  config = signal<NgxUiLoaderConfig>({});
  configEff = effect(() => this.config.set(this.configIn()));

  inlineEff = effect(() => {
    const configPrev = untracked(() => this.config());
    const configCurr = {...configPrev};
    if (this.inline()) {
      if (configCurr.fgsSize === undefined) {
        configCurr.fgsSize = 30;
      }
      if (configCurr.hasProgressBar === undefined) {
        configCurr.hasProgressBar = false;
      }
    }
    if (!isEqual(configPrev, configCurr)) {
      this.config.set(configCurr);
    }
  });

  spinnerShowEff = effect(() => {
    const {id, config} = this.spinner.spinnerShow();
    if (id === this.id()) {
      if (this.inline()) {
        this.text.set("");
      } else if (config?.text) {
        this.text.set(config.text);
      }
    }
  });

  loader = viewChild<NgxUiLoaderComponent>("loader");
  setConfigEff = effect(() => {
    const loader = this.loader();
    if (loader) {
      Object.assign(loader, this.config());
    }
  });
}
