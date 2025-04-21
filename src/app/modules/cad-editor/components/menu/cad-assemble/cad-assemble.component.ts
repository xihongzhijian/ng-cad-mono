import {ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {setGlobal} from "@app/app.common";
import {CadConnection, CadData, CadEntity, CadEventCallBack, CadImage, CadLine, generatePointsMap, PointsMap} from "@lucilor/cad-viewer";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadPoints} from "@services/app-status.types";
import {CadStatusAssemble} from "@services/cad-status";
import {debounce, difference, differenceBy} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";

@Component({
  selector: "app-cad-assemble",
  templateUrl: "./cad-assemble.component.html",
  styleUrls: ["./cad-assemble.component.scss"],
  imports: [MatButtonModule, NgScrollbar],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadAssembleComponent implements OnInit, OnDestroy {
  private config = inject(AppConfigService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  ngOnInit() {
    setGlobal("assemble", this);
    const cad = this.status.cad;
    cad.on("entitiesselect", this._onEntitiesSelect);
    cad.on("entitiesunselect", this._onEntitiesUnselect);
    cad.on("moveentities", this._onMoveEntities);
    cad.on("zoom", this._onZoom);
  }

  ngOnDestroy() {
    const cad = this.status.cad;
    cad.off("entitiesselect", this._onEntitiesSelect);
    cad.off("entitiesunselect", this._onEntitiesUnselect);
  }

  data = this.status.cadData;

  selectedComponents = computed(() => this.status.components.selected());
  unselectedComponents = computed(() => differenceBy(this.data().components.data, this.selectedComponents(), (data) => data.id));

  options = signal<{space: string; position: string}>({space: "0", position: "absolute"});
  ids = signal<string[]>([]);
  names = signal<string[]>([]);
  lines = signal<string[]>([]);
  showPointsAssemble = computed(() => this.status.collection() === "luomatoucad");
  pointsAssembling = signal(0);

  private _prevConfig: Partial<AppConfig> = {};
  private _prevSelectedComponents: CadData[] | null = null;
  private _prevComponentsSelectable: boolean | null = null;

  private _onEntitiesSelect: CadEventCallBack<"entitiesselect"> = (entities, multi) => {
    const cadStatus = this.status.findCadStatus((v) => v instanceof CadStatusAssemble);
    if (!cadStatus) {
      return;
    }
    const cad = this.status.cad;
    const data = this.data();
    const selected = cad.selected().toArray();
    const ids = selected.map((e) => e.id);
    if (multi || (selected.length === 1 && selected[0] instanceof CadImage)) {
      data.components.data.forEach((v) => {
        if (ids.some((id) => v.findEntity(id))) {
          const selectedComponents = this.status.components.selected();
          if (selectedComponents.some((vv) => vv.id === v.id)) {
            this.status.components.selected.set(selectedComponents.filter((vv) => vv.id !== v.id));
          } else {
            this.status.components.selected.set([...selectedComponents, v]);
          }
        }
      });
    } else {
      this._selectEntity(entities.toArray()[0]);
    }
  };

  private _onEntitiesUnselect: CadEventCallBack<"entitiesunselect"> = (entities) => {
    const ids = entities.toArray().map((v) => v.id);
    this.lines.update((lines) => difference(lines, ids));
  };

  private _onMoveEntities: CadEventCallBack<"moveentities"> = debounce(() => {
    if (this.pointsAssembling() > 0) {
      this._setCadPoints();
    }
  }, 500).bind(this);

  private _onZoom: CadEventCallBack<"zoom"> = debounce(() => {
    if (this.pointsAssembling() > 0) {
      this._setCadPoints();
    }
  }, 500).bind(this);

  private _selectEntity = (entity: CadEntity) => {
    const cadStatus = this.status.findCadStatus((v) => v instanceof CadStatusAssemble);
    if (!cadStatus || !entity) {
      return;
    }
    const cad = this.status.cad;
    const data = this.data();
    const dumpComponent = new CadData({id: data.id, name: data.name});
    dumpComponent.entities = data.entities;
    for (const component of [...data.components.data, dumpComponent]) {
      const ids = this.ids();
      const names = this.names();
      const lines = this.lines();
      const found = component.findEntity(entity.id);
      if (found) {
        const prev = ids.findIndex((id) => id === component.id);
        const {space, position} = this.options();
        if (entity.selected) {
          if (position === "absolute") {
            if (prev > -1) {
              const found2 = cad.data.findEntity(lines[prev]);
              if (found2) {
                found2.selected = false;
              }
              lines[prev] = found.id;
            } else {
              ids.push(component.id);
              names.push(component.name);
              lines.push(found.id);
            }
          }
          if (position === "relative") {
            if (prev > -1) {
              if (prev === 0) {
                lines.push(found.id);
                if (lines.length > 2) {
                  lines.shift();
                }
              } else {
                lines[prev] = found.id;
              }
            } else {
              ids.push(component.id);
              names.push(component.name);
              lines.push(found.id);
            }
            lines.forEach((l) => {
              const e = data.findEntity(l);
              if (e) {
                e.selected = true;
              }
            });
          }
          if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
            try {
              data.assembleComponents(new CadConnection({ids, names, lines, space, position}));
              cad.render();
            } catch (error) {
              this.message.alert({content: error});
            } finally {
              ids.length = 0;
              names.length = 0;
              lines.length = 0;
              cad.unselectAll();
            }
          }
        } else if (prev > -1) {
          if (position === "relative") {
            if (prev === 0) {
              const idx = lines.findIndex((l) => l === found.id);
              lines.splice(idx, -1);
              if (lines.length < 1) {
                ids.splice(prev, 1);
              }
            } else {
              ids.splice(prev, 1);
              lines.splice(prev + 1, 1);
            }
          } else {
            ids.splice(prev, 1);
            lines.splice(prev, 1);
          }
        }
        break;
      }
    }
  };

  assembleEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusAssemble,
    () => {
      const cad = this.status.cad;
      this._prevConfig = this.config.setConfig(
        {selectMode: "multiple", entityDraggable: [], hideLineLength: true, hideLineGongshi: true},
        {sync: false}
      );
      this._prevSelectedComponents = this.status.components.selected();
      this.status.components.selected.set([]);
      this._prevComponentsSelectable = this.status.components.selectable();
      this.status.components.selectable.set(true);
      if (this.status.collection() === "CADmuban") {
        const data = cad.data;
        const {top, bottom, left, right} = data.entities.getBoundingRect();
        const y = top - (top - bottom) / 4;
        let hasTop = false;
        let hasBottom = false;
        let hasLeft = false;
        let hasRight = false;
        data.entities.forEach((e) => {
          if (!(e instanceof CadLine) || e.length < 1000) {
            if (e instanceof CadLine && e.minY <= y) {
              return;
            }
            const {top: top2, bottom: bottom2, left: left2, right: right2} = e.boundingRect;
            if (top2 >= top && !hasTop) {
              hasTop = true;
              return;
            }
            if (bottom2 <= bottom && !hasBottom) {
              hasBottom = true;
              return;
            }
            if (left2 <= left && !hasLeft) {
              hasLeft = true;
              return;
            }
            if (right2 >= right && !hasRight) {
              hasRight = true;
              return;
            }
            e.info.prevVisible = e.visible;
            e.visible = false;
            cad.render(e);
          }
        });
      }
    },
    () => {
      const cad = this.status.cad;
      this.config.setConfig(this._prevConfig, {sync: false});
      if (this._prevSelectedComponents !== null) {
        this.status.components.selected.set(this._prevSelectedComponents);
        this._prevSelectedComponents = null;
      }
      if (this._prevComponentsSelectable !== null) {
        this.status.components.selectable.set(this._prevComponentsSelectable);
        this._prevComponentsSelectable = null;
      }
      cad.data.entities.forEach((e) => {
        if (!(e instanceof CadLine) || e.length < 1000) {
          e.visible = e.info.prevVisible ?? true;
          delete e.info.prevVisible;
          cad.render(e);
        }
      });
    }
  );

  componentSelectedEff = effect(() => {
    this.status.components.selected();
    untracked(() => {
      if (this.pointsAssembling() > 0) {
        this._setCadPoints();
      }
    });
  });

  private async _setCadPoints(include?: CadPoints) {
    let cads: CadData[];
    const pointsAssembling = this.pointsAssembling();
    if (pointsAssembling === 1) {
      cads = this.selectedComponents();
    } else if (pointsAssembling === 2) {
      cads = this.unselectedComponents();
    } else {
      return;
    }
    const pointsMap: PointsMap = [];
    for (const cad of cads) {
      pointsMap.push(...generatePointsMap(cad.entities));
    }
    this._cadPointsChangeLock = true;
    this.status.setCadPoints(pointsMap, {include});
  }

  cadPointsChangeEff = effect(() => {
    const points = this.status.cadPoints();
    untracked(() => this._onCadPointsChange(points));
  });
  private _cadPointsChangeLock = false;
  private _onCadPointsChange = async (points: CadPoints) => {
    if (this._cadPointsChangeLock) {
      this._cadPointsChangeLock = false;
      return;
    }
    const active = points.filter((p) => p.active);
    const pointsAssembling = this.pointsAssembling();
    if (active.length === 0) {
      if (pointsAssembling === 2) {
        this.pointsAssembling.set(1);
        this._setCadPoints();
      }
    } else if (active.length === 1) {
      if (pointsAssembling === 1) {
        this.pointsAssembling.set(2);
        this._setCadPoints(active);
      }
    } else if (active.length > 1) {
      const [active1, active2] = active;
      let cad1: CadData | undefined;
      let cad2: CadData | undefined;
      const p1 = this.status.cad.getWorldPoint(active1.x, active1.y);
      const p2 = this.status.cad.getWorldPoint(active2.x, active2.y);
      const data = this.data();
      for (const cad of data.components.data) {
        for (const e of cad.entities.toArray()) {
          if (active1.lines.includes(e.id)) {
            cad1 = cad;
          }
          if (active2.lines.includes(e.id)) {
            cad2 = cad;
          }
        }
        if (cad1 && cad2) {
          break;
        }
      }
      if (!cad1 || !cad2) {
        this.message.error("选择错误");
        return;
      }
      const data2 = {x: 0, y: 0};
      const form: InputInfo<typeof data2>[] = [
        {type: "number", label: "x", model: {key: "x", data: data2}},
        {type: "number", label: "y", model: {key: "y", data: data2}}
      ];
      const result = await this.message.form(form);
      if (result) {
        const rect1 = cad1.getBoundingRect();
        const rect2 = cad2.getBoundingRect();
        const tx = p1.x - p2.x;
        const ty = p1.y - p2.y;
        rect2.transform({translate: [tx, ty]});

        const ids = [cad1.id, cad2.id];
        const names = [cad1.name, cad2.name];
        const position = "absolute";
        const connX = new CadConnection({ids, names, position});
        connX.value = rect1.left - rect2.left - data2.x;
        connX.axis = "x";
        data.assembleComponents(connX);
        const connY = new CadConnection({ids, names, position});
        connY.value = rect1.top - rect2.top - data2.y;
        connY.axis = "y";
        data.assembleComponents(connY);
        this.status.openCad();
      }

      this.pointsAssembling.set(0);
      this.status.setCadPoints();
    }
  };

  clearConnections() {
    const data = this.data();
    data.components.connections = [];
    this.status.openCad();
  }

  removeConnection(index: number) {
    const data = this.data();
    data.components.connections.splice(index, 1);
    this.status.openCad();
  }

  directAssemble() {
    const data = this.data();
    data.components.data.forEach((v) => {
      try {
        data.directAssemble(v);
      } catch (error) {
        this.message.alert({content: error});
      }
    });
    this.status.openCad();
  }

  pointsAssemble() {
    this.pointsAssembling.update((v) => (v === 0 ? 1 : 0));
    if (this.pointsAssembling() > 0) {
      this._setCadPoints();
    } else {
      this._cadPointsChangeLock = true;
      this.status.setCadPoints();
    }
  }
}
