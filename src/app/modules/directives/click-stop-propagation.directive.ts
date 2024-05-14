import {Directive, HostListener, Input} from "@angular/core";

@Directive({
  selector: "[appClickStop]",
  standalone: true
})
export class ClickStopPropagationDirective {
  @Input() onClickStopped?: (event: MouseEvent) => void;

  @HostListener("click", ["$event"])
  public onHostClick(event: MouseEvent) {
    event.stopPropagation();
    this.onClickStopped?.(event);
  }
}
