import {ChangeDetectionStrategy, Component, computed, effect, forwardRef, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {toFixed} from "@app/utils/func";
import {environment} from "@env";
import {CadData, CadEntities, CadEventCallBack, CadLineLike, CadViewerConfig} from "@lucilor/cad-viewer";
import {selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {getInputInfoGroup} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusDrawLine} from "@services/cad-status";
import {NgScrollbarModule} from "ngx-scrollbar";
import {
  addCadFentiEntities,
  addCadFentiSeparator,
  CadStatusFentiPairedLines,
  getCadFentiInfo,
  removeCadFentiSeparator
} from "./cad-fenti-config.utils";

@Component({
  selector: "app-cad-fenti-config",
  imports: [forwardRef(() => InputComponent), MatButtonModule, NgScrollbarModule],
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

  pairedLinesList = signal<CadData["分体对应线"]>([]);
  pairedLinesEff = effect(() => {
    const data = this.status.cadData();
    this.pairedLinesList.set(data.分体对应线.slice());
  });
  pairedLinesLineLengths = computed(() => {
    const lengths: string[] = [];
    const l = this.status.cadTotalLength();
    console.log(l);
    const {rawEntities} = getCadFentiInfo(this.status.cad.data);
    for (const item of this.pairedLinesList()) {
      for (const id of item.ids) {
        const entity = rawEntities.find(id);
        if (entity instanceof CadLineLike) {
          lengths.push(toFixed(entity.length, 2));
          break;
        }
      }
    }
    return lengths;
  });
  pairedLinesListInputInfos = computed(() => {
    const index = this.status.findCadStatus((v) => v instanceof CadStatusFentiPairedLines)?.index;
    const list = this.pairedLinesList();
    const lengths = this.pairedLinesLineLengths();
    return list.map((v, i) => {
      const length = lengths[i] ? `(${lengths[i]})` : "";
      const infos: InputInfo[] = [
        {
          type: "string",
          label: "分体对应线" + length,
          value: v.ids.length > 1 ? "已指定" : "未指定",
          selectOnly: true,
          suffixIcons: [
            {
              name: "linear_scale",
              isDefault: true,
              class: i === index ? "accent" : "",
              onClick: () => this.selectPairedLines(i)
            },
            {
              name: "add_circle",
              onClick: () => this.addPairedLines(i + 1)
            },
            {
              name: "remove_circle",
              onClick: () => this.removePairedLines(i)
            }
          ]
        },
        {
          type: "number",
          label: "线长调整",
          value: v.dl,
          onChange: (val) => {
            v.dl = val;
            this.pairedLinesList.set([...list]);
          },
          onClick: () => this.selectPairedLines(i)
        },
        {
          type: "boolean",
          label: "拼接位",
          class: v.isPinjie ? "accent" : "",
          style: {flex: "0 1 75px"},
          value: v.isPinjie,
          onChange: (val) => {
            v.isPinjie = val;
            this.pairedLinesList.set([...list]);
          },
          onClick: () => this.selectPairedLines(i)
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
    hotKeys: CadViewerConfig["hotKeys"];
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

      const hotKeys = viewer.getConfig("hotKeys");
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
        },
        hotKeys
      };
      viewer.on("entitiesselect", this._pairedLinesInfo.onCadEntitiesSelect);
      viewer.on("entitiesunselect", this._pairedLinesInfo.onCadEntitiesUnselect);
      viewer.setConfig("hotKeys", {...hotKeys, unSelectAll: []});
    },
    () => {
      if (this._pairedLinesInfo) {
        const viewer = this.status.cad;
        viewer.off("entitiesselect", this._pairedLinesInfo.onCadEntitiesSelect);
        viewer.off("entitiesunselect", this._pairedLinesInfo.onCadEntitiesUnselect);
        viewer.setConfig("hotKeys", this._pairedLinesInfo.hotKeys);
        this._pairedLinesInfo = null;
        this.status.focus();
      }
    }
  );

  drawFentiLines() {
    this.status.toggleCadStatus(new CadStatusDrawLine(true));
  }
}
