import {ChangeDetectionStrategy, Component, output} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {pageComponentInfos, PageComponentType} from "../../models/page-component-infos";

@Component({
  selector: "app-page-components-select",
  standalone: true,
  imports: [ImageComponent, MatTooltipModule],
  templateUrl: "./page-components-select.component.html",
  styleUrl: "./page-components-select.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentsSeletComponent {
  chooseComponent = output<PageComponentType>();

  infos = Object.entries(pageComponentInfos).map(([key, value]) => ({key: key as PageComponentType, value}));

  onInfoClick(type: PageComponentType) {
    this.chooseComponent.emit(type);
  }
}
