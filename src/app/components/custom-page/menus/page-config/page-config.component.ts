import {ChangeDetectionStrategy, Component, computed, model} from "@angular/core";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo, InputInfoColor, InputInfoNumber, InputInfoSelect} from "@app/modules/input/components/input.types";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getGroupStyle, getInputStyle} from "../../models/input-info-utils";
import {PageConfig} from "../../models/page";
import {PageOrientation, PageSizeNameCustom, pageSizeNamesCustom} from "../../models/page-size";

@Component({
  selector: "app-page-config",
  standalone: true,
  imports: [InputComponent, NgScrollbarModule],
  templateUrl: "./page-config.component.html",
  styleUrl: "./page-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageConfigComponent {
  config = model.required<PageConfig>();

  inputInfos = computed(() => {
    const config = this.config();
    const onChange = () => this.config.set(cloneDeep(config));
    const sizeNameInput: InputInfoSelect<PageConfig, PageSizeNameCustom> = {
      type: "select",
      label: "页面大小",
      options: pageSizeNamesCustom,
      style: getInputStyle(),
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
      style: getInputStyle(),
      model: {data: config, key: "orientation"},
      onChange
    };
    const widthInput: InputInfoNumber<PageConfig> = {
      type: "number",
      label: "页宽",
      suffixTexts: [{name: "mm"}],
      style: getInputStyle(),
      model: {data: config, key: "width"},
      onChange
    };
    const heightInput: InputInfoNumber<PageConfig> = {
      type: "number",
      label: "页高",
      suffixTexts: [{name: "mm"}],
      style: getInputStyle(),
      model: {data: config, key: "height"},
      onChange
    };
    const backgroundInput: InputInfoColor<PageConfig> = {
      type: "color",
      label: "页面背景",
      style: getInputStyle(),
      model: {data: config, key: "backgroundColor"},
      onChange
    };
    const workSpaceBackgroundInput: InputInfoColor<PageConfig> = {
      type: "color",
      label: "工作区背景",
      style: getInputStyle(),
      model: {data: config, key: "workSpaceBgColor"},
      onChange
    };
    const paddingItems = [
      {name: "上", index: 0},
      {name: "下", index: 2},
      {name: "左", index: 3},
      {name: "右", index: 1}
    ];
    const paddingInput: InputInfoNumber<PageConfig["padding"]>[] = paddingItems.map(({name, index}) => {
      return {
        type: "number",
        label: name,
        suffixTexts: [{name: "mm"}],
        style: getInputStyle({width: "50%"}),
        model: {data: config.padding, key: index},
        onChange
      };
    });
    const inputInfos: InputInfo[] = [
      {type: "group", label: "", infos: [sizeNameInput, orientationInput], groupStyle: getGroupStyle()},
      {type: "group", label: "", infos: [widthInput, heightInput], groupStyle: getGroupStyle()},
      {type: "group", label: "", infos: [backgroundInput, workSpaceBackgroundInput], groupStyle: getGroupStyle()},
      {type: "group", label: "页边距", infos: paddingInput, groupStyle: getGroupStyle()}
    ];
    return inputInfos;
  });
}
