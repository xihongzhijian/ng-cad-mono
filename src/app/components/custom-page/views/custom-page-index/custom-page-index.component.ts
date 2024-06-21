import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {KeyEventItem, onKeyEvent, session, setGlobal} from "@app/app.common";
import {MessageService} from "@app/modules/message/services/message.service";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentConfig2Component} from "../../menus/page-component-config2/page-component-config2.component";
import {PageComponentConfigComponent} from "../../menus/page-component-config/page-component-config.component";
import {PageComponentsSeletComponent} from "../../menus/page-components-select/page-components-select.component";
import {PageConfigComponent} from "../../menus/page-config/page-config.component";
import {Page, PageConfig} from "../../models/page";
import {PageComponentTypeAny} from "../../models/page-component-infos";
import {flatPageComponents} from "../../models/page-component-utils";
import {PageSnapshotManager} from "../../models/page-snapshot-manager";
import {PageComponentsDiaplayComponent} from "../page-components-diaplay/page-components-diaplay.component";

@Component({
  selector: "app-custom-page-index",
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    NgScrollbarModule,
    PageComponentConfigComponent,
    PageComponentConfig2Component,
    PageComponentsDiaplayComponent,
    PageComponentsSeletComponent,
    PageConfigComponent
  ],
  templateUrl: "./custom-page-index.component.html",
  styleUrl: "./custom-page-index.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomPageIndexComponent {
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  page = new Page();
  psm = new PageSnapshotManager(session, 20);
  pageConfig = signal<PageConfig>(this.page.getPageConfig());
  pageStyle = signal<ReturnType<Page["getStyle"]>>({});
  pagePlaceholderStyle = signal<Properties>({});
  workSpaceStyle = signal<Properties>({});
  components = signal<PageComponentTypeAny[]>([]);
  activeComponent = signal<PageComponentTypeAny | null>(null);
  activeComponent2 = signal<PageComponentTypeAny | null>(null);
  canUndo = signal(false);
  canRedo = signal(false);
  showComponentMenu = signal(false);

  private _menuTabIndexKey = "customPageMenuTabIndex";
  menuTabIndex = signal(session.load(this._menuTabIndexKey) || 0);
  keyEventItems: KeyEventItem[] = [
    {key: "z", ctrl: true, action: () => this.undo()},
    {key: "y", ctrl: true, action: () => this.redo()}
  ];

  workSpaceEl = viewChild.required<ElementRef<HTMLDivElement>>("workSpaceEl");
  pageEl = viewChild.required<ElementRef<HTMLDivElement>>("pageEl");

  constructor() {
    setGlobal("customPage", this);
    effect(() => session.save(this._menuTabIndexKey, this.menuTabIndex()));
    effect(() => this.onComponentsChanged(), {allowSignalWrites: true});
    effect(() => this.onActiveComponentChanged(), {allowSignalWrites: true});
    this.loadPageSnapshot();
  }

  updatePageStyle() {
    this.pageStyle.set(this.page.getStyle());
    this.workSpaceStyle.set({...this.page.workSpaceStyle});
  }
  updatePageComponents() {
    this._noSaveOnComponentsChanged = true;
    this.components.set([...this.page.components]);
  }
  updatePage() {
    this.updatePageStyle();
    this.updatePageComponents();
    this.pageConfig.set(this.page.getPageConfig());
  }

  loadPageSnapshot() {
    const {snapshot, canUndo, canRedo} = this.psm.loadSnapshot();
    if (snapshot) {
      this.page.import(snapshot);
      this.updatePage();
    } else {
      this.initPage();
      this.updatePage();
    }
    this.canUndo.set(canUndo);
    this.canRedo.set(canRedo);
  }
  savePageSnapshot() {
    const {canUndo, canRedo} = this.psm.saveSnapshot(this.page.export());
    this.canUndo.set(canUndo);
    this.canRedo.set(canRedo);
  }
  undo() {
    const {snapshot, canUndo} = this.psm.undo();
    if (snapshot) {
      this.page.import(snapshot);
      this.updatePage();
    }
    this.canUndo.set(canUndo);
    this.canRedo.set(true);
  }
  redo() {
    const {snapshot, canRedo} = this.psm.redo();
    if (snapshot) {
      this.page.import(snapshot);
      this.updatePage();
    }
    this.canUndo.set(true);
    this.canRedo.set(canRedo);
  }
  resetPageSnapshot() {
    this.psm.reset();
    this.savePageSnapshot();
  }

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    onKeyEvent(event, this.keyEventItems);
  }

  async initPage() {
    this.page = new Page();
    this.page.padding = [12, 12, 12, 12];
    this.page.workSpaceStyle.backgroundColor = "lightgray";
    this.page.backgroundOuter = "pink";
  }
  async resetPage() {
    this.initPage();
    this.updatePage();
    this.savePageSnapshot();
  }
  async import() {
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    try {
      const data = JSON.parse(await file.text());
      this.page.import(data);
      this.updatePage();
      this.savePageSnapshot();
      await this.message.snack("导入成功");
    } catch (e) {
      console.error(e);
      await this.message.snack("导入失败");
    }
  }
  export() {
    const data = this.page.export();
    downloadByString(JSON.stringify(data), {filename: "page.json"});
  }

  onPageConfigChanged(config: PageConfig) {
    this.page.setPageConfig(config);
    this.pageConfig.set(this.page.getPageConfig());
    this.updatePageStyle();
    this.savePageSnapshot();
  }

  private _pagePointer: [number, number] | null = null;
  onPagePointerDown(event: PointerEvent) {
    this._pagePointer = [event.clientX, event.clientY];
  }
  onPagePointerUp(event: PointerEvent) {
    const target = event.target as HTMLElement;
    const isClickPage =
      target === this.pageEl().nativeElement || target.classList.contains("page-inner") || target.tagName === "APP-PAGE-COMPONENTS-DIAPLAY";
    if (!this._pagePointer || !isClickPage) {
      return;
    }
    const [x, y] = this._pagePointer;
    this._pagePointer = null;
    if (Math.abs(event.clientX - x) < 5 && Math.abs(event.clientY - y) < 5) {
      this.activeComponent.set(null);
    }
  }

  private _noSaveOnComponentsChanged = true;
  onComponentsChanged() {
    const components = this.components();
    const activeComponent = untracked(() => this.activeComponent());
    if (activeComponent) {
      for (const component of flatPageComponents(components, true)) {
        if (component.id === activeComponent.id) {
          this.activeComponent.set(component);
          break;
        }
      }
    }
    this.page.components = components;
    if (this._noSaveOnComponentsChanged) {
      this._noSaveOnComponentsChanged = false;
    } else {
      this.savePageSnapshot();
    }
  }
  onActiveComponentChanged() {
    const activeComponent = this.activeComponent();
    if (activeComponent) {
      this.showComponentMenu.set(true);
    }
  }
}
