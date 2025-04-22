import {Component, inject} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getInsertName} from "@app/utils/get-value";
import {keysOf} from "@lucilor/utils";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {PageComponentInfos, pageComponentInfos, PageComponentType} from "../../models/page-component-infos";
import {flatMapPageComponents} from "../../models/page-component-utils";
import {PageComponentForm} from "../../models/page-components/page-component-form";
import {PageComponentRect} from "../../models/page-components/page-component-rect";
import {PageComponentText} from "../../models/page-components/page-component-text";
import {PageStatusService} from "../../services/page-status.service";

@Component({
  selector: "app-page-components-select",
  imports: [ImageComponent, MatTooltipModule],
  templateUrl: "./page-components-select.component.html",
  styleUrl: "./page-components-select.component.scss"
})
export class PageComponentsSelectComponent {
  private pageStatus = inject(PageStatusService);

  get components() {
    return this.pageStatus.components;
  }

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
    const names = Array.from(flatMapPageComponents(components, true, (v) => v.name));
    const component = new info.class(getInsertName(names, info.name + "组件"));
    component.background = "rgba(255,255,255,0)";
    component.size.set(100, 100);
    if (component instanceof PageComponentText) {
      component.text = "双击编辑文本";
    } else if (component instanceof PageComponentForm) {
      component.rows = 1;
      component.cols = 1;
      component.rowHeight = 22;
      component.labelWidth = 50;
      component.valueWidth = 100;
      component.labelPadding = [5, 5, 5, 5];
      component.valuePadding = [5, 5, 5, 5];
      component.borderColor = "black";
      component.borderWidth = 1;
      component.borderStyle = "solid";
    } else if (component instanceof PageComponentRect) {
      component.borderColor = "black";
      component.borderWidth = 1;
      component.borderStyle = "solid";
    }
    this.components.set([...components, component]);
  }
}
