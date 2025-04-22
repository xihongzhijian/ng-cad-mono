import {Component, signal, viewChild} from "@angular/core";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";

@Component({
  selector: "app-context-menu",
  imports: [MatMenuModule],
  templateUrl: "./context-menu.component.html",
  styleUrl: "./context-menu.component.scss"
})
export class ContextMenuComponent {
  contextMenuPosition = signal({x: "0px", y: "0px"});

  contextMenu = viewChild.required<MatMenuTrigger>(MatMenuTrigger);

  onContextMenu(event: PointerEvent) {
    event.preventDefault();
    this.contextMenuPosition.set({x: event.clientX + "px", y: event.clientY + "px"});
    this.contextMenu().openMenu();
  }
}
