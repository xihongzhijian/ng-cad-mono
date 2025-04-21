import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild
} from "@angular/core";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatOptionModule} from "@angular/material/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {Point} from "@lucilor/utils";
import {Properties} from "csstype";
import {clamp} from "lodash";

export interface AnchorEvent {
  anchor: [number, number];
}

@Component({
  selector: "app-anchor-selector",
  templateUrl: "./anchor-selector.component.html",
  styleUrls: ["./anchor-selector.component.scss"],
  imports: [MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatOptionModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnchorSelectorComponent {
  xIn = input(0, {alias: "x"});
  yIn = input(0, {alias: "y"});
  pointerSize = input(10);
  backgroundSize = input(100);
  anchorChange = output<AnchorEvent>();
  anchorChangeEnd = output<AnchorEvent>();

  x = signal(0);
  xEff = effect(() => this.x.set(clamp(this.xIn(), 0, 1)));
  y = signal(0);
  yEff = effect(() => this.y.set(clamp(this.yIn(), 0, 1)));

  backgroundStyle = computed<Properties>(() => {
    const size = this.backgroundSize();
    return {width: size + "px", height: size + "px"};
  });
  pointerStyle = computed<Properties>(() => {
    const size = this.pointerSize();
    const sizeBg = this.backgroundSize();
    const left = this.x() * sizeBg;
    const top = this.y() * sizeBg;
    return {width: size + "px", height: size + "px", left: left + "px", top: top + "px"};
  });

  pointer = viewChild<ElementRef<HTMLElement>>("pointer");
  background = viewChild<ElementRef<HTMLElement>>("background");

  dragging = false;
  pointerPosition: Point | null = null;

  @HostListener("window:pointerdown", ["$event"])
  onDragStarted(event: PointerEvent) {
    if (event.target === this.pointer()?.nativeElement) {
      this.dragging = true;
    }
  }

  @HostListener("window:pointermove", ["$event"])
  onDragMoved(event: PointerEvent) {
    const background = this.background()?.nativeElement;
    if (this.dragging && background) {
      const {clientX, clientY} = event;
      const rect = background.getBoundingClientRect();
      const backgroundSize = this.backgroundSize();
      let x = clamp(clientX - rect.x, 0, backgroundSize);
      let y = clamp(clientY - rect.y, 0, backgroundSize);
      x = Number((x / backgroundSize).toFixed(2));
      y = Number((y / backgroundSize).toFixed(2));
      this.x.set(x);
      this.y.set(y);
      this.anchorChange.emit({anchor: [x, y]});
    }
  }

  @HostListener("window:pointerup")
  @HostListener("window:pointerleave")
  onDragEnded() {
    if (this.dragging) {
      this.anchorChangeEnd.emit({anchor: [this.x(), this.y()]});
      this.dragging = false;
    }
  }

  onInputChange(event: Event | MatAutocompleteSelectedEvent, axis: "x" | "y") {
    let value: number;
    if (event instanceof MatAutocompleteSelectedEvent) {
      value = Number(event.option.value);
    } else {
      value = Number((event.target as HTMLInputElement).value);
    }
    if (axis === "x") {
      this.x.set(value);
    } else if (axis === "y") {
      this.y.set(value);
    }
    const x = this.x();
    const y = this.y();
    this.anchorChange.emit({anchor: [x, y]});
    this.anchorChangeEnd.emit({anchor: [x, y]});
  }
}
