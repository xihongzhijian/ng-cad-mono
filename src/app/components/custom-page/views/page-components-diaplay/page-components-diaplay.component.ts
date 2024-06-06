import {CdkDrag, CdkDragEnd, CdkDragMove} from "@angular/cdk/drag-drop";
import {ChangeDetectionStrategy, Component, effect, ElementRef, inject, model, signal} from "@angular/core";
import {Properties} from "csstype";
import {PageComponentBase} from "../../models/page-components/page-component-base";

@Component({
  selector: "app-page-components-diaplay",
  standalone: true,
  imports: [CdkDrag],
  templateUrl: "./page-components-diaplay.component.html",
  styleUrl: "./page-components-diaplay.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentsDiaplayComponent {
  private elRef: ElementRef<HTMLElement> = inject(ElementRef);

  components = model.required<PageComponentBase[]>();
  activeComponent = model.required<PageComponentBase | null>();

  controlConfig = {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--primary-color)",
    padding: 5
  };
  controlStyle = signal<Properties | null>(null);

  constructor() {
    effect(() => this.updateControlStyles(), {allowSignalWrites: true});
  }

  clickComponent(event: Event, component: PageComponentBase) {
    event.stopPropagation();
    this.activeComponent.set(component);
  }
  moveComponent(event: CdkDragMove, component: PageComponentBase) {
    this.updateControlStyles(component);
  }
  moveComponentEnd(event: CdkDragEnd, component: PageComponentBase) {
    component.position.add(event.distance.x, event.distance.y);
    event.source._dragRef.reset();
    this.components.update((v) => [...v]);
    setTimeout(() => {
      this.updateControlStyles(component);
    }, 0);
  }

  updateControlStyles(target?: PageComponentBase) {
    const component = this.activeComponent();
    const componentEl = this.elRef.nativeElement.querySelector(`.page-component[data-id="${component?.id}"]`);
    const rect2 = document.body.querySelector(".page")?.getBoundingClientRect();
    if (!component || !componentEl || !rect2) {
      this.controlStyle.set(null);
      return;
    }
    if (target && target.id !== component.id) {
      return;
    }
    const {borderWidth, borderStyle, borderColor, padding} = this.controlConfig;
    const rect = componentEl.getBoundingClientRect();
    const width = rect.width + borderWidth * 2 + padding * 2;
    const height = rect.height + borderWidth * 2 + padding * 2;
    const left = rect.left - borderWidth - padding - rect2.left;
    const top = rect.top - borderWidth - padding - rect2.top;
    this.controlStyle.set({
      left: `${left}px`,
      top: `${top}px`,
      "--border": `${borderWidth}px ${borderStyle} ${borderColor}`,
      "--width": `${width}px`,
      "--height": `${height}px`
    } as Properties);
  }
}
