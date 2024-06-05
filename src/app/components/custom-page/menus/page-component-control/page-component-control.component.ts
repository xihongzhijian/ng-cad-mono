import {ChangeDetectionStrategy, Component, effect, HostBinding, input} from "@angular/core";
import {Properties} from "csstype";
import {PageComponentBase} from "../../models/page-components/page-component-base";

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

  component = input.required<PageComponentBase | null>();

  constructor() {
    effect(() => {
      this.update();
    });
  }

  update() {
    const component = this.component();
    if (!component) {
      this.style = {};
      return;
    }
    this.style = {
      width: `${component.size.x}px`,
      height: `${component.size.y}px`,
      left: `${component.position.x}px`,
      top: `${component.position.y}px`,
      border: "var(--border)"
    };
  }
}
