import {ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {openCadDimensionForm, OpenCadDimensionFormKey, reservedDimNames} from "@app/cad/utils";
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
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusEditDimension} from "@services/cad-status";
import {openCadDimensionFormDialog} from "../../dialogs/cad-dimension-form/cad-dimension-form.component";

@Component({
  selector: "app-cad-dimension",
  templateUrl: "./cad-dimension.component.html",
  styleUrls: ["./cad-dimension.component.scss"],
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadDimensionComponent implements OnInit, OnDestroy {
  private config = inject(AppConfigService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  dimNameFocus = signal(-1);
  dimLineSelecting = signal(-1);
  dimensions = signal<CadDimension[]>([]);

  prevConfig: Partial<AppConfig> = {};
  prevSelectedComponents: CadData[] | null = null;
  prevComponentsSelectable: boolean | null = null;
  prevSelectedEntities: CadEntities | null = null;
  editDimensionEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusEditDimension,
    (cadStatus) => {
      const index = cadStatus.index;
      const dimension = this.dimensions()[index];
      this.prevSelectedEntities = this.status.cad.selected();
      this.dimLineSelecting.set(index);
      this.prevConfig = this.config.setConfig({hideLineLength: true, lineGongshi: 0, selectMode: "single"}, {sync: false});
      this.prevSelectedComponents = this.status.components.selected();
      this.status.components.selected.set([]);
      this.prevComponentsSelectable = this.status.components.selectable();
      this.status.components.selectable.set(false);
      this.focus(dimension);
    },
    () => {
      this.dimLineSelecting.set(-1);
      this.config.setConfig(this.prevConfig, {sync: false});
      if (this.prevSelectedComponents !== null) {
        this.status.components.selected.set(this.prevSelectedComponents);
        this.prevSelectedComponents = null;
      }
      if (this.prevComponentsSelectable !== null) {
        this.status.components.selectable.set(this.prevComponentsSelectable);
        this.prevComponentsSelectable = null;
      }
      this.blur();
      if (this.prevSelectedEntities) {
        this.status.cad.select(this.prevSelectedEntities);
        this.prevSelectedEntities = null;
      }
    },
    (cadStatus) => {
      const index = cadStatus.index;
      this.dimLineSelecting.set(index);
      const dimension = this.dimensions()[index];
      this.focus(dimension);
    }
  );

  ngOnInit() {
    const cad = this.status.cad;
    cad.on("entitiesselect", this._onEntitiesSelect);
    cad.on("entitiesunselect", this._onEntitiesUnselect);
    cad.on("entitiesadd", this._updateDimensions);
    cad.on("entitiesremove", this._updateDimensions);
    cad.on("zoom", this._onZoom);
    cad.on("moveentities", this._onMoveEntities);
  }
  ngOnDestroy() {
    const cad = this.status.cad;
    cad.off("entitiesselect", this._onEntitiesSelect);
    cad.off("entitiesunselect", this._onEntitiesUnselect);
    cad.off("entitiesadd", this._updateDimensions);
    cad.off("entitiesremove", this._updateDimensions);
    cad.off("zoom", this._onZoom);
    cad.off("moveentities", this._onMoveEntities);
  }

  openCadOptionsEff = effect(() => {
    this.status.openCadOptions();
    this._updateDimensions();
  });

  private _onEntitiesSelect: CadEventCallBack<"entitiesselect"> = (entities, _, event) => {
    const cad = this.status.cad;
    const data = cad.data;
    const dimensions = this.dimensions();
    const entity = entities.line[0];
    let newIndex = -1;
    const editDimensionStatus = this.status.findCadStatus((v) => v instanceof CadStatusEditDimension);
    if (editDimensionStatus && entity) {
      const dimension = dimensions[editDimensionStatus.index];
      if (editDimensionStatus.type === "linear") {
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
          dimensionLinear.entity1 = {id: entity.id, location};
          dimensionLinear.cad1 = data.name;
        } else if (!dimensionLinear.entity2.id) {
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
        this.status.setCadStatuses([new CadStatusEditDimension("linear", newIndex)]);
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
    const cadStatus = this.status.findCadStatus((v) => v instanceof CadStatusEditDimension);
    if (!cadStatus) {
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

  setDimensionName(event: Event, dimension: CadDimension) {
    const str = (event.target as HTMLInputElement).value;
    if (reservedDimNames.includes(str)) {
      this.message.alert(`标注名字不能是: ${str}`);
      return;
    }
    dimension.mingzi = str;
    this.status.cad.render(dimension);
  }

  isSelectingDimLine(i: number) {
    return this.status.hasCadStatus((v) => v instanceof CadStatusEditDimension && v.index === i);
  }

  async selectDimLine(i: number, type?: CadDimensionType) {
    this.status.toggleCadStatus(new CadStatusEditDimension(type || "linear", i));
  }

  isAddingDimension = computed(() => {
    if (!this.status.hasCadStatus((v) => v instanceof CadStatusEditDimension)) {
      return false;
    }
    return this.dimLineSelecting() < 0;
  });
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
      if (dimension.entity1.id) {
        ids.push(dimension.entity1.id);
      }
      if (dimension.entity2.id) {
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
    this.status.highlightDimensions();
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

  async editAllDimensions() {
    const dimension0 = new CadDimensionLinear();
    const keys: OpenCadDimensionFormKey[] = ["字体大小"];
    const collection = this.status.collection$.value;
    const cad = this.status.cad;
    const result = await openCadDimensionForm(collection, this.message, cad, dimension0, keys);
    if (result) {
      for (const dimension of cad.data.entities.dimension) {
        if (!(dimension instanceof CadDimensionLinear)) {
          continue;
        }
        for (const key of keys) {
          switch (key) {
            case "字体大小":
              dimension.setStyle({text: {size: dimension0.style?.text?.size}});
          }
        }
      }
      cad.render();
    }
  }
}
