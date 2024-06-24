import {ChangeDetectionStrategy, Component, model} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getInsertName} from "@app/app.common";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {keysOf} from "@lucilor/utils";
import {PageComponentInfos, pageComponentInfos, PageComponentType, PageComponentTypeAny} from "../../models/page-component-infos";
import {getPageComponentNames} from "../../models/page-component-utils";
import {PageComponentText} from "../../models/page-components/page-component-text";

@Component({
  selector: "app-page-components-select",
  standalone: true,
  imports: [ImageComponent, MatTooltipModule],
  templateUrl: "./page-components-select.component.html",
  styleUrl: "./page-components-select.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentsSeletComponent {
  components = model.required<PageComponentTypeAny[]>();

  infos: {key: PageComponentType; value: PageComponentInfos[PageComponentType]}[];

  constructor() {
    this.infos = [];
    for (const key of keysOf(pageComponentInfos)) {
      if (key === "group") {
        continue;
      }
      this.infos.push({key, value: pageComponentInfos[key]});
    }
  }

  async addComponent(type: PageComponentType) {
    const info = pageComponentInfos[type];
    const components = this.components();
    const names = getPageComponentNames(components);
    const component = new info.class(getInsertName(names, info.name + "组件"));
    component.background = "rgba(255,255,255,0)";
    component.size.set(100, 100);
    if (component instanceof PageComponentText) {
      component.text = "双击编辑文本";
    }
    this.components.set([...components, component]);
  }
}
