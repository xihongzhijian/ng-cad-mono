import {ChangeDetectionStrategy, Component, effect, HostBinding, input} from "@angular/core";
import {Properties} from "csstype";
import {PageComponentItem} from "../../models/page-component-infos";

@Component({
  selector: "app-page-component-control",
  standalone: true,
  imports: [],
  templateUrl: "./page-component-control.component.html",
  styleUrl: "./page-component-control.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentControlComponent {
  @HostBinding("style") style: Properties = {};

  item = input.required<PageComponentItem | null>();

  constructor() {
    effect(() => {
      this.update();
    });
  }

  update() {
    const item = this.item();
    if (!item) {
      this.style = {};
      return;
    }
    const {component} = item;
    this.style = {
      width: `${component.size.x}px`,
      height: `${component.size.y}px`,
      left: `${component.position.x}px`,
      top: `${component.position.y}px`,
      border: "var(--border)"
    };
  }
}
