import {ChangeDetectionStrategy, Component, computed, inject} from "@angular/core";
import {trblItems} from "@app/utils/trbl";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoColor, InputInfoNumber, InputInfoSelect} from "@modules/input/components/input.types";
import {getInputInfoGroup, getNumberUnitInput, getUnifiedInputs} from "@modules/input/components/input.utils";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageConfig} from "../../models/page";
import {PageOrientation, PageSizeNameCustom, pageSizeNamesCustom} from "../../models/page-size";
import {PageStatusService} from "../../services/page-status.service";

@Component({
  selector: "app-page-config",
  imports: [InputComponent, NgScrollbarModule],
  templateUrl: "./page-config.component.html",
  styleUrl: "./page-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageConfigComponent {
  private pageStatus = inject(PageStatusService);

  get config() {
    return this.pageStatus.pageConfig;
  }

  inputInfos = computed(() => {
    const config = this.config();
    const onChange = () => {
      this.config.set(cloneDeep(config));
    };
    const sizeNameInput: InputInfoSelect<PageConfig, PageSizeNameCustom> = {
      type: "select",
      label: "页面大小",
      options: pageSizeNamesCustom,
      model: {data: config, key: "sizeName"},
      onChange
    };
    const orientationInput: InputInfoSelect<PageConfig, PageOrientation> = {
      type: "select",
      label: "页面方向",
      options: [
        {label: "纵向", value: "portrait"},
        {label: "横向", value: "landscape"}
      ],
      model: {data: config, key: "orientation"},
      onChange
    };
    const isCustomSize = config.sizeName === "自定义";
    const widthInput: InputInfoNumber<PageConfig> = {
      ...getNumberUnitInput("页宽", "mm"),
      readonly: !isCustomSize,
      model: {data: config, key: "width"},
      onChange
    };
    const heightInput: InputInfoNumber<PageConfig> = {
      ...getNumberUnitInput("页高", "mm"),
      readonly: !isCustomSize,
      model: {data: config, key: "height"},
      onChange
    };
    const backgroundInnerInput: InputInfoColor<PageConfig> = {
      type: "color",
      label: "页面背景（内）",
      model: {data: config, key: "backgroundInnerColor"},
      onChange
    };
    const backgroundOuterInput: InputInfoColor<PageConfig> = {
      type: "color",
      label: "页面背景（外）",
      model: {data: config, key: "backgroundOuterColor"},
      onChange
    };
    const workSpaceBackgroundInput: InputInfoColor<PageConfig> = {
      type: "color",
      label: "工作区背景",
      model: {data: config, key: "workSpaceBgColor"},
      onChange
    };
    const paddingInputs: InputInfoNumber<PageConfig["padding"]>[] = trblItems.map(({name, index}) => {
      return getNumberUnitInput(name, "mm", {model: {data: config.padding, key: index}});
    });
    const inputInfos: InputInfo[] = [
      getInputInfoGroup([sizeNameInput, orientationInput]),
      getInputInfoGroup([widthInput, heightInput]),
      getInputInfoGroup([workSpaceBackgroundInput]),
      getInputInfoGroup([backgroundInnerInput, backgroundOuterInput]),
      getUnifiedInputs("页边距", paddingInputs, config.padding, {onChange})
    ];
    return inputInfos;
  });
}
