import {Component, computed, HostBinding, HostListener, inject, output} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatMenuModule} from "@angular/material/menu";
import {RouterModule} from "@angular/router";
import {KeyEventItem, onKeyEvent} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {printCads} from "@app/cad/print";
import {isLengthTextSizeSetKey, isShiyitu} from "@app/cad/utils";
import {AboutComponent} from "@components/about/about.component";
import {openBbzhmkgzDialog} from "@components/dialogs/bbzhmkgz/bbzhmkgz.component";
import {openCadLineTiaojianquzhiDialog} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {environment} from "@env";
import {CadArc, CadData, CadDimensionLinear, CadLine, CadMtext, sortLines} from "@lucilor/cad-viewer";
import {Angle, downloadByString, Line, Matrix, MatrixLike, Point, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusAssemble, CadStatusNormal, CadStatusSplit} from "@services/cad-status";
import {openExportPage} from "@views/export/export.utils";
import {openImportPage} from "@views/import/import.utils";
import {isEqual} from "lodash";
import printJS from "print-js";
import {openCadKailiaoConfigDialog} from "../../dialogs/cad-kailiao-config/cad-kailiao-config.component";
import {CadLayerInput, openCadLayerDialog} from "../../dialogs/cad-layer/cad-layer.component";
import {CadStatusFentiConfig} from "../cad-fenti-config/cad-fenti-config.utils";
import {openCadLineForm} from "../cad-line/cad-line.utils";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"],
  imports: [AboutComponent, MatButtonModule, MatDividerModule, MatMenuModule, RouterModule]
})
export class ToolbarComponent {
  private config = inject(AppConfigService);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  focusZhuangpeixinxiOut = output({alias: "focusZhuangpeixinxi"});

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
        this.open("cad");
      }
    },
    {
      key: "2",
      ctrl: true,
      action: () => {
        this.open("CADmuban");
      }
    },
    {
      key: "3",
      ctrl: true,
      action: () => {
        this.open("kailiaocadmuban");
      }
    },
    {
      key: "4",
      ctrl: true,
      action: () => {
        this.open("peijianCad");
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
  data = this.status.cadData;
  openCadOptions = this.status.openCadOptions;
  env = environment;
  collection = this.status.collection;

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
    this.status.saveCad("save");
  }

  private _openLock = false;
  async open(collection: CadCollection) {
    if (this._openLock) {
      return;
    }
    const cad = this.status.cad;
    let checkedItems: string[];
    if (collection === this.status.collection()) {
      checkedItems = [cad.data.id];
    } else {
      checkedItems = [];
    }
    this._openLock = true;
    const result = await openCadListDialog(this.dialog, {
      data: {collection, selectMode: "single", checkedItems, checkedItemsLimit: 1}
    });
    if (result && result.length > 0) {
      this.status.openCad({data: result[0], collection, center: true});
    }
    this._openLock = false;
  }

  private async transform(matrix: MatrixLike, rotateDimension = false) {
    const cad = this.status.cad;
    const seleted = cad.selected();
    const m = new Matrix(matrix);
    const scale = m.scale();
    if (seleted.length) {
      const {x, y} = seleted.getBoundingRect();
      seleted.transform({...matrix, origin: [x, y]}, true);
    } else {
      const t = (data: CadData) => {
        const {x, y} = data.getBoundingRect();
        data.transform({...matrix, origin: [x, y]}, true);
        if (scale[0] * scale[1] < 0) {
          if (data.bancaihoudufangxiang === "gt0") {
            data.bancaihoudufangxiang = "lt0";
          } else if (data.bancaihoudufangxiang === "lt0") {
            data.bancaihoudufangxiang = "gt0";
          }
        }
        if (rotateDimension) {
          data.getAllEntities().dimension.forEach((d) => {
            if (d instanceof CadDimensionLinear) {
              if (d.axis === "x") {
                d.axis = "y";
              } else {
                d.axis = "x";
              }
            }
          });
        }
      };
      const selectedComponents = this.status.components.selected();
      if (selectedComponents.length) {
        selectedComponents.forEach((data) => {
          t(data);
        });
      } else {
        t(cad.data);
      }
    }
    cad.data.updatePartners().updateComponents();
    cad.render();
  }

  flip(vertical: boolean, horizontal: boolean) {
    const scaleX = horizontal ? -1 : 1;
    const scaleY = vertical ? -1 : 1;
    this.transform({scale: [scaleX, scaleY]});
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
    const rotateDimension = Math.round(angle / 90) % 2 !== 0;
    this.transform({rotate: new Angle(angle, "deg").rad}, rotateDimension);
  }

  assembleCads() {
    this.status.toggleCadStatus(new CadStatusAssemble());
  }

  splitCad() {
    this.status.toggleCadStatus(new CadStatusSplit());
  }

  toggleShowDimensions() {
    this.config.setConfig("hideDimensions", !this.config.getConfig("hideDimensions"));
  }

  toggleValidateLines() {
    const value = !this.config.getConfig("validateLines");
    this.config.setConfig("validateLines", value);
    if (value) {
      const result = this.status.validate(false, true);
      result.alertError(this.message);
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

  async printCad() {
    this.spinner.show(this.spinner.defaultLoaderId, {text: "正在打印..."});
    const cad = this.status.cad;
    const data = this.status.closeCad();
    const {url, errors} = await printCads({cads: [data], projectConfig: this.status.projectConfig, config: cad.getConfig()});
    this.spinner.hide(this.spinner.defaultLoaderId);
    if (errors.length > 0) {
      console.warn(errors.join("\n"));
    }
    printJS({printable: url, type: "pdf"});
  }

  async fillet(radius?: number) {
    const cad = this.status.cad;
    const lines = cad.selected().line;
    if (lines.length !== 2) {
      this.message.alert("请先选择且只选择两条线段");
      return;
    }
    const {start: start1, end: end1} = lines[0];
    const {start: start2, end: end2} = lines[1];
    const p1 = new Point(start1.x, start1.y);
    const p2 = new Point(end1.x, end1.y);
    const p3 = new Point(start2.x, start2.y);
    const p4 = new Point(end2.x, end2.y);
    const l1 = new Line(p1.clone(), p2.clone());
    const l2 = new Line(p3.clone(), p4.clone());
    let point = l1.intersects(l2, true).at(0);
    let center: Point;
    let startAngle: number;
    let endAngle: number;
    let clockwise: boolean;
    if (!point) {
      radius = l1.distanceTo(l2) / 2;
      if (radius <= 0) {
        this.message.alert("两直线平行且距离为0");
        return;
      }
      let l3: Line;
      let l4: Line;
      let reverse: number;
      if (l1.theta.equals(l2.theta)) {
        l3 = l1.clone().transform({rotate: Math.PI / 2, origin: l1.start});
        l4 = l1.clone().transform({rotate: Math.PI / 2, origin: l1.end});
        const p5 = l3.intersects(l2, true).at(0);
        if (p5) {
          l3.end.copy(p5);
        }
        l4.reverse();
        const p6 = l4.intersects(l2, true).at(0);
        if (p6) {
          l4.end.copy(p6);
        }
        reverse = 1;
      } else {
        l3 = l1.clone().transform({rotate: Math.PI / 2, origin: l1.end});
        l4 = l1.clone().transform({rotate: Math.PI / 2, origin: l1.start});
        l3.reverse();
        const p5 = l3.intersects(l2, true).at(0);
        if (p5) {
          l3.end.copy(p5);
        }
        const p6 = l4.intersects(l2, true).at(0);
        if (p6) {
          l4.end.copy(p6);
        }
        reverse = -1;
      }
      const d1 = l3.end.distanceTo(l2.start);
      const d2 = l4.end.distanceTo(l2.end);
      if (d1 < d2) {
        center = l3.middle;
        point = l3.end;
        lines[1].start.set(point.x, point.y);
        clockwise = l1.crossProduct(l3) * reverse > 0;
      } else {
        center = l4.middle;
        point = l4.end;
        lines[1].end.set(point.x, point.y);
        clockwise = l1.crossProduct(l4) * reverse < 0;
      }
      endAngle = new Line(center, point).theta.deg;
      startAngle = endAngle - 180;
    } else {
      if (radius === undefined) {
        radius = await this.message.prompt<number>({
          type: "number",
          label: "圆角半径",
          validators: [Validators.required, Validators.min(0)]
        });
        if (typeof radius !== "number") {
          return;
        }
      }
      l1.start.copy(point);
      l2.start.copy(point);
      if (p1.distanceTo(point) > p2.distanceTo(point)) {
        l1.end.copy(p1);
      }
      if (p3.distanceTo(point) > p4.distanceTo(point)) {
        l2.end.copy(p3);
      }
      const theta1 = l1.theta.rad;
      const theta2 = l2.theta.rad;
      const theta3 = Math.abs(theta2 - theta1) / 2;
      let theta4 = (theta1 + theta2) / 2;
      if (theta3 > Math.PI / 2) {
        theta4 -= Math.PI;
      }
      clockwise = l1.crossProduct(l2) > 0;
      const d1 = Math.abs(radius / Math.tan(theta3));
      const d2 = Math.abs(radius / Math.sin(theta4));
      const startPoint = new Point(Math.cos(theta1), Math.sin(theta1)).multiply(d1).add(point);
      const endPoint = new Point(Math.cos(theta2), Math.sin(theta2)).multiply(d1).add(point);
      if (!l1.contains(startPoint) || !l2.contains(endPoint)) {
        this.message.alert("半径过大");
        return;
      }
      center = new Point(Math.cos(theta4), Math.sin(theta4)).multiply(d2).add(point);
      if (p1.distanceTo(point) < p2.distanceTo(point)) {
        lines[0].start.set(startPoint.x, startPoint.y);
      } else {
        lines[0].end.set(startPoint.x, startPoint.y);
      }
      if (p3.distanceTo(point) < p4.distanceTo(point)) {
        lines[1].start.set(endPoint.x, endPoint.y);
      } else {
        lines[1].end.set(endPoint.x, endPoint.y);
      }
      startAngle = new Line(center, startPoint).theta.deg;
      endAngle = new Line(center, endPoint).theta.deg;
    }
    if (radius > 0) {
      const cadArc = new CadArc({center: center.toArray(), radius, color: lines[0].getColor()});
      cadArc.start_angle = startAngle;
      cadArc.end_angle = endAngle;
      cadArc.clockwise = clockwise;
      this.status.cad.data.entities.add(cadArc);
    }
    this.status.validate();
    await cad.unselectAll().render();
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
    this.status.openCad({data: new CadData({name: "新建CAD"}), center: true});
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
    const data = this.data();
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
    await openCadLineForm(this.status.collection(), this.status, this.message, this.status.cad, line, null);
  }

  async editBbzhmkgz() {
    const data = this.data();
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
    const data = this.data();
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
    const collection = this.status.collection();
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
    const data = this.data();
    if (await this.message.confirm(`确定要删除吗？`)) {
      const collection = this.status.collection();
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

  canOpenKailiaoConfig = computed(() => {
    return !isShiyitu(this.data());
  });
  async openKailiaoConfig() {
    const cad = this.data();
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
    const collection = this.status.collection();
    const cad = this.data();
    const yaoqiu = this.status.getCadYaoqiu(cad.type);
    openImportPage(this.status, {collection, yaoqiu});
  }
  openExportPage() {
    const collection = this.status.collection();
    const cad = this.data();
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

  async searchCadsUsingMuban() {
    return await openCadListDialog(this.dialog, {data: {collection: "cad", selectMode: "none", search: {模板: this.status.cad.data.id}}});
  }

  focusZhuangpeixinxi() {
    this.focusZhuangpeixinxiOut.emit();
  }
}
