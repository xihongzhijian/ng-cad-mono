import {Component, computed, effect, ElementRef, inject, untracked, viewChildren} from "@angular/core";
import {AppConfigService, defaultConfig} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import SelectionArea, {SelectionEvent} from "@viselect/vanilla";
import {Properties} from "csstype";
import {difference} from "lodash";

@Component({
  selector: "app-cad-points",
  templateUrl: "./cad-points.component.html",
  styleUrls: ["./cad-points.component.scss"],
  imports: []
})
export class CadPointsComponent {
  private config = inject(AppConfigService);
  private elRef = inject(ElementRef<Element>);
  private status = inject(AppStatusService);

  selection: SelectionArea | null = null;

  pointEls = viewChildren<ElementRef<Element>>("point");
  selectMode = computed(() => this.config.getConfig("cadPointsSelectMode"));
  selectedPointEls: Element[] = [];

  private _onSelectionMove = (e: SelectionEvent) => {
    const {added, removed} = e.store.changed;
    if (added.length > 0 || removed.length > 0) {
      let selected = this.selectedPointEls;
      for (const el of added) {
        if (!selected.includes(el)) {
          selected.push(el);
        }
      }
      selected = difference(selected, removed);
      this.selectedPointEls = selected;
      for (const {nativeElement: el} of this.pointEls()) {
        if (selected.includes(el)) {
          el.classList.add("active2");
        } else {
          el.classList.remove("active2");
        }
      }
    }
  };
  private _onSelectionStop = (e: SelectionEvent) => {
    let selected = this.selectedPointEls;
    const pointEls = this.pointEls().map((el) => el.nativeElement);
    const selectMode = this.selectMode();
    if (selectMode === "single" && selected.length > 1) {
      selected = selected.slice(-1);
    }
    for (const el of pointEls) {
      el.classList.remove("active2");
    }
    const points = this.status.cadPoints();
    for (const [i, point] of points.entries()) {
      if (selected.includes(pointEls[i])) {
        point.active = true;
      } else {
        point.active = false;
      }
    }
    this.status.cadPoints.set([...points]);
    e.selection.clearSelection(true, true);
  };

  pointsEff = effect(() => {
    const points = this.status.cadPoints();
    const pointEls = untracked(() => this.pointEls().map((el) => el.nativeElement));
    for (const el of pointEls) {
      el.classList.remove("active2");
    }
    const mode = this.selectMode();
    if (mode !== "none" && points.length > 0) {
      this.createSelection();
    } else {
      this.destroySelection();
    }
  });

  createSelection() {
    this.selection?.destroy();
    this.selection = new SelectionArea({
      selectables: "app-cad-points .point",
      container: this.elRef.nativeElement
    })
      .on("move", this._onSelectionMove.bind(this))
      .on("stop", this._onSelectionStop.bind(this));
    const selected = [];
    const points = this.status.cadPoints();
    const pointEls = this.pointEls().map((el) => el.nativeElement);
    for (const [i, point] of points.entries()) {
      if (point.active) {
        selected.push(pointEls[i]);
      }
    }
    this.selectedPointEls = selected;
    this.selection.select(selected, true);
  }
  destroySelection() {
    if (this.selection) {
      this.selection.destroy();
      this.selection = null;
    }
  }

  pointInfos = computed(() => {
    const points = this.status.cadPoints();
    let size = this.config.getConfig("pointSize");
    if (!(size > 0)) {
      size = defaultConfig.pointSize;
    }
    const mode = this.selectMode();
    return points.map((point) => {
      const classList: string[] = [];
      if (point.active) {
        classList.push("active");
      }
      if (mode !== "none") {
        classList.push("selectable");
      }
      const style: Properties = {
        width: `${size}px`,
        height: `${size}px`,
        left: `${point.x}px`,
        top: `${point.y}px`
      };
      return {classList, style};
    });
  });
}
