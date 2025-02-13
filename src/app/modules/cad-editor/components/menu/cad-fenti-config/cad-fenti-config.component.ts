import {ChangeDetectionStrategy, Component, computed, effect, forwardRef, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {environment} from "@env";
import {CadData, CadEntities, CadEventCallBack} from "@lucilor/cad-viewer";
import {selectFiles, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {getInputInfoGroup} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CadPoints} from "@services/app-status.types";
import {CadStatusDrawLine} from "@services/cad-status";
import {isEqual} from "lodash";
import {
  addCadFentiEntities,
  addCadFentiSeparator,
  CadStatusFentiPairedLines,
  CadStatusFentiPinjieLoc,
  getCadFentiInfo,
  removeCadFentiSeparator
} from "./cad-fenti-config.utils";

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

  async ngOnInit() {
    const result = await addCadFentiSeparator(this.status.cad);
    await result.check(this.message);
  }
  async ngOnDestroy() {
    const result = await removeCadFentiSeparator(this.status.cad);
    await result.check(this.message);
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

  pinjieLocs = signal<CadData["分体拼接位置"]>([]);
  pinjieLocsEff = effect(() => {
    const data = this.status.cadData();
    const n = 2 - data.分体拼接位置.length;
    for (let i = 0; i < n; i++) {
      data.分体拼接位置.push([]);
    }
    this.pinjieLocs.set(data.分体拼接位置.slice());
  });
  private _isSelectingPinjieLoc = false;
  pinjieLocsInputInfos = computed(() => {
    const index = this.status.findCadStatus((v) => v instanceof CadStatusFentiPinjieLoc)?.index;
    const list = this.pinjieLocs();
    return list.map((v, i) => {
      const info: InputInfo = {
        type: "string",
        label: "分体拼接位置",
        value: v.length > 1 ? "已指定" : "未指定",
        selectOnly: true,
        suffixIcons: [
          {
            name: "linear_scale",
            isDefault: true,
            color: i === index ? "accent" : "primary",
            onClick: () => this.selectPinjieLoc(i)
          }
        ],
        style: {width: "100%"}
      };
      return info;
    });
  });

  async selectPinjieLoc(i: number) {
    this.status.toggleCadStatus(new CadStatusFentiPinjieLoc(i));
  }
  private _pinjieLocInfo: {
    onCadZoom: CadEventCallBack<"zoom">;
    onCadMoveEntities: CadEventCallBack<"moveentities">;
  } | null = null;
  updatePinjieLocPoints(cadStatus: CadStatusFentiPinjieLoc) {
    const data = this.status.cad.data;
    const idGroups = this.pinjieLocs()[cadStatus.index];
    const {rawEntities, fentiEntities} = getCadFentiInfo(data);
    if (fentiEntities.length < 1) {
      this.message.alert("没有分体线");
      this.status.toggleCadStatus(cadStatus);
      return;
    }
    const allEntities = new CadEntities();
    allEntities.merge(rawEntities).merge(fentiEntities);
    const points = this.status.getCadPoints(allEntities);
    for (const point of points) {
      const active = idGroups.some((v) => isEqual(new Set(v), new Set(point.lines)));
      point.active = active;
    }
    this.status.cadPoints.set(points);
  }
  pinjieLocStatusEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusFentiPinjieLoc,
    async (cadStatus) => {
      this.updatePinjieLocPoints(cadStatus);
      await timeout(0);
      this._isSelectingPinjieLoc = true;
      this._pinjieLocInfo = {
        onCadZoom: () => this.updatePinjieLocPoints(cadStatus),
        onCadMoveEntities: () => this.updatePinjieLocPoints(cadStatus)
      };
      const viewer = this.status.cad;
      viewer.on("zoom", this._pinjieLocInfo.onCadZoom);
      viewer.on("moveentities", this._pinjieLocInfo.onCadMoveEntities);
    },
    async () => {
      this._isSelectingPinjieLoc = false;
      await timeout(0);
      this.status.cadPoints.set([]);
      if (this._pinjieLocInfo) {
        const viewer = this.status.cad;
        viewer.off("zoom", this._pinjieLocInfo.onCadZoom);
        viewer.off("moveentities", this._pinjieLocInfo.onCadMoveEntities);
        this._pinjieLocInfo = null;
      }
    }
  );
  private _pinjieLocCadPointsLock = false;
  pinjieLocCadPointsEff = effect(async () => {
    const cadStatus = this.status.findCadStatus((v) => v instanceof CadStatusFentiPinjieLoc);
    if (!cadStatus) {
      return;
    }
    const points = this.status.cadPoints().filter((v) => v.active);
    if (!this._isSelectingPinjieLoc || this._pinjieLocCadPointsLock) {
      return;
    }
    const data = this.status.cad.data;
    const 分体拼接位置Old = data.分体拼接位置?.[cadStatus.index];
    if (!分体拼接位置Old) {
      return;
    }
    const 分体拼接位置New: typeof 分体拼接位置Old = [];
    const getPointOrder = (p: CadPoints[number]) => {
      const isSelected = 分体拼接位置Old.some((v) => isEqual(new Set(v), new Set(p.lines)));
      return isSelected ? 0 : 1;
    };
    points.sort((a, b) => getPointOrder(a) - getPointOrder(b));
    const {rawEntities, fentiEntities} = getCadFentiInfo(data);
    const rawPoints: CadPoints = [];
    const fentiPoints: CadPoints = [];
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
    const setActive = (points2: CadPoints) => {
      for (const [i, point] of points2.entries()) {
        point.active = i === points2.length - 1;
        if (point.active) {
          分体拼接位置New.push(point.lines);
        }
      }
    };
    if (rawPoints.length > 0) {
      setActive(rawPoints);
    }
    if (fentiPoints.length > 0) {
      setActive(fentiPoints);
    }
    if (!isEqual(分体拼接位置Old, 分体拼接位置New)) {
      data.分体拼接位置[cadStatus.index] = 分体拼接位置New;
      this.pinjieLocs.set(data.分体拼接位置.slice());
      this._pinjieLocCadPointsLock = true;
      await timeout(0);
      this._pinjieLocCadPointsLock = false;
    }
  });

  pairedLinesList = signal<CadData["分体对应线"]>([]);
  pairedLinesEff = effect(() => {
    const data = this.status.cadData();
    this.pairedLinesList.set(data.分体对应线.slice());
  });
  pairedLinesListInputInfos = computed(() => {
    const index = this.status.findCadStatus((v) => v instanceof CadStatusFentiPairedLines)?.index;
    const list = this.pairedLinesList();
    return list.map((v, i) => {
      const infos: InputInfo[] = [
        {
          type: "string",
          label: "分体对应线",
          value: v.ids.length > 1 ? "已指定" : "未指定",
          selectOnly: true,
          suffixIcons: [
            {
              name: "linear_scale",
              isDefault: true,
              color: i === index ? "accent" : "primary",
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
          ]
        },
        {
          type: "number",
          label: "分体变化线长",
          value: v.dl,
          onChange: (val) => {
            v.dl = val;
            this.pairedLinesList.set([...list]);
          }
        }
      ];
      return getInputInfoGroup(infos, {style: {width: "100%"}});
    });
  });
  addPairedLines(i?: number) {
    const pairedLinesList = this.pairedLinesList().slice();
    const item: (typeof pairedLinesList)[number] = {ids: [], dl: 0};
    if (typeof i === "number") {
      pairedLinesList.splice(i, 0, item);
    } else {
      pairedLinesList.push(item);
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
  private _pairedLinesInfo: {
    onCadEntitiesSelect: CadEventCallBack<"entitiesselect">;
    onCadEntitiesUnselect: CadEventCallBack<"entitiesunselect">;
  } | null = null;
  selectPairedLines(i: number) {
    this.status.toggleCadStatus(new CadStatusFentiPairedLines(i));
  }
  pairedLinesStatusEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusFentiPairedLines,
    (cadStatus) => {
      const viewer = this.status.cad;
      const info = getCadFentiInfo(viewer.data);
      const {rawEntities, fentiEntities} = info;
      let pairedLinesList = this.pairedLinesList().slice();
      let pairedLineIdsPrev = pairedLinesList[cadStatus.index].ids;
      const rawIds: string[] = [];
      const fentiIds: string[] = [];
      viewer.unselectAll();

      const setLines = (lines: typeof pairedLineIdsPrev) => {
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
      setLines(pairedLineIdsPrev);

      const updateLines = (lines: typeof pairedLineIdsPrev) => {
        pairedLinesList[cadStatus.index].ids = lines;
        pairedLinesList = [...pairedLinesList];
        this.status.cad.data.分体对应线 = pairedLinesList;
        this.pairedLinesList.set(pairedLinesList);
        setLines(lines);
        pairedLineIdsPrev = lines;
      };

      this._pairedLinesInfo = {
        onCadEntitiesSelect: (entities) => {
          const rawSelected: string[] = [];
          const fentiSelected: string[] = [];
          const rawSelectedPrev: string[] = [];
          const fentiSelectedPrev: string[] = [];
          rawEntities.forEach((e) => {
            rawIds.push(e.id);
            if (pairedLineIdsPrev.includes(e.id)) {
              rawSelectedPrev.push(e.id);
            }
          }, true);
          fentiEntities.forEach((e) => {
            fentiIds.push(e.id);
            if (pairedLineIdsPrev.includes(e.id)) {
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
          const pairedLines: typeof pairedLineIdsPrev = [];
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
          updateLines(pairedLines);
        },
        onCadEntitiesUnselect: (entities) => {
          const pairedLines = pairedLineIdsPrev.filter((v) => !entities.find((e) => e.id === v));
          updateLines(pairedLines);
        }
      };
      viewer.on("entitiesselect", this._pairedLinesInfo.onCadEntitiesSelect);
      viewer.on("entitiesunselect", this._pairedLinesInfo.onCadEntitiesUnselect);
    },
    () => {
      if (this._pairedLinesInfo) {
        const viewer = this.status.cad;
        viewer.off("entitiesselect", this._pairedLinesInfo.onCadEntitiesSelect);
        viewer.off("entitiesunselect", this._pairedLinesInfo.onCadEntitiesUnselect);
        this._pairedLinesInfo = null;
        this.status.focus();
      }
    }
  );

  drawFentiLines() {
    this.status.toggleCadStatus(new CadStatusDrawLine(true));
  }
}
