import {ChangeDetectionStrategy, Component, HostBinding, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatTabsModule} from "@angular/material/tabs";
import {session, setGlobal} from "@app/app.common";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentControlComponent} from "../../menus/page-component-control/page-component-control.component";
import {PageComponentsMenuComponent} from "../../menus/page-components-menu/page-components-menu.component";
import {PageConfigMenuComponent} from "../../menus/page-config-menu/page-config-menu.component";
import {Page} from "../../models/page";
import {PageComponentItem, PageComponentName} from "../../models/page-component-infos";

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
  @HostBinding("class") class = "ng-page";

  page = new Page();
  pageStyle = signal<ReturnType<Page["getStyle"]>>({});
  workSpaceStyle = signal<Properties>({backgroundColor: "gray"});
  pageComponentItems = signal<PageComponentItem[]>([]);
  activePageComponentItem = signal<PageComponentItem | null>(null);

  pageContainer = viewChild.required<HTMLDivElement>("pageContainer");

  ngOnInit() {
    setGlobal("customPage", this);
    this.loadPageFromSession();
    this.updatePage();
  }

  updatePageStyle() {
    this.pageStyle.set(this.page.getStyle());
  }
  updatePageComponentItems() {
    this.pageComponentItems.set(this.page.componentItems);
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
    }
  }

  onPageConfigChanged() {
    this.updatePageStyle();
    this.savePageToSession();
  }

  addComponent(key: PageComponentName) {
    this.page.addComponent(key);
    this.updatePageComponentItems();
    this.savePageToSession();
  }

  clickComponent(item: PageComponentItem) {
    this.activePageComponentItem.set(item);
  }
}
