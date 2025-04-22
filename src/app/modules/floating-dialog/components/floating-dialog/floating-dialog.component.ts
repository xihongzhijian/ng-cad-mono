import {CdkDrag, CdkDragEnd, CdkDragHandle, CdkDragMove, Point} from "@angular/cdk/drag-drop";
import {
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {getTrbl, TrblLike} from "@app/utils/trbl";
import {ObjectOf} from "@lucilor/utils";
import {ContextMenuModule} from "@modules/context-menu/context-menu.module";
import {Properties} from "csstype";
import {uniqueId} from "lodash";
import {FloatingDialogsManagerService} from "../../services/floating-dialogs-manager.service";
import {ResizeHandle} from "./floating-dialog.types";

@Component({
  selector: "app-floating-dialog",
  imports: [CdkDrag, CdkDragHandle, ContextMenuModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: "./floating-dialog.component.html",
  styleUrl: "./floating-dialog.component.scss"
})
export class FloatingDialogComponent implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private manager = inject(FloatingDialogsManagerService);

  @HostBinding("class") class: string[] = [];

  id = uniqueId("floatingDialog");
  name = input<string>("");
  backdrop = input(false, {transform: booleanAttribute});
  coverMatDialog = input(false, {transform: booleanAttribute});
  width = model<string | number>("auto");
  height = model<string | number>("auto");
  top = input<string | number | null>(0);
  left = input<string | number | null>(0);
  styleIn = input<Properties>({}, {alias: "style"});
  noTitle = input(false, {transform: booleanAttribute});
  size = model<Readonly<Point>>({x: 0, y: 0});
  position = model<Readonly<Point>>({x: 0, y: 0});
  active = model<boolean>(false);
  pinned = model<boolean>(false);
  minimized = model<boolean>(false);
  maximized = model<boolean>(false);
  maximizedMargin = input<TrblLike | "default">("default");
  noPin = input(false, {transform: booleanAttribute});
  noMinimize = input(false, {transform: booleanAttribute});
  noMaximize = input(false, {transform: booleanAttribute});
  noClose = input(false, {transform: booleanAttribute});
  onlyClose = input(false, {transform: booleanAttribute});
  close = output();

  dialogEl = viewChild.required<ElementRef<HTMLElement>>("dialogEl");
  contextMenu = viewChild.required<MatMenuTrigger>("contextMenu");

  minimizedEff = effect(() => {
    const minimized = this.minimized();
    untracked(() => {
      const dialogs = this.manager.dialogs();
      if (minimized) {
        this.active.set(false);
        const dialog = dialogs.find((v) => !v.minimized());
        if (dialog) {
          dialog.beActive();
        }
      } else {
        this.beActive();
      }
      this.manager.dialogs.set([...dialogs]);
    });
  });
  maximizedEff = effect(() => {
    const maximized = this.maximized();
    untracked(() => {
      if (maximized) {
        if (!this.class.includes("backdrop")) {
          this.class = [...this.class, "backdrop"];
        }
        this._positionBefore.set({...this.position()});
      } else {
        if (this.class.includes("backdrop")) {
          this.class = this.class.filter((v) => v !== "backdrop");
        }
        this.position.set(this._positionBefore());
      }
    });
  });

  private _parentEl = signal<HTMLElement | null>(null);
  zIndexOffset = signal(0);
  ngOnInit() {
    this.beActive();
    this.manager.dialogs.update((dialogs) => [...dialogs, this]);
    window.addEventListener("resize", this.onWindowResize.bind(this));
    const el = this.el.nativeElement;
    this._parentEl.set(el.parentElement);
    const siblings = document.querySelectorAll("body > app-floating-dialog .floating-dialog-container");
    let zIndexOffsetMax = -1;
    siblings.forEach((v) => {
      const zIndexOffset = Number(getComputedStyle(v).getPropertyValue("--offset-z-index"));
      if (isNaN(zIndexOffset)) {
        return;
      }
      if (zIndexOffset > zIndexOffsetMax) {
        zIndexOffsetMax = zIndexOffset;
      }
    });
    if (zIndexOffsetMax >= 0) {
      const zIndexOffset = zIndexOffsetMax + 1;
      this.zIndexOffset.set(zIndexOffset);
      document.body.style.setProperty("--floating-dialog-offset-z-index", `${zIndexOffset}`);
    }
    document.body.appendChild(el);
  }
  ngOnDestroy() {
    this.manager.dialogs.update((dialogs) => dialogs.filter((dialog) => dialog !== this));
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    const el = this.el.nativeElement;
    this._parentEl()?.appendChild(el);
  }
  private _windowResizeNum = signal(0);
  onWindowResize() {
    this._windowResizeNum.update((v) => v + 1);
  }

  getPxStr(value: string | number | null) {
    if (value === null) {
      return undefined;
    } else if (typeof value === "number") {
      return `${value}px`;
    }
    return value;
  }
  style = computed(() => {
    const style: Properties = {};
    if (this.maximized()) {
      this._windowResizeNum();
      let maximizedMargin = this.maximizedMargin();
      if (maximizedMargin === "default") {
        maximizedMargin = 50;
      }
      const margin = getTrbl(maximizedMargin);
      style.left = "50%";
      style.top = "50%";
      style.transform = "translate(-50%, -50%)";
      const left = margin[3];
      const right = window.innerWidth - margin[1];
      style.width = `${right - left}px`;
      const top = margin[0];
      const bottom = window.innerHeight - margin[2];
      style.height = `${bottom - top}px`;
    } else {
      const {x: sizeX, y: sizeY} = this.size();
      style.width = sizeX > 0 ? `${sizeX}px` : this.getPxStr(this.width());
      style.height = sizeY > 0 ? `${sizeY}px` : this.getPxStr(this.height());
      style.top = this.getPxStr(this.top());
      style.left = this.getPxStr(this.left());
    }
    return {...style, ...this.styleIn()};
  });

  titleBtns = computed(() => {
    const btns: {icon: string; action: () => void}[] = [];
    const onlyClose = this.onlyClose();
    if (!onlyClose && !this.noPin()) {
      if (this.pinned()) {
        btns.push({
          icon: "keep_off",
          action: () => {
            this.pinned.set(false);
          }
        });
      } else {
        btns.push({
          icon: "keep",
          action: () => {
            this.pinned.set(true);
          }
        });
      }
    }
    if (!onlyClose && !this.noMinimize()) {
      btns.push({
        icon: "remove",
        action: () => {
          this.toggleMinimized();
        }
      });
    }
    if (!onlyClose && !this.noMaximize()) {
      btns.push({
        icon: this.maximized() ? "stack" : "check_box_outline_blank",
        action: () => {
          this.toggleMaximized();
        }
      });
    }
    if (!this.noClose()) {
      btns.push({
        icon: "close",
        action: () => {
          this.close.emit();
        }
      });
    }
    return btns;
  });
  contextMenuBtns = computed(() => {
    const btns: {name: string; action: () => void}[] = [];
    const dialogs = this.manager.dialogs();
    if (dialogs.length > 1) {
      btns.push({
        name: "关闭其他窗口",
        action: () => {
          for (const dialog of dialogs) {
            if (dialog.id !== this.id) {
              dialog.close.emit();
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

  beActive() {
    const dialogs = this.manager.dialogs();
    this.active.set(true);
    for (const dialog of dialogs) {
      if (dialog.id !== this.id) {
        dialog.active.set(false);
      }
    }
  }
  toggleMinimized() {
    this.minimized.update((v) => !v);
  }
  toggleMaximized() {
    this.maximized.update((v) => !v);
  }

  dragDisabled = computed(() => this.maximized());
  private _positionBefore = signal<Readonly<Point>>({x: 0, y: 0});
  onDragEnded(event: CdkDragEnd) {
    this.position.set(event.source.getFreeDragPosition());
  }

  resizeHandles = signal<ResizeHandle[]>([
    {name: "top"},
    {name: "left"},
    {name: "right"},
    {name: "bottom"},
    {name: "top-left"},
    {name: "top-right"},
    {name: "bottom-left"},
    {name: "bottom-right"}
  ]);
  private _sizeBefore = signal<Readonly<Point>>({x: 0, y: 0});
  onResizeBefore() {
    const rect = this.dialogEl().nativeElement.getBoundingClientRect();
    this.size.set({x: rect.width, y: rect.height});
    this._sizeBefore.set({...this.size()});
    this._positionBefore.set({...this.position()});
  }
  onResize(event: CdkDragMove, handle: ResizeHandle) {
    const {x: sizeX, y: sizeY} = this._sizeBefore();
    const {x: posX, y: posY} = this._positionBefore();
    const {x: dx, y: dy} = event.distance;
    const handlers: ObjectOf<() => void> = {
      top: () => {
        this.size.update(({x}) => ({x, y: sizeY - dy}));
        this.position.update(({x}) => ({x, y: posY + dy}));
      },
      left: () => {
        this.size.update(({y}) => ({x: sizeX - dx, y}));
        this.position.update(({y}) => ({x: posX + dx, y}));
      },
      right: () => {
        this.size.update(({y}) => ({x: sizeX + dx, y}));
      },
      bottom: () => {
        this.size.update(({x}) => ({x, y: sizeY + dy}));
      },
      "top-left": () => {
        this.size.set({x: sizeX - dx, y: sizeY - dy});
        this.position.set({x: posX + dx, y: posY + dy});
      },
      "top-right": () => {
        this.size.set({x: sizeX + dx, y: sizeY - dy});
        this.position.set({x: posX, y: posY + dy});
      },
      "bottom-left": () => {
        this.size.set({x: sizeX - dx, y: sizeY + dy});
        this.position.set({x: posX + dx, y: posY});
      },
      "bottom-right": () => {
        this.size.set({x: sizeX + dx, y: sizeY + dy});
      }
    };
    handlers[handle.name]();
    event.source.reset();
  }
}
