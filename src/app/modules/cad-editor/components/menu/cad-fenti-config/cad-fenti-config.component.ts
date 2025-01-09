import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {environment} from "@env";
import {CadEntities, CadEventCallBack} from "@lucilor/cad-viewer";
import {selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CadPoints} from "@services/app-status.types";
import {CadStatusDrawLine} from "@services/cad-status";
import {cloneDeep, isEqual} from "lodash";
import {addCadFentiEntities, addCadFentiSeparator, getCadFentiInfo, removeCadFentiSeparator} from "./cad-fenti-config.utils";

@Component({
  selector: "app-cad-fenti-config",
  imports: [forwardRef(() => InputComponent), MatButtonModule],
  templateUrl: "./cad-fenti-config.component.html",
  styleUrl: "./cad-fenti-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadFentiConfigComponent implements OnInit, OnDestroy {
  http = inject(CadDataService);
  message = inject(MessageService);
  status = inject(AppStatusService);

  prod = environment.production;

  private _onCadZoom = () => {
    this.updateCadPoints();
  };
  private _onCadMoveEntities = () => {
    this.updateCadPoints();
  };
  async ngOnInit() {
    const result = await addCadFentiSeparator(this.status.cad);
    await result.check(this.message);
    this.status.cad.on("zoom", this._onCadZoom);
    this.status.cad.on("moveentities", this._onCadMoveEntities);
  }
  async ngOnDestroy() {
    const result = await removeCadFentiSeparator(this.status.cad);
    await result.check(this.message);
    this.status.cad.off("zoom", this._onCadZoom);
    this.status.cad.off("moveentities", this._onCadMoveEntities);
  }

  async copyFenti() {
    const entities = this.status.cad.selected();
    const result = await addCadFentiEntities(this.status.cad, entities, "没有选中线");
    await result.check(this.message);
  }

  async uploadFenti() {
    const files = await selectFiles({accept: ".dxf"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const data = await this.http.uploadDxf(file);
    if (!data) {
      return;
    }
    const result = await addCadFentiEntities(this.status.cad, data.entities, "上传文件没有线");
    await result.check(this.message);
  }

  emptyFenti() {
    const info = getCadFentiInfo(this.status.cad.data);
    const viewer = this.status.cad;
    viewer.remove(info.fentiEntities);
  }

  settingPinjieLoc = signal<{points: CadPoints} | null>(null);
  toggleSettingPinjieLoc() {
    this.settingPinjieLoc.update((v) => (v ? null : {points: []}));
  }
  updateCadPointsEff = effect(() => {
    if (this.settingPinjieLoc()) {
      untracked(() => this.updateCadPoints());
    } else {
      this.status.cadPoints.set([]);
    }
  });
  updateCadPoints(lock?: boolean) {
    const settingPinjieLoc = this.settingPinjieLoc();
    if (!settingPinjieLoc) {
      return;
    }
    const data = this.status.cad.data;
    const idGroups = data.分体拼接位置;
    const {rawEntities, fentiEntities} = getCadFentiInfo(data);
    if (fentiEntities.length < 1) {
      this.message.alert("没有分体线");
      this.settingPinjieLoc.set(null);
      return;
    }
    const allEntities = new CadEntities();
    allEntities.merge(rawEntities).merge(fentiEntities);
    const points = this.status.getCadPoints(allEntities);
    for (const point of points) {
      const active = idGroups.some((v) => isEqual(new Set(v), new Set(point.lines)));
      point.active = active;
    }
    if (lock) {
      this._cadPointChangeLock = true;
    }
    this.status.cadPoints.set(points);
  }
  private _cadPointChangeLock = false;
  cadPointChangeEff = effect(() => {
    const points = this.status.cadPoints().filter((v) => v.active);
    const settingPinjieLoc = untracked(() => this.settingPinjieLoc());
    if (!settingPinjieLoc) {
      return;
    }
    if (this._cadPointChangeLock) {
      this._cadPointChangeLock = false;
      return;
    }
    const data = this.status.cad.data;
    const {rawEntities, fentiEntities} = getCadFentiInfo(data);
    const rawPoints: CadPoints = [];
    const fentiPoints: CadPoints = [];
    const 分体拼接位置 = cloneDeep(data.分体拼接位置);
    const getPointOrder = (p: CadPoints[number]) => {
      const isSelected = 分体拼接位置.some((v) => isEqual(new Set(v), new Set(p.lines)));
      return isSelected ? 0 : 1;
    };
    points.sort((a, b) => getPointOrder(a) - getPointOrder(b));
    for (const point of points) {
      const lines = point.lines;
      const isInRaw = rawEntities.filter((e) => point.lines.includes(e.id)).length === lines.length;
      const isInFenti = fentiEntities.filter((e) => point.lines.includes(e.id)).length === lines.length;
      if (isInRaw) {
        rawPoints.push(point);
      } else if (isInFenti) {
        fentiPoints.push(point);
      }
    }
    data.分体拼接位置 = [];
    const setActive = (points: CadPoints) => {
      for (const [i, point] of points.entries()) {
        point.active = i === points.length - 1;
        if (point.active) {
          data.分体拼接位置.push(point.lines);
        }
      }
    };
    if (rawPoints.length > 0) {
      setActive(rawPoints);
    }
    if (fentiPoints.length > 0) {
      setActive(fentiPoints);
    }
    if (!isEqual(分体拼接位置, data.分体拼接位置)) {
      this.updateCadPoints(true);
    }
  });

  pairedLinesList = signal(this.status.cad.data.分体对应线);
  pairedLinesEff = effect(() => {
    const data = this.status.cadData();
    this.pairedLinesList.set(data.分体对应线);
  });
  pairedLinesIdx = signal(-1);
  pairedLinesListInputInfos = computed(() => {
    const pairedLineGroupIdx = this.pairedLinesIdx();
    const list = this.pairedLinesList();
    return list.map((v, i) => {
      const info: InputInfo = {
        type: "string",
        label: "分体对应线",
        value: v.length > 1 ? "已指定" : "未指定",
        selectOnly: true,
        suffixIcons: [
          {
            name: "linear_scale",
            isDefault: true,
            color: i === pairedLineGroupIdx ? "accent" : "primary",
            onClick: () => this.selectPairedLines(i)
          },
          {
            name: "add_circle",
            color: "primary",
            onClick: () => this.addPairedLines(i + 1)
          },
          {
            name: "remove_circle",
            color: "primary",
            onClick: () => this.removePairedLines(i)
          }
        ],
        style: {width: "100%"}
      };
      return info;
    });
  });
  addPairedLines(i?: number) {
    const pairedLinesList = this.pairedLinesList().slice();
    if (typeof i === "number") {
      pairedLinesList.splice(i, 0, []);
    } else {
      pairedLinesList.push([]);
    }
    this.status.cad.data.分体对应线 = pairedLinesList;
    this.pairedLinesList.set(pairedLinesList);
  }
  removePairedLines(i: number) {
    const pairedLinesList = this.pairedLinesList().slice();
    pairedLinesList.splice(i, 1);
    this.status.cad.data.分体对应线 = pairedLinesList;
    this.pairedLinesList.set(pairedLinesList);
  }
  private _onSelectpairedLines: CadEventCallBack<"entitiesselect"> | null = null;
  selectPairedLines(i: number) {
    const viewer = this.status.cad;
    if (this.pairedLinesIdx() === i) {
      this.pairedLinesIdx.set(-1);
      if (this._onSelectpairedLines) {
        viewer.off("entitiesselect", this._onSelectpairedLines);
        this.status.focus();
      }
      return;
    }
    this.pairedLinesIdx.set(i);
    const info = getCadFentiInfo(viewer.data);
    const {rawEntities, fentiEntities} = info;
    const pairedLinesList = this.pairedLinesList();
    let pairedLinesPrev = pairedLinesList[i];
    const rawIds: string[] = [];
    const fentiIds: string[] = [];
    viewer.unselectAll();

    const setLines = (lines: typeof pairedLinesPrev) => {
      const toFocus = new CadEntities();
      const toBlur = new CadEntities();
      toFocus.merge(rawEntities).merge(fentiEntities);
      viewer.data.entities.forEach((e) => {
        if (!toFocus.find((e2) => e.id === e2.id)) {
          toBlur.add(e);
        }
      });
      this.status.focus(toFocus, {
        selected: (e) => lines.some((v) => v.includes(e.id))
      });
      this.status.blur(toBlur);
    };
    setLines(pairedLinesPrev);

    this._onSelectpairedLines = (entities) => {
      const rawSelected: string[] = [];
      const fentiSelected: string[] = [];
      const rawSelectedPrev: string[] = [];
      const fentiSelectedPrev: string[] = [];
      rawEntities.forEach((e) => {
        rawIds.push(e.id);
        if (pairedLinesPrev.includes(e.id)) {
          rawSelectedPrev.push(e.id);
        }
      }, true);
      fentiEntities.forEach((e) => {
        fentiIds.push(e.id);
        if (pairedLinesPrev.includes(e.id)) {
          fentiSelectedPrev.push(e.id);
        }
      }, true);
      entities.forEach((e) => {
        if (rawIds.includes(e.id) && !rawSelectedPrev.includes(e.id)) {
          rawSelected.push(e.id);
        } else if (fentiIds.includes(e.id) && !rawSelectedPrev.includes(e.id)) {
          fentiSelected.push(e.id);
        }
      });
      const pairedLines: typeof pairedLinesPrev = [];
      if (rawSelected.length > 0) {
        pairedLines.push(rawSelected[0]);
      } else if (rawSelectedPrev.length > 0) {
        pairedLines.push(rawSelectedPrev[0]);
      }
      if (fentiSelected.length > 0) {
        pairedLines.push(fentiSelected[0]);
      } else if (fentiSelectedPrev.length > 0) {
        pairedLines.push(fentiSelectedPrev[0]);
      }
      pairedLinesList[i] = pairedLines;
      this.status.cad.data.分体对应线 = pairedLinesList;
      this.pairedLinesList.set([...pairedLinesList]);
      setLines(pairedLines);
      pairedLinesPrev = pairedLines;
    };
    viewer.on("entitiesselect", this._onSelectpairedLines);
  }

  drawFentiLines() {
    this.status.toggleCadStatus(new CadStatusDrawLine(true));
  }
}
