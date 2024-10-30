import {ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {reservedDimNames} from "@app/cad/utils";
import {
  CadData,
  CadDimension,
  CadDimensionEntity,
  CadDimensionLinear,
  CadDimensionType,
  CadEntities,
  CadEntity,
  CadEventCallBack,
  CadLine,
  CadLineLike
} from "@lucilor/cad-viewer";
import {isNearZero} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusEditDimension, CadStatusNormal} from "@services/cad-status";
import {debounce} from "lodash";
import {openCadDimensionFormDialog} from "../../dialogs/cad-dimension-form/cad-dimension-form.component";

@Component({
  selector: "app-cad-dimension",
  templateUrl: "./cad-dimension.component.html",
  styleUrls: ["./cad-dimension.component.scss"],
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadDimensionComponent extends Subscribed() implements OnInit, OnDestroy {
  private config = inject(AppConfigService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  dimNameFocus = signal(-1);
  dimLineSelecting = signal(-1);
  dimensions = signal<CadDimension[]>([]);

  constructor() {
    super();
  }

  ngOnInit() {
    let prevConfig: Partial<AppConfig> = {};
    let prevSelectedComponents: CadData[] | null = null;
    let prevComponentsSelectable: boolean | null = null;
    let prevSelectedEntities: CadEntities | null = null;
    this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
      if (cadStatus instanceof CadStatusEditDimension) {
        const index = cadStatus.index;
        const dimension = this.dimensions()[index];
        prevSelectedEntities = this.status.cad.selected();
        this.dimLineSelecting.set(index);
        prevConfig = this.config.setConfig({hideLineLength: true, lineGongshi: 0, selectMode: "single"}, {sync: false});
        prevSelectedComponents = this.status.components.selected$.value;
        this.status.components.selected$.next([]);
        prevComponentsSelectable = this.status.components.selectable$.value;
        this.status.components.selectable$.next(false);
        this.focus(dimension);
      }
    });
    this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
      if (cadStatus instanceof CadStatusEditDimension) {
        this.dimLineSelecting.set(-1);
        this.config.setConfig(prevConfig, {sync: false});
        if (prevSelectedComponents !== null) {
          this.status.components.selected$.next(prevSelectedComponents);
          prevSelectedComponents = null;
        }
        if (prevComponentsSelectable !== null) {
          this.status.components.selectable$.next(prevComponentsSelectable);
          prevComponentsSelectable = null;
        }
        this.blur();
        if (prevSelectedEntities) {
          this.status.cad.select(prevSelectedEntities);
          prevSelectedEntities = null;
        }
      }
    });
    this.subscribe(this.status.openCad$, () => {
      this._updateDimensions();
    });

    const cad = this.status.cad;
    cad.on("entitiesselect", this._onEntitiesSelect);
    cad.on("entitiesunselect", this._onEntitiesUnselect);
    cad.on("entitiesadd", this._updateDimensions);
    cad.on("entitiesremove", this._updateDimensions);
    cad.on("zoom", this._onZoom);
    cad.on("moveentities", this._onMoveEntities);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    const cad = this.status.cad;
    cad.off("entitiesselect", this._onEntitiesSelect);
    cad.off("entitiesunselect", this._onEntitiesUnselect);
    cad.off("entitiesadd", this._updateDimensions);
    cad.off("entitiesremove", this._updateDimensions);
    cad.off("zoom", this._onZoom);
    cad.off("moveentities", this._onMoveEntities);
  }

  private _onEntitiesSelect: CadEventCallBack<"entitiesselect"> = (entities, _, event) => {
    const cad = this.status.cad;
    const data = cad.data;
    const cadStatus = this.status.cadStatus;
    const dimensions = this.dimensions();
    const entity = entities.line[0];
    let newIndex = -1;
    if (cadStatus instanceof CadStatusEditDimension && !cadStatus.exitInProgress && entity) {
      const dimension = dimensions[cadStatus.index];
      if (cadStatus.type === "linear") {
        let dimensionLinear: CadDimensionLinear | undefined;
        if (dimension instanceof CadDimensionLinear) {
          dimensionLinear = dimension;
        } else {
          dimensionLinear = new CadDimensionLinear();
          dimensionLinear.setStyle({text: {size: 36}});
          dimensionLinear.setColor(0x00ff00);
          data.entities.add(dimensionLinear);
          newIndex = data.entities.dimension.length - 1;
        }

        let location: CadDimensionEntity["location"];
        const getOppositeLocation = (location: CadDimensionEntity["location"]) => (location === "start" ? "end" : "start");
        if (event) {
          const point = cad.getWorldPoint(event.clientX, event.clientY);
          const distanceStart = entity.start.distanceTo(point);
          const distanceEnd = entity.end.distanceTo(point);
          location = distanceStart < distanceEnd ? "start" : "end";
          if (entity.swapped) {
            location = getOppositeLocation(location);
          }
        } else {
          location = "start";
        }
        if (!dimensionLinear.entity1.id) {
          if (dimensionLinear.entity2.id && dimensionLinear.entity2.location === location) {
            location = getOppositeLocation(location);
          }
          dimensionLinear.entity1 = {id: entity.id, location};
          dimensionLinear.cad1 = data.name;
        } else if (!dimensionLinear.entity2.id) {
          if (dimensionLinear.entity1.id && dimensionLinear.entity1.location === location) {
            location = getOppositeLocation(location);
          }
          dimensionLinear.entity2 = {id: entity.id, location};
          dimensionLinear.cad2 = data.name;
        } else {
          const isEntity1 = dimensionLinear.entity1.id === entity.id;
          const isEntity2 = dimensionLinear.entity2.id === entity.id;
          if (isEntity1 && !isEntity2) {
            dimensionLinear.entity2.id = entity.id;
            dimensionLinear.entity2.location = getOppositeLocation(dimensionLinear.entity1.location);
          } else if (!isEntity1 && isEntity2) {
            dimensionLinear.entity1.id = entity.id;
            dimensionLinear.entity1.location = getOppositeLocation(dimensionLinear.entity2.location);
          } else if (!isEntity1 && !isEntity2) {
            dimensionLinear.entity1 = dimensionLinear.entity2;
            dimensionLinear.entity2 = {id: entity.id, location};
          }
          // if (dimensionLinear.entity1.id === dimensionLinear.entity2.id) {
          //   if (dimensionLinear.entity1.location === "start") {
          //     dimensionLinear.entity2.location = "end";
          //   } else if (dimensionLinear.entity1.location === "end") {
          //     dimensionLinear.entity2.location = "start";
          //   } else {
          //     dimensionLinear.entity1.location = "start";
          //     dimensionLinear.entity2.location = "end";
          //   }
          // }
          dimensionLinear.cad2 = data.name;
        }
        const e1 = cad.data.findEntity(dimensionLinear.entity1.id);
        const e2 = cad.data.findEntity(dimensionLinear.entity2.id);
        if (e1 instanceof CadLineLike && e2 instanceof CadLineLike) {
          let points = cad.data.getDimensionPoints(dimension);
          if (points.length === 4) {
            let isX0 = isNearZero(points[0].x - points[1].x);
            let isY0 = isNearZero(points[0].y - points[1].y);
            if (isX0 && isY0) {
              if (dimensionLinear.entity2.location === "start") {
                dimensionLinear.entity2.location = "end";
              } else if (dimensionLinear.entity2.location === "end") {
                dimensionLinear.entity2.location = "start";
              }
            }
            points = cad.data.getDimensionPoints(dimension);
            isX0 = isNearZero(points[0].x - points[1].x);
            isY0 = isNearZero(points[0].y - points[1].y);
            if (dimensionLinear.axis === "x" && isX0) {
              dimensionLinear.axis = "y";
            } else if (dimensionLinear.axis === "y" && isY0) {
              dimensionLinear.axis = "x";
            }
          }
        }
      }
      if (dimension) {
        this.focus(dimension);
        cad.render(dimension);
        this._updateDimensions();
      } else if (newIndex >= 0) {
        this._updateDimensions();
        this.status.setCadStatus(new CadStatusEditDimension("linear", newIndex));
      }
    } else {
      this._updateDimensions();
    }
  };
  private _onEntitiesUnselect: CadEventCallBack<"entitiesunselect"> = () => {
    this._updateDimensions();
  };
  private _updateDimensions = () => {
    this.dimensions.set(this.status.cad.data.getAllEntities().dimension.slice());
  };
  private _onZoom: CadEventCallBack<"zoom"> = () => {
    this._highlightDimensions();
  };
  private _onMoveEntities: CadEventCallBack<"moveentities"> = () => {
    this._highlightDimensions();
  };
  private _highlightDimensions() {
    const cadStatus = this.status.cadStatus;
    if (!(cadStatus instanceof CadStatusEditDimension)) {
      return;
    }
    const dimension = this.dimensions()[cadStatus.index];
    if (dimension) {
      this.status.highlightDimensions([dimension]);
    }
  }

  async editDimension(i: number) {
    const dimensions = this.dimensions();
    const dimension = dimensions[i];
    if (dimension instanceof CadDimensionLinear) {
      const dimension2 = await openCadDimensionFormDialog(this.dialog, {data: {data: dimension}, disableClose: true});
      if (dimension2) {
        await this.status.cad.render(dimension2);
        this.status.highlightDimensions([dimension2]);
      }
    }
  }

  getDimensionName(dimension: CadDimension, index: number) {
    if (this.dimNameFocus() === index) {
      return dimension.mingzi || "";
    } else {
      return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
    }
  }

  setDimensionName = debounce((event: Event, dimension: CadDimension) => {
    const str = (event.target as HTMLInputElement).value;
    if (reservedDimNames.includes(str)) {
      this.message.alert(`标注名字不能是: ${str}`);
      return;
    }
    dimension.mingzi = str;
    this.status.cad.render(dimension);
  }, 500);

  isSelectingDimLine(i: number) {
    const cadStatus = this.status.cadStatus;
    return cadStatus instanceof CadStatusEditDimension && cadStatus.index === i;
  }

  async selectDimLine(i: number, type?: CadDimensionType) {
    const cadStatus = this.status.cadStatus;
    if (cadStatus instanceof CadStatusEditDimension && cadStatus.index === i) {
      this.status.setCadStatus(new CadStatusNormal());
    } else {
      this.status.setCadStatus(new CadStatusEditDimension(type || "linear", i));
    }
  }

  addDimensionLinear() {
    this.selectDimLine(-1, "linear");
  }

  removeDimension(index: number) {
    this.status.cad.remove(this.dimensions()[index]);
  }

  focus(dimension?: CadDimension) {
    const toFocus: CadEntity[] = [];
    const toBlur: CadEntity[] = [];
    const ids: string[] = [];
    const isLinear = dimension instanceof CadDimensionLinear;
    if (isLinear) {
      if (dimension.entity1?.id) {
        ids.push(dimension.entity1.id);
      }
      if (dimension.entity2?.id) {
        ids.push(dimension.entity2.id);
      }
    }
    this.status.cad.data.getAllEntities().forEach((e) => {
      if (e instanceof CadLine || (isLinear && e.id === dimension.id)) {
        toFocus.push(e);
      } else {
        toBlur.push(e);
      }
    });
    this.status.focus(toFocus, {
      selected: (e) => e instanceof CadDimension
    });
    this.status.blur(toBlur);
    this.status.highlightDimensions(dimension ? [dimension] : []);
  }

  blur() {
    this.status.focus();
  }

  getHideDimLines(i: number) {
    return this.dimensions()[i].hideDimLines;
  }

  setHideDimLines(event: MatSlideToggleChange, i: number) {
    const dimension = this.dimensions()[i];
    dimension.hideDimLines = event.checked;
    this.status.cad.render(dimension);
  }
}
