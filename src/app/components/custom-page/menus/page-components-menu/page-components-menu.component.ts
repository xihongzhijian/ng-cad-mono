import {ChangeDetectionStrategy, Component, output} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {pageComponentInfos, PageComponentName} from "../../models/page-component-infos";

@Component({
  selector: "app-page-components-menu",
  standalone: true,
  imports: [ImageComponent, MatTooltipModule],
  templateUrl: "./page-components-menu.component.html",
  styleUrl: "./page-components-menu.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentsMenuComponent {
  chooseComponent = output<PageComponentName>();

  infos = Object.entries(pageComponentInfos).map(([key, value]) => ({key: key as PageComponentName, value}));

  onInfoClick(key: PageComponentName) {
    this.chooseComponent.emit(key);
  }
}
