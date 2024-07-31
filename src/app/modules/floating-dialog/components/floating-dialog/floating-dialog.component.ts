import {ChangeDetectionStrategy, Component, effect, HostBinding, input, model} from "@angular/core";
import {Properties} from "csstype";

@Component({
  selector: "app-floating-dialog",
  standalone: true,
  imports: [],
  templateUrl: "./floating-dialog.component.html",
  styleUrl: "./floating-dialog.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloatingDialogComponent {
  @HostBinding("class") class: string[] = [];
  @HostBinding("style") style: Properties = {};

  width = input<string | number>("auto");
  height = input<string | number>("auto");
  top = input<string | number | null>(null);
  left = input<string | number | null>(null);
  active = model<boolean>(false);

  constructor() {
    effect(() => this.updateClass());
    effect(() => this.updateStyle());
  }

  getPxStr(value: string | number) {
    if (typeof value === "number") {
      return `${value}px`;
    }
    return value;
  }
  updateClass() {
    this.class = ["ng-page", this.active() ? "active" : ""];
  }
  updateStyle() {
    const width = this.getPxStr(this.width());
    const height = this.getPxStr(this.height());
    const top0 = this.top();
    let top: string;
    let transformY = "0";
    if (top0 === null) {
      top = "50%";
      transformY = "-50%";
    } else {
      top = this.getPxStr(top0);
    }
    const left0 = this.left();
    let left: string;
    let transformX = "0";
    if (left0 === null) {
      left = "50%";
      transformX = "-50%";
    } else {
      left = this.getPxStr(left0);
    }
    const transform = `translate(${transformX}, ${transformY})`;
    this.style = {width, height, top, left, transform};
  }
}
