import {Directive, HostListener, input} from "@angular/core";

@Directive({
  selector: "[appClickStop]",
  standalone: true
})
export class ClickStopPropagationDirective {
  onClickStopped = input<(event: MouseEvent) => void>();

  @HostListener("click", ["$event"])
  public onHostClick(event: MouseEvent) {
    event.stopPropagation();
    this.onClickStopped()?.(event);
  }
}
