import {Component, HostListener, inject} from "@angular/core";
import {CadData} from "@lucilor/cad-viewer";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusSplit} from "@services/cad-status";

@Component({
  selector: "app-cad-split",
  templateUrl: "./cad-split.component.html",
  styleUrls: ["./cad-split.component.scss"]
})
export class CadSplitComponent {
  private config = inject(AppConfigService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  prevConfig: Partial<AppConfig> = {};
  cadStatusSplitEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusSplit,
    () => {
      this.prevConfig = this.config.setConfig("dragAxis", "xy", {sync: false});
      this.focus();
    },
    () => {
      this.config.setConfig(this.prevConfig, {sync: false});
      this.blur();
    }
  );

  private _splitCadLock = false;
  @HostListener("window:keypress", ["$event"])
  async splitCad(event: KeyboardEvent) {
    if (event.key !== "Enter" || this._splitCadLock) {
      return;
    }
    if (!this.status.hasCadStatus((v) => v instanceof CadStatusSplit)) {
      return;
    }
    const cad = this.status.cad;
    const entities = cad.selected();
    if (entities.length < 1) {
      return;
    }
    const data = cad.data;
    if (!data) {
      return;
    }
    this._splitCadLock = true;
    const name = await this.message.prompt({type: "string", label: "CAD的名称", value: "新建CAD"});
    if (name === null) {
      this._splitCadLock = false;
      return;
    }
    const split = new CadData({name});
    split.conditions = [...data.conditions];
    split.options = {...data.options};
    split.type = data.type;
    split.entities = entities.clone(true);
    data.entities.separate(entities);
    data.components.data.push(split);
    try {
      data.directAssemble(split);
    } catch (error) {
      this.message.snack("快速装配失败: " + (error as Error).message);
      return;
    }
    await this.status.openCad({data});
    if (this.status.hasCadStatus((v) => v instanceof CadStatusSplit)) {
      await this.focus();
    }
    this._splitCadLock = false;
  }

  async focus() {
    const cad = this.status.cad;
    this.status.focus();
    cad.data.components.data.forEach((v) => {
      this.status.blur(v.entities);
    });
    await cad.render();
  }

  async blur() {
    const cad = this.status.cad;
    this.status.focus();
    await cad.render();
  }
}
