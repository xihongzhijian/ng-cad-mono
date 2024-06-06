import {ChangeDetectionStrategy, Component, model} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getInsertName} from "@app/app.common";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {pageComponentInfos, PageComponentType} from "../../models/page-component-infos";
import {PageComponentBase} from "../../models/page-components/page-component-base";

@Component({
  selector: "app-page-components-select",
  standalone: true,
  imports: [ImageComponent, MatTooltipModule],
  templateUrl: "./page-components-select.component.html",
  styleUrl: "./page-components-select.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentsSeletComponent {
  components = model.required<PageComponentBase[]>();

  infos = Object.entries(pageComponentInfos).map(([key, value]) => ({key: key as PageComponentType, value}));

  addComponent(type: PageComponentType) {
    const info = pageComponentInfos[type];
    const components = this.components();
    const names = components.map((v) => v.name);
    const component = new info.class(getInsertName(names, info.name + "组件"));
    component.background = "black";
    component.size.set(100, 100);
    this.components.set([...components, component]);
  }
}
