import {Directive, ElementRef, HostListener, inject} from "@angular/core";

@Directive({
  selector: "[appClickedCls]"
})
export class ClickedClsDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener("click", ["$event"])
  public onHostClick() {
    const el = this.el.nativeElement;
    el.classList.add("clicked");
    const parent = el.parentElement;
    const siblings = Array.from(parent?.children || []);
    for (const sibling of siblings) {
      if (sibling !== el) {
        sibling.classList.remove("clicked");
      }
    }
  }
}
