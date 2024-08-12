import {Directive, EventEmitter, HostListener, Input, Output} from "@angular/core";
import {ContextMenuComponent} from "../components/context-menu/context-menu.component";

@Directive({
  selector: "[appContextMenuTrigger]",
  standalone: true
})
export class ContextMenuTriggerDirective {
  @Input() appContextMenuTrigger!: ContextMenuComponent;
  @Output() contextMenuEvt = new EventEmitter<PointerEvent>();

  @HostListener("contextmenu", ["$event"])
  onContextMenu(event: PointerEvent) {
    event.preventDefault();
    this.contextMenuEvt.emit(event);
    this.appContextMenuTrigger.onContextMenu(event);
  }
}
