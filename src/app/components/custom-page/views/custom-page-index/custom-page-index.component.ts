import {ChangeDetectionStrategy, Component, HostBinding, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatTabsModule} from "@angular/material/tabs";
import {setGlobal} from "@app/app.common";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentsMenuComponent} from "../../menus/page-components-menu/page-components-menu.component";
import {PageConfigMenuComponent} from "../../menus/page-config-menu/page-config-menu.component";
import {Page} from "../../models/page";
import {pageComponentInfos, PageComponentName} from "../../models/page-component-infos";
import {PageComponentBase} from "../../models/page-components/page-component-base";

@Component({
  selector: "app-custom-page-index",
  standalone: true,
  imports: [MatButtonModule, MatTabsModule, NgScrollbarModule, PageComponentsMenuComponent, PageConfigMenuComponent],
  templateUrl: "./custom-page-index.component.html",
  styleUrl: "./custom-page-index.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomPageIndexComponent implements OnInit {
  @HostBinding("class") class = "ng-page";

  page = new Page();
  pageStyle = signal<ReturnType<Page["getStyle"]>>({});
  workSpaceStyle = signal<Properties>({backgroundColor: "gray"});
  pageComponentItems = signal<{key: PageComponentName; component: PageComponentBase}[]>([]);

  pageContainer = viewChild.required<HTMLDivElement>("pageContainer");

  ngOnInit() {
    setGlobal("customPage", this);
    this.updatePage();
  }

  updatePage() {
    this.pageStyle.set(this.page.getStyle());
  }

  onPageChanged() {
    this.updatePage();
  }

  addComponent(key: PageComponentName) {
    const info = pageComponentInfos[key];
    const component = new info.class(info.name + "组件");
    component.background = "black";
    component.size.set(100, 100);
    this.pageComponentItems.update((value) => [...value, {key, component}]);
  }
}
