import {ChangeDetectionStrategy, Component, effect, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatTabsModule} from "@angular/material/tabs";
import {session, setGlobal} from "@app/app.common";
import {MessageService} from "@app/modules/message/services/message.service";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentControlComponent} from "../../menus/page-component-control/page-component-control.component";
import {PageComponentsMenuComponent} from "../../menus/page-components-menu/page-components-menu.component";
import {PageConfigMenuComponent} from "../../menus/page-config-menu/page-config-menu.component";
import {Page} from "../../models/page";
import {pageComponentInfos, PageComponentType} from "../../models/page-component-infos";
import {PageComponentBase} from "../../models/page-components/page-component-base";

@Component({
  selector: "app-custom-page-index",
  standalone: true,
  imports: [
    MatButtonModule,
    MatTabsModule,
    NgScrollbarModule,
    PageComponentControlComponent,
    PageComponentsMenuComponent,
    PageConfigMenuComponent
  ],
  templateUrl: "./custom-page-index.component.html",
  styleUrl: "./custom-page-index.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomPageIndexComponent implements OnInit {
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  page = new Page();
  pageStyle = signal<ReturnType<Page["getStyle"]>>({});
  workSpaceStyle = signal<Properties>({backgroundColor: "gray"});
  pageComponents = signal<PageComponentBase[]>([]);
  activePageComponent = signal<PageComponentBase | null>(null);

  private _menuTabIndexKey = "customPageMenuTabIndex";
  menuTabIndex = signal(session.load(this._menuTabIndexKey) || 0);

  pageContainer = viewChild.required<HTMLDivElement>("pageContainer");

  constructor() {
    effect(() => {
      session.save(this._menuTabIndexKey, this.menuTabIndex());
    });
  }

  ngOnInit() {
    setGlobal("customPage", this);
    this.loadPageFromSession();
    this.updatePage();
  }

  updatePageStyle() {
    this.pageStyle.set(this.page.getStyle());
  }
  updatePageComponentItems() {
    this.pageComponents.set(this.page.components);
  }
  updatePage() {
    this.updatePageStyle();
    this.updatePageComponentItems();
  }
  private _pageDataKey = "customPageData";
  savePageToSession() {
    session.save(this._pageDataKey, this.page.export());
  }
  loadPageFromSession() {
    const data = session.load(this._pageDataKey);
    if (data) {
      this.page.import(data);
      this.updatePageStyle();
      this.updatePageComponentItems();
    } else {
      this.page.padding = [12, 12, 12, 12];
    }
  }

  async resetPage() {
    if (!(await this.message.confirm("确定要将当前页面重置为初始状态吗？"))) {
      return;
    }
    this.page = new Page();
    this.updatePage();
    this.savePageToSession();
  }

  onPageConfigChanged() {
    this.updatePageStyle();
    this.savePageToSession();
  }

  addComponent(type: PageComponentType) {
    const info = pageComponentInfos[type];
    const component = this.page.addComponent(type, info.name + "组件");
    component.background = "black";
    component.size.set(100, 100);
    this.updatePageComponentItems();
    this.savePageToSession();
  }

  clickComponent(component: PageComponentBase) {
    this.activePageComponent.set(component);
  }
}
