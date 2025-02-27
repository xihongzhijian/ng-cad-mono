import {ChangeDetectionStrategy, Component, computed, HostBinding, HostListener, inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatMenuModule} from "@angular/material/menu";
import {RouterModule} from "@angular/router";
import {KeyEventItem, onKeyEvent} from "@app/app.common";
import {isLengthTextSizeSetKey, isShiyitu} from "@app/cad/utils";
import {AboutComponent} from "@components/about/about.component";
import {openBbzhmkgzDialog} from "@components/dialogs/bbzhmkgz/bbzhmkgz.component";
import {openCadLineTiaojianquzhiDialog} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {environment} from "@env";
import {CadData, CadLine, CadMtext, sortLines} from "@lucilor/cad-viewer";
import {downloadByString, timeout} from "@lucilor/utils";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusNormal} from "@services/cad-status";
import {openExportPage} from "@views/export/export.utils";
import {openImportPage} from "@views/import/import.utils";
import {isEqual} from "lodash";
import {openCadKailiaoConfigDialog} from "../../dialogs/cad-kailiao-config/cad-kailiao-config.component";
import {CadLayerInput, openCadLayerDialog} from "../../dialogs/cad-layer/cad-layer.component";
import {CadStatusFentiConfig} from "../cad-fenti-config/cad-fenti-config.utils";
import {openCadLineForm} from "../cad-line/cad-line.utils";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"],
  imports: [AboutComponent, MatButtonModule, MatDividerModule, MatMenuModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent {
  private config = inject(AppConfigService);
  private console = inject(CadConsoleService);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  openLock = signal(false);
  keyEventItems: KeyEventItem[] = [
    {
      key: "s",
      ctrl: true,
      action: () => {
        this.save();
      }
    },
    {
      key: "1",
      ctrl: true,
      action: () => {
        this.open("1");
      }
    },
    {
      key: "2",
      ctrl: true,
      action: () => {
        this.open("2");
      }
    },
    {
      key: "3",
      ctrl: true,
      action: () => {
        this.open("3");
      }
    },
    {
      key: "4",
      ctrl: true,
      action: () => {
        this.open("4");
      }
    },
    {
      key: "5",
      ctrl: true,
      action: () => {
        this.open("5");
      }
    },
    {
      key: "g",
      ctrl: true,
      action: () => {
        this.assembleCads();
      }
    },
    {
      key: "h",
      ctrl: true,
      action: () => {
        this.splitCad();
      }
    },
    {
      key: "p",
      ctrl: true,
      action: () => {
        this.printCad();
      }
    },
    {
      key: "q",
      ctrl: true,
      action: () => {
        this.newCad();
      }
    },
    {
      key: "escape",
      action: () => {
        if (this.canLeaveWithEsc()) {
          this.leaveCadStatus();
          return true;
        }
        return false;
      }
    },
    {
      key: "enter",
      action: () => {
        if (this.canConfirmWithEnter()) {
          this.leaveCadStatus(true);
          return true;
        }
        return false;
      }
    }
  ];

  isStatusNormal = computed(() => this.status.hasCadStatus((v) => v instanceof CadStatusNormal));
  statusName = computed(() => this.status.lastCadStatus()?.name || "");
  canLeave = computed(() => !!this.status.lastCadStatus()?.canLeave);
  canLeaveWithEsc = computed(() => {
    const {canLeave = false, leaveWithEsc = false} = this.status.lastCadStatus() || {};
    return canLeave && leaveWithEsc;
  });
  canConfirm = computed(() => !!this.status.lastCadStatus()?.canConfirm);
  canConfirmWithEnter = computed(() => {
    const {canConfirm = false, confirmWithEnter = false} = this.status.lastCadStatus() || {};
    return canConfirm && confirmWithEnter;
  });
  get data() {
    return this.status.cad.data;
  }
  openCadOptions = this.status.openCadOptions;
  env = environment;

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    onKeyEvent(event, this.keyEventItems);
  }

  getConfig(key: keyof AppConfig) {
    return this.config.getConfig(key);
  }

  clickBtn(key: string) {
    const item = this.keyEventItems.find((v) => v.key === key);
    item?.action();
  }

  save() {
    this.console.execute("save");
  }

  open(collection: string) {
    this.console.execute("open", {collection});
  }

  flip(vertical: boolean, horizontal: boolean) {
    this.console.execute("flip", {vertical: vertical ? "true" : "false", horizontal: horizontal ? "true" : "false"});
  }

  async rotate(clockwise?: boolean) {
    let angle: number | null = 0;
    if (clockwise === undefined) {
      angle = await this.message.prompt<number>({type: "number", label: "输入角度"});
      if (angle === null) {
        return;
      }
    } else {
      if (clockwise) {
        angle = 90;
      } else if (!clockwise) {
        angle = -90;
      }
    }
    this.console.execute("rotate", {degrees: angle.toString()});
  }

  showManual() {
    this.console.execute("man");
  }

  assembleCads() {
    this.console.execute("assemble");
  }

  splitCad() {
    this.console.execute("split");
  }

  toggleShowDimensions() {
    this.config.setConfig("hideDimensions", !this.config.getConfig("hideDimensions"));
  }

  toggleValidateLines() {
    const value = !this.config.getConfig("validateLines");
    this.config.setConfig("validateLines", value);
    if (value) {
      const errMsg = this.status.validate()?.errors || [];
      if (errMsg.length > 0) {
        this.message.alert(errMsg.join("<br />"));
      }
    }
  }

  toggleShowLineLength() {
    this.config.setConfig("hideLineLength", !this.config.getConfig("hideLineLength"));
  }

  toggleShowLineGongshi() {
    this.config.setConfig("hideLineGongshi", !this.config.getConfig("hideLineGongshi"));
  }

  async setShowGongshi() {
    const numStr = await this.message.prompt({
      type: "number",
      label: "公式字体大小",
      hint: "请输入大于0的数字",
      value: this.config.getConfig("lineGongshi"),
      validators: [(control) => (control.value > 0 ? null : {公式字体大小必须大于0: true})]
    });
    if (numStr !== null) {
      this.config.setConfig("lineGongshi", Number(numStr));
      await this.status.cad.render();
    }
  }

  async setPointSize() {
    const pointSize = this.config.getConfig("pointSize");
    const n = await this.message.prompt({value: pointSize, type: "number", label: "选取点大小"});
    if (n !== null && !isNaN(n)) {
      this.config.setConfig("pointSize", n);
    }
  }

  async resetLineLength() {
    const cad = this.status.cad;
    if (cad.getConfig("hideLineLength")) {
      return;
    }
    cad.traverse((e) => {
      if (e instanceof CadMtext && e.info.isLengthText) {
        e.remove();
        if (e.parent) {
          delete e.parent.info[isLengthTextSizeSetKey];
        }
      }
    }, true);
    this.status.generateLineTexts();
    await cad.render();
  }

  printCad() {
    this.console.execute("print");
  }

  fillet(radius?: number) {
    this.console.execute("fillet", {radius: radius ? radius.toString() : "0"});
  }

  leaveCadStatus(confirmed?: boolean) {
    const cadStatuses = this.status.cadStatuses();
    const cadStatus = cadStatuses.at(-1);
    if (!cadStatus) {
      return;
    }
    cadStatus.confirmed = !!confirmed;
    if (cadStatuses.length > 1) {
      this.status.setCadStatuses(cadStatuses.slice(0, -1));
    } else {
      this.status.setCadStatuses([new CadStatusNormal()]);
    }
  }

  newCad() {
    this.console.execute("new-cad");
  }

  setKailiaofangshi() {
    sortLines(this.status.cad.data.entities).forEach((group) => {
      const start = group[0];
      const end = group[group.length - 1];
      if (start) {
        start.zhankaifangshi = "使用线长";
      }
      if (end) {
        end.zhankaifangshi = "使用线长";
      }
    });
  }

  highlightTjqz() {
    this.status.cad.data.getAllEntities().line.forEach((e) => {
      if (e.tiaojianquzhi.length > 0) {
        e.selected = true;
      } else {
        e.selected = false;
      }
    });
  }

  async scaleComponents(factorNum?: number) {
    if (factorNum === undefined) {
      const factorStr = await this.message.prompt({type: "number", label: "放大倍数"});
      if (typeof factorStr !== "string") {
        return;
      }
      factorNum = Number(factorStr);
      if (isNaN(factorNum)) {
        this.message.alert("请输入有效数字");
        return;
      }
    }
    const data = this.status.cad.data;
    for (const component of data.components.data) {
      const rect = component.getBoundingRect();
      component.transform({scale: [factorNum, factorNum], origin: [rect.x, rect.y]}, true);
    }
    data.updateComponents();
    this.status.cad.render();
  }

  private async _checkSelectedOnlyOne() {
    const selected = this.status.cad.selected();
    const lines = selected.toArray().filter((v) => v instanceof CadLine);
    if (lines.length !== 1) {
      this.message.alert("请先选中且只选中一根线");
      return null;
    }
    return lines[0];
  }

  async editZhankai() {
    await editCadZhankai(this.dialog, this.status.cad.data);
  }

  async editTiaojianquzhi() {
    const line = await this._checkSelectedOnlyOne();
    if (line) {
      openCadLineTiaojianquzhiDialog(this.dialog, {data: line});
    }
  }

  async editLineInfo() {
    const line = await this._checkSelectedOnlyOne();
    if (!line) {
      return;
    }
    await openCadLineForm(this.status.collection$.value, this.status, this.message, this.status.cad, line, null);
  }

  async editBbzhmkgz() {
    const data = this.status.cad.data;
    const result = await openBbzhmkgzDialog(this.dialog, {
      width: "80%",
      height: "75%",
      data: {value: data.info.修改包边正面宽规则 || "", vars: data.info.vars}
    });
    if (result) {
      data.info.修改包边正面宽规则 = result.value;
    }
  }

  async resetIds() {
    const data = this.status.cad.data;
    const yes = await this.message.confirm({
      title: "重设ID",
      content: `重新生成<span class="error">${data.name}</span>的所有实体ID，是否确定？`
    });
    if (!yes) {
      return;
    }
    data.resetIds(true);
    await timeout(0);
    this.message.snack("重设ID完成");
  }

  async copyCad() {
    const collection = this.status.collection$.getValue();
    const loaderId = this.spinner.defaultLoaderId;
    const items = await this.http.mongodbCopy<HoutaiCad>(collection, [this.status.cad.data.id], {}, {spinner: loaderId});
    if (items?.[0]) {
      if (await this.message.confirm("是否跳转至新的CAD？")) {
        this.spinner.show(loaderId);
        await this.status.openCad({data: new CadData(items[0].json), center: true});
        this.spinner.hide(loaderId);
      }
    }
  }

  async removeCad() {
    const data = this.status.cad.data;
    if (await this.message.confirm(`确定要删除吗？`)) {
      const collection = this.status.collection$.getValue();
      const ids = [data.id];
      const deletedIds = await this.http.removeCads(collection, ids);
      if (deletedIds) {
        document.body.innerHTML = "<h1>已删除</h1>";
      }
    }
  }

  goToBackup() {
    const url = new URL(location.href);
    url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf("/")) + "/backup";
    window.open(url.href);
  }

  async openCadLayerDialog() {
    const layersInUse = this.status.cad.data.getLayersInUse();
    const data: CadLayerInput = {
      layers: this.status.cad.data.layers,
      layersInUse
    };
    const map1 = new Map<string, boolean>(layersInUse.map((v) => [v.id, v.hidden]));
    const result = await openCadLayerDialog(this.dialog, {data});
    if (result) {
      this.status.cad.data.layers = result.layers;
      const keys = Array.from(map1.keys());
      const map2 = new Map<string, boolean>(result.layers.filter((v) => keys.includes(v.id)).map((v) => [v.id, v.hidden]));
      if (!isEqual(map1, map2)) {
        this.status.cad.render();
      }
    }
  }

  get canOpenKailiaoConfig() {
    return !isShiyitu(this.data);
  }
  async openKailiaoConfig() {
    const cad = this.data;
    const lineGroups = sortLines(cad.entities);
    if (![1, 2].includes(lineGroups.length)) {
      this.message.error("CAD必须分成一段或两段");
      return;
    }
    const result = await openCadKailiaoConfigDialog(this.dialog, {data: {cad}});
    if (result) {
      this.status.openCad({data: result.cad});
    }
  }

  openImportPage() {
    const collection = this.status.collection$.value;
    const cad = this.status.cad.data;
    const yaoqiu = this.status.getCadYaoqiu(cad.type);
    openImportPage(this.status, {collection, yaoqiu});
  }
  openExportPage() {
    const collection = this.status.collection$.value;
    const cad = this.status.cad.data;
    const ids = [cad.id];
    openExportPage(this.status, {collection, ids, direct: true});
  }
  exportCadJson() {
    const cad = this.status.closeCad();
    const content = JSON.stringify([getHoutaiCad(cad)]);
    const filename = `${cad.name}.json`;
    downloadByString(content, {filename});
  }

  cadFentiOn = computed(() => this.status.hasCadStatus((v) => v instanceof CadStatusFentiConfig));
  toggleCadFentiOn() {
    this.status.toggleCadStatus(new CadStatusFentiConfig());
  }
}
