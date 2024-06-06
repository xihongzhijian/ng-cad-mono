import {ChangeDetectionStrategy, Component, effect, HostBinding, inject, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatTabsModule} from "@angular/material/tabs";
import {session, setGlobal} from "@app/app.common";
import {MessageService} from "@app/modules/message/services/message.service";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentConfigComponent} from "../../menus/page-component-config/page-component-config.component";
import {PageComponentControlComponent} from "../../menus/page-component-control/page-component-control.component";
import {PageComponentsSeletComponent} from "../../menus/page-components-select/page-components-select.component";
import {PageConfigComponent} from "../../menus/page-config/page-config.component";
import {Page, PageConfig} from "../../models/page";
import {pageComponentInfos, PageComponentType} from "../../models/page-component-infos";
import {PageComponentBase} from "../../models/page-components/page-component-base";

@Component({
  selector: "app-custom-page-index",
  standalone: true,
  imports: [
    MatButtonModule,
    MatTabsModule,
    NgScrollbarModule,
    PageComponentConfigComponent,
    PageComponentControlComponent,
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

  pageContainer = viewChild.required<HTMLDivElement>("pageContainer");

  constructor() {
    setGlobal("customPage", this);
    effect(() => session.save(this._menuTabIndexKey, this.menuTabIndex()));
    effect(() => (this.page.components = this.pageComponents()));
    this.loadPageFromSession();
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
  private _pageDataKey = "customPageData";
  savePageToSession() {
    session.save(this._pageDataKey, this.page.export());
  }
  loadPageFromSession() {
    const data = session.load(this._pageDataKey);
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
    this.savePageToSession();
  }

  onPageConfigChanged(config: PageConfig) {
    this.page.setPageConfig(config);
    this.pageConfig.set(this.page.getPageConfig());
    this.updatePageStyle();
    this.savePageToSession();
  }

  onPageClick() {
    this.activePageComponent.set(null);
  }

  addComponent(type: PageComponentType) {
    const info = pageComponentInfos[type];
    const component = this.page.addComponent(type, info.name + "组件");
    component.background = "black";
    component.size.set(100, 100);
    this.updatePageComponents();
    this.savePageToSession();
  }
  clickComponent(event: Event, component: PageComponentBase) {
    event.stopPropagation();
    this.activePageComponent.set(component);
  }
  onPageComponentChanged(components: PageComponentBase[]) {
    this.page.components = components;
    this.updatePageComponents();
    this.savePageToSession();
  }
}
