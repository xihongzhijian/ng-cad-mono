import {CdkDrag} from "@angular/cdk/drag-drop";
import {ChangeDetectionStrategy, Component, effect, HostBinding, inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {session, setGlobal} from "@app/app.common";
import {MessageService} from "@app/modules/message/services/message.service";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentConfigComponent} from "../../menus/page-component-config/page-component-config.component";
import {PageComponentsSeletComponent} from "../../menus/page-components-select/page-components-select.component";
import {PageConfigComponent} from "../../menus/page-config/page-config.component";
import {Page, PageConfig} from "../../models/page";
import {PageComponentBase} from "../../models/page-components/page-component-base";
import {PageComponentsDiaplayComponent} from "../page-components-diaplay/page-components-diaplay.component";

@Component({
  selector: "app-custom-page-index",
  standalone: true,
  imports: [
    CdkDrag,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    NgScrollbarModule,
    PageComponentConfigComponent,
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
  pageConfig = signal<PageConfig>(this.page.getPageConfig());
  pageStyle = signal<ReturnType<Page["getStyle"]>>({});
  workSpaceStyle = signal<Properties>({});
  pageComponents = signal<PageComponentBase[]>([]);
  activePageComponent = signal<PageComponentBase | null>(null);

  private _menuTabIndexKey = "customPageMenuTabIndex";
  menuTabIndex = signal(session.load(this._menuTabIndexKey) || 0);

  constructor() {
    setGlobal("customPage", this);
    effect(() => session.save(this._menuTabIndexKey, this.menuTabIndex()));
    effect(() => (this.page.components = this.pageComponents()));
    this.loadPageSnapshot();
  }

  updatePageStyle() {
    this.pageStyle.set(this.page.getStyle());
    this.workSpaceStyle.set({...this.page.workSpaceStyle});
  }
  updatePageComponents() {
    this.pageComponents.set([...this.page.components]);
  }
  updatePage() {
    this.updatePageStyle();
    this.updatePageComponents();
    this.pageConfig.set(this.page.getPageConfig());
  }
  private _pageSnapshotsKey = "customPageSnapshots";
  savePageSnapshot() {
    const snapshots = session.load(this._pageSnapshotsKey);
    if (Array.isArray(snapshots)) {
      snapshots.push(this.page.export());
      session.save(this._pageSnapshotsKey, snapshots);
    } else {
      session.save(this._pageSnapshotsKey, [this.page.export()]);
    }
  }
  loadPageSnapshot() {
    const snapshots = session.load(this._pageSnapshotsKey);
    const data = Array.isArray(snapshots) ? snapshots.at(-1) : null;
    if (data) {
      try {
        this.page.import(data);
      } catch (error) {
        this.initPage();
      }
    } else {
      this.initPage();
    }
    this.updatePage();
  }
  undo() {}
  redo() {}

  async initPage() {
    this.page = new Page();
    this.page.padding = [12, 12, 12, 12];
    this.page.workSpaceStyle.backgroundColor = "lightgray";
  }
  async resetPage() {
    if (!(await this.message.confirm("确定要将当前页面重置为初始状态吗？"))) {
      return;
    }
    this.initPage();
    this.updatePage();
    this.savePageSnapshot();
  }

  onPageConfigChanged(config: PageConfig) {
    this.page.setPageConfig(config);
    this.pageConfig.set(this.page.getPageConfig());
    this.updatePageStyle();
    this.savePageSnapshot();
  }

  onPageClick() {
    this.activePageComponent.set(null);
  }

  onPageComponentChanged(components: PageComponentBase[]) {
    this.page.components = components;
    const activeComponent = this.activePageComponent();
    if (activeComponent && !components.find((v) => v.id === activeComponent.id)) {
      this.activePageComponent.set(null);
    }
    this.updatePageComponents();
    this.savePageSnapshot();
  }
}
