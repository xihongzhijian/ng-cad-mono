import {CdkDrag, CdkDragEnd, CdkDragMove} from "@angular/cdk/drag-drop";
import {CdkTextareaAutosize} from "@angular/cdk/text-field";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  model,
  signal,
  untracked,
  viewChildren
} from "@angular/core";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {setGlobal} from "@app/app.common";
import {Angle, Point} from "@lucilor/utils";
import {Properties} from "csstype";
import {debounce} from "lodash";
import {pageComponentInfos, PageComponentTypeAny} from "../../models/page-component-infos";
import {PageComponentText} from "../../models/page-components/page-component-text";
import {ControlPoint} from "./page-components-diaplay.types";

@Component({
  selector: "app-page-components-diaplay",
  standalone: true,
  imports: [CdkDrag, CdkTextareaAutosize, MatIconModule, MatInputModule],
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

  componentStyles = computed(() => {
    const activeComponent = this.activeComponent2();
    return this.components().map((component) => {
      if (activeComponent?.id === component.id) {
        return activeComponent.getStyle();
      }
      return component.getStyle();
    });
  });
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
      const el = event.source._dragRef.getRootElement();
      el.style.transform = component2.getStyle().transform as string;
      component2.position.x = component.position.x + event.distance.x;
      component2.position.y = component.position.y + event.distance.y;
      this.activeComponent2.set(component2.clone());
    }
  }
  moveComponentEnd(event: CdkDragEnd, component: PageComponentTypeAny) {
    component.position.add(event.distance.x, event.distance.y);
    this.components.update((v) => [...v]);
    const component2 = this.activeComponent2();
    if (component2) {
      const el = event.source._dragRef.getRootElement();
      el.style.transform = component2.getStyle().transform as string;
      this.activeComponent2.set(null);
    }
  }
  updateComponentsTransform() {
    const components = this.components();
    for (const [i, el] of this.componentEls().entries()) {
      el.nativeElement.style.transform = components[i].getStyle().transform as string;
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
    const result = {isComponentsUpdated: false};
    if (!component || !(componentEl instanceof HTMLElement)) {
      this.control.set(null);
      return result;
    }
    if (target && target.id !== component.id) {
      return result;
    }
    const {resizable = {}} = pageComponentInfos[component.type] || {};
    const classArr: string[] = [];
    if (resizable.x) {
      classArr.push("resize-x");
    }
    if (resizable.y) {
      classArr.push("resize-y");
    }
    this.control.set({class: classArr, style: {}});

    let updateComponents = false;
    if (!resizable.x && component.size.x !== componentEl.offsetWidth) {
      component.size.x = componentEl.offsetWidth;
      updateComponents = true;
    }
    if (!resizable.y && component.size.y !== componentEl.offsetHeight) {
      component.size.y = componentEl.offsetHeight;
      updateComponents = true;
    }
    if (updateComponents) {
      this.components.update((v) => [...v]);
      result.isComponentsUpdated = true;
    }
    return result;
  }
  moveResizePointStart() {
    const component = this.activeComponent();
    if (component) {
      this.activeComponent2.set(component.clone());
    }
  }
  moveResizePoint(event: CdkDragMove, point: ControlPoint) {
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
  moveResizePointEnd(event: CdkDragEnd) {
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
  moveRotatePointStart() {
    const component = this.activeComponent();
    if (component) {
      this.activeComponent2.set(component.clone());
    }
  }
  private _moveRotatePointPosPrev: Point | null = null;
  moveRotatePoint(event: CdkDragMove, componentEl: HTMLElement) {
    const component2 = this.activeComponent2();
    const component = this.activeComponent();
    if (!component2 || !component) {
      return;
    }

    const {pointerPosition, distance} = event;
    const rect = componentEl.getBoundingClientRect();
    const origin = new Point(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const p2 = new Point(pointerPosition.x, pointerPosition.y).sub(origin);
    const p1 = this._moveRotatePointPosPrev || p2.clone().sub(distance.x, distance.y);
    this._moveRotatePointPosPrev = p2.clone();
    const angle2 = Math.atan2(p2.y, p2.x);
    const angle1 = Math.atan2(p1.y, p1.x);
    component2.rotation.add(new Angle(angle2 - angle1, "rad")).constrain(true);

    event.source._dragRef.reset();
    this.activeComponent2.set(component2.clone());
  }
  moveRotatePointEnd(event: CdkDragEnd) {
    event.source._dragRef.reset();
    const component = this.activeComponent2();
    this._moveRotatePointPosPrev = null;
    if (component) {
      this.activeComponent2.set(null);
      const activeComponent = this.activeComponent();
      if (activeComponent) {
        activeComponent.rotation.copy(component.rotation);
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
