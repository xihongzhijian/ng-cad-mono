import {CdkDrag, CdkDragEnd, CdkDragMove} from "@angular/cdk/drag-drop";
import {CdkTextareaAutosize} from "@angular/cdk/text-field";
import {ChangeDetectionStrategy, Component, effect, ElementRef, inject, model, signal, untracked, viewChildren} from "@angular/core";
import {MatInputModule} from "@angular/material/input";
import {Properties} from "csstype";
import {debounce} from "lodash";
import {PageComponentTypeAny} from "../../models/page-component-infos";
import {PageComponentText} from "../../models/page-components/page-component-text";

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

  controlConfig = {
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: "var(--primary-color)",
    padding: 5
  };
  controlStyle = signal<Properties | null>(null);
  isEditingComponent = signal<PageComponentTypeAny | null>(null);
  isDraggingComponent = false;

  componentEls = viewChildren<ElementRef<HTMLDivElement>>("componentEl");
  autoSizes = viewChildren<CdkTextareaAutosize>(CdkTextareaAutosize);

  constructor() {
    effect(() => this.updateControlStyles(), {allowSignalWrites: true});
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
        this.updateControlStyles();
      }, 0);
    });
  }

  clickComponent(event: Event, component: PageComponentTypeAny) {
    event.stopPropagation();
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
  moveComponentStart() {
    this.isDraggingComponent = true;
  }
  moveComponent(event: CdkDragMove, component: PageComponentTypeAny) {
    this.updateControlStyles(component);
  }
  moveComponentEnd(event: CdkDragEnd, component: PageComponentTypeAny) {
    component.position.add(event.distance.x, event.distance.y);
    event.source._dragRef.reset();
    this.components.update((v) => [...v]);
    setTimeout(() => {
      this.updateControlStyles(component);
    }, 0);
  }

  updateControlStyles(target?: PageComponentTypeAny) {
    const component = this.activeComponent();
    const componentEl = this.elRef.nativeElement.querySelector(`.page-component[data-id="${component?.id}"]`);
    const rect2 = document.body.querySelector(".page")?.getBoundingClientRect();
    const result = {isComponentsUpdated: false};
    if (!component || !componentEl || !rect2) {
      this.controlStyle.set(null);
      return result;
    }
    if (target && target.id !== component.id) {
      return result;
    }
    const {borderWidth, borderStyle, borderColor, padding} = this.controlConfig;
    const rect = componentEl.getBoundingClientRect();
    const top = rect.top - rect2.top;
    const left = rect.left - rect2.left;
    this.controlStyle.set({
      "--border-width": `${borderWidth.toFixed(0)}px`,
      "--border-style": borderStyle,
      "--border-color": borderColor,
      "--padding": `${padding.toFixed(0)}px`,
      "--component-width": `${rect.width.toFixed(0)}px`,
      "--component-height": `${rect.height.toFixed(0)}px`,
      "--component-top": `${top.toFixed(0)}px`,
      "--component-left": `${left.toFixed(0)}px`
    } as Properties);
    if (component instanceof PageComponentText) {
      if (component.size.y !== rect.height) {
        component.size.y = rect.height;
        this.components.update((v) => [...v]);
        result.isComponentsUpdated = true;
      }
    }
    return result;
  }

  onComponentTextInput = debounce((event: Event, component: PageComponentText) => {
    component.text = (event.target as HTMLInputElement).value;
    const {isComponentsUpdated} = this.updateControlStyles(component);
    if (!isComponentsUpdated) {
      this.components.update((v) => [...v]);
    }
  }, 200);
}
