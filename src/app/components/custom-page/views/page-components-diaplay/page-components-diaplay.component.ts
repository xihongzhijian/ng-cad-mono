import {CdkDrag, CdkDragEnd, CdkDragMove} from "@angular/cdk/drag-drop";
import {CdkTextareaAutosize} from "@angular/cdk/text-field";
import {ChangeDetectionStrategy, Component, effect, ElementRef, inject, model, signal, untracked, viewChildren} from "@angular/core";
import {MatInputModule} from "@angular/material/input";
import {setGlobal} from "@app/app.common";
import {Properties} from "csstype";
import {debounce} from "lodash";
import {pageComponentInfos, PageComponentTypeAny} from "../../models/page-component-infos";
import {PageComponentText} from "../../models/page-components/page-component-text";
import {ControlPoint} from "./page-components-diaplay.types";

@Component({
  selector: "app-page-components-diaplay",
  standalone: true,
  imports: [CdkDrag, CdkTextareaAutosize, MatInputModule],
  templateUrl: "./page-components-diaplay.component.html",
  styleUrl: "./page-components-diaplay.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentsDiaplayComponent {
  private elRef: ElementRef<HTMLElement> = inject(ElementRef);

  components = model.required<PageComponentTypeAny[]>();
  activeComponent = model.required<PageComponentTypeAny | null>();
  activeComponent2 = model.required<PageComponentTypeAny | null>();

  control = signal<{class: string[]; style: Properties} | null>(null);
  isEditingComponent = signal<PageComponentTypeAny | null>(null);
  isDraggingComponent = false;

  componentEls = viewChildren<ElementRef<HTMLDivElement>>("componentEl");
  autoSizes = viewChildren<CdkTextareaAutosize>(CdkTextareaAutosize);

  constructor() {
    setGlobal("pageComponentsDiaplay", this);
    effect(() => this.updateControl(), {allowSignalWrites: true});
    effect(
      () => {
        const editingComponent = untracked(() => this.isEditingComponent());
        const activeComponent = this.activeComponent();
        if (editingComponent && (!activeComponent || editingComponent.id !== activeComponent.id)) {
          this.isEditingComponent.set(null);
        }
      },
      {allowSignalWrites: true}
    );
    effect(() => {
      this.components();
      for (const autoSize of this.autoSizes()) {
        autoSize.resizeToFitContent(true);
      }
      setTimeout(() => {
        this.updateControl();
      }, 0);
    });
  }

  clickComponent(component: PageComponentTypeAny) {
    if (this.isDraggingComponent) {
      this.isDraggingComponent = false;
      return;
    }
    if (this.activeComponent()?.id !== component.id) {
      this.activeComponent.set(component);
    }
  }
  dblClickComponent(component: PageComponentTypeAny, componentEl: HTMLDivElement) {
    this.isEditingComponent.set(component);
    if (component instanceof PageComponentText) {
      const input = componentEl.querySelector("textarea");
      if (input) {
        input.focus();
        input.select();
      }
    }
  }
  getComponentStyle(component: PageComponentTypeAny) {
    const activeComponent = this.activeComponent2();
    if (activeComponent?.id === component.id) {
      return activeComponent.getStyle();
    }
    return component.getStyle();
  }
  getComponentDragDisabled(component: PageComponentTypeAny) {
    return this.isEditingComponent()?.id === component.id;
  }
  moveComponentStart(component: PageComponentTypeAny) {
    this.isDraggingComponent = true;
    const activeComponent = this.activeComponent();
    if (activeComponent?.id === component.id) {
      this.activeComponent2.set(component.clone());
    }
  }
  moveComponent(event: CdkDragMove, component: PageComponentTypeAny) {
    const component2 = this.activeComponent2();
    if (component2) {
      event.source._dragRef.reset();
      component2.position.x = component.position.x + event.distance.x;
      component2.position.y = component.position.y + event.distance.y;
      this.activeComponent2.set(component2.clone());
    }
  }
  moveComponentEnd(event: CdkDragEnd, component: PageComponentTypeAny) {
    component.position.add(event.distance.x, event.distance.y);
    event.source._dragRef.reset();
    this.components.update((v) => [...v]);
    const component2 = this.activeComponent2();
    if (component2) {
      this.activeComponent2.set(null);
    }
  }

  controlPoints = [
    {position: "top", axis: "y"},
    {position: "left", axis: "x"},
    {position: "right", axis: "x"},
    {position: "bottom", axis: "y"},
    {position: "top-left"},
    {position: "top-right"},
    {position: "bottom-left"},
    {position: "bottom-right"}
  ] as ControlPoint[];
  updateControl(target?: PageComponentTypeAny) {
    const component = this.activeComponent2() || this.activeComponent();
    const componentEl = this.elRef.nativeElement.querySelector(`.page-component[data-id="${component?.id}"]`);
    const rect2 = document.body.querySelector(".page")?.getBoundingClientRect();
    const result = {isComponentsUpdated: false};
    if (!component || !componentEl || !rect2) {
      this.control.set(null);
      return result;
    }
    if (target && target.id !== component.id) {
      return result;
    }
    const rect = componentEl.getBoundingClientRect();
    const {resizable = {}} = pageComponentInfos[component.type] || {};
    const classArr: string[] = [];
    if (resizable.x) {
      classArr.push("resize-x");
    }
    if (resizable.y) {
      classArr.push("resize-y");
    }
    this.control.set({
      class: classArr,
      style: {
        "--component-width": `${rect.width.toFixed(0)}px`,
        "--component-height": `${rect.height.toFixed(0)}px`
      } as Properties
    });
    if (component instanceof PageComponentText) {
      if (component.size.y !== rect.height) {
        component.size.y = rect.height;
        this.components.update((v) => [...v]);
        result.isComponentsUpdated = true;
      }
    }
    return result;
  }
  moveControlPointStart() {
    const component = this.activeComponent();
    if (component) {
      this.activeComponent2.set(component.clone());
    }
  }
  moveControlPoint(event: CdkDragMove, point: ControlPoint) {
    const {distance} = event;
    const component2 = this.activeComponent2();
    const component = this.activeComponent();
    if (!component2 || !component) {
      return;
    }
    const {resizable = {}} = pageComponentInfos[component.type] || {};
    if (resizable.preserveRatio) {
      const absX = Math.abs(distance.x);
      const absY = Math.abs(distance.y);
      if (absX > absY) {
        distance.y = distance.x;
      } else {
        distance.x = distance.y;
      }
    }
    const {position: positionStr} = point;
    const position = component.position.clone();
    const size = component.size.clone();
    if (positionStr.includes("top")) {
      position.y += distance.y;
      size.y -= distance.y;
    }
    if (positionStr.includes("bottom")) {
      size.y += distance.y;
    }
    if (positionStr.includes("left")) {
      position.x += distance.x;
      size.x -= distance.x;
    }
    if (positionStr.includes("right")) {
      size.x += distance.x;
    }
    component2.position.copy(position);
    component2.size.copy(size);

    event.source._dragRef.reset();
    this.activeComponent2.set(component2.clone());
  }
  moveControlPointEnd(event: CdkDragEnd) {
    event.source._dragRef.reset();
    const component = this.activeComponent2();
    if (component) {
      this.activeComponent2.set(null);
      const activeComponent = this.activeComponent();
      if (activeComponent) {
        activeComponent.position.copy(component.position);
        activeComponent.size.copy(component.size);
        this.components.update((v) => [...v]);
      }
    }
  }

  onComponentTextInput = debounce((event: Event, component: PageComponentText) => {
    component.text = (event.target as HTMLInputElement).value;
    const {isComponentsUpdated} = this.updateControl(component);
    if (!isComponentsUpdated) {
      this.components.update((v) => [...v]);
    }
  }, 200);
}
