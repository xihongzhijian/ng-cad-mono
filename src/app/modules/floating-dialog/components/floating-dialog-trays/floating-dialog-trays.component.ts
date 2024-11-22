import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, OnDestroy, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatMenuModule} from "@angular/material/menu";
import {ContextMenuModule} from "@modules/context-menu/context-menu.module";
import {FloatingDialogsManagerService} from "../../services/floating-dialogs-manager.service";
import {FloatingDialogLimits} from "../../services/floating-dialogs-manager.types";
import {FloatingDialogComponent} from "../floating-dialog/floating-dialog.component";

@Component({
  selector: "app-floating-dialog-trays",
  imports: [ContextMenuModule, MatButtonModule, MatMenuModule],
  templateUrl: "./floating-dialog-trays.component.html",
  styleUrl: "./floating-dialog-trays.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloatingDialogTraysComponent implements OnDestroy {
  private manager = inject(FloatingDialogsManagerService);

  limits = input<FloatingDialogLimits>({});

  contextMenuData = null as {i: number} | null;
  traysEl = viewChild.required<ElementRef<HTMLElement>>("traysEl");

  constructor() {
    effect(() => {
      this.manager.limits.update(this.limits);
    });
  }

  ngOnDestroy() {
    this.manager.limits.set({});
  }

  dialogs = computed(() => this.manager.dialogs().filter((v) => !v.noTitle));

  contextMenuBtns = computed(() => {
    const btns: {name: string; action: () => void}[] = [];
    const dialogs = this.dialogs();
    if (dialogs.length > 1) {
      btns.push({
        name: "关闭其他窗口",
        action: () => {
          const contextMenuData = this.contextMenuData;
          if (contextMenuData) {
            for (const [i, dialog] of dialogs.entries()) {
              if (i !== contextMenuData.i) {
                dialog.close.emit();
              }
            }
          }
        }
      });
    }
    btns.push({
      name: "关闭所有窗口",
      action: () => {
        for (const dialog of dialogs) {
          dialog.close.emit();
        }
      }
    });
    return btns;
  });
  onContextMenu(i: number) {
    this.contextMenuData = {i};
  }
  clickTray(dialog: FloatingDialogComponent) {
    const active = dialog.active();
    const minimized = dialog.minimized();
    if (minimized) {
      dialog.toggleMinimized();
    } else if (!active) {
      dialog.beActive();
    } else {
      dialog.toggleMinimized();
    }
  }
}
