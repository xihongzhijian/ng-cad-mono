import {ChangeDetectionStrategy, Component, input, OnInit, output, signal} from "@angular/core";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo, InputInfoColor, InputInfoNumber, InputInfoSelect} from "@app/modules/input/components/input.types";
import Color from "color";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getGroupStyle, getInputStyle} from "../../models/input-info-utils";
import {Page} from "../../models/page";
import {PageOrientation, PageSizeNameCustom, pageSizeNamesCustom} from "../../models/page-size";

@Component({
  selector: "app-page-config",
  standalone: true,
  imports: [InputComponent, NgScrollbarModule],
  templateUrl: "./page-config.component.html",
  styleUrl: "./page-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageConfigComponent implements OnInit {
  page = input.required<Page>();
  pageConfigChanged = output();
  workSpaceStyle = input.required<Properties>();
  workSpaceStyleChanged = output<Properties>();

  inputInfos = signal<InputInfo[]>([]);

  ngOnInit() {
    this.update();
  }

  update() {
    const page = this.page();
    const sizeNameInput: InputInfoSelect<any, PageSizeNameCustom> = {
      type: "select",
      label: "页面大小",
      options: pageSizeNamesCustom,
      value: page.sizeName,
      style: getInputStyle(),
      onChange: (val) => {
        if (val === "自定义") {
          orientationInput.disabled = true;
          widthInput.readonly = false;
          heightInput.readonly = false;
        } else {
          page.setSize({name: val, orientation: page.orientation});
          this.pageConfigChanged.emit();
          orientationInput.disabled = false;
          widthInput.readonly = true;
          widthInput.value = page.size.x;
          heightInput.readonly = true;
          heightInput.value = page.size.y;
        }
      }
    };
    const orientationInput: InputInfoSelect<any, PageOrientation> = {
      type: "select",
      label: "页面方向",
      options: [
        {label: "纵向", value: "portrait"},
        {label: "横向", value: "landscape"}
      ],
      value: page.orientation,
      style: getInputStyle(),
      onChange: (val) => {
        if (page.sizeName !== "自定义") {
          page.setSize({name: page.sizeName, orientation: val});
          this.pageConfigChanged.emit();
        }
      }
    };
    const widthInput: InputInfo = {
      type: "number",
      label: "页宽",
      value: page.size.x,
      suffixTexts: [{name: "mm"}],
      style: getInputStyle(),
      onChange: (val) => {
        page.setSize({width: val, height: page.size.y});
        this.pageConfigChanged.emit();
      }
    };
    const heightInput: InputInfo = {
      type: "number",
      label: "页高",
      value: page.size.y,
      suffixTexts: [{name: "mm"}],
      style: getInputStyle(),
      onChange: (val) => {
        page.setSize({width: page.size.x, height: val});
        this.pageConfigChanged.emit();
      }
    };
    const backgroundInput: InputInfoColor = {
      type: "color",
      label: "页面背景",
      value: Color(page.background),
      style: getInputStyle(),
      onChange: (val) => {
        page.background = val.string();
        this.pageConfigChanged.emit();
      }
    };
    const workSpaceBackgroundInput: InputInfoColor = {
      type: "color",
      label: "工作区背景",
      value: Color(this.workSpaceStyle().backgroundColor),
      style: getInputStyle(),
      onChange: (val) => {
        const style: Properties = {...this.workSpaceStyle(), backgroundColor: val.string()};
        this.workSpaceStyleChanged.emit(style);
      }
    };
    const paddingItems = [
      {name: "上", index: 0},
      {name: "下", index: 2},
      {name: "左", index: 3},
      {name: "右", index: 1}
    ];
    const paddingInput: InputInfoNumber[] = paddingItems.map(({name, index}) => {
      return {
        type: "number",
        label: name,
        value: page.padding[index],
        suffixTexts: [{name: "mm"}],
        style: getInputStyle({width: "50%"}),
        onChange: (val) => {
          page.padding[index] = val;
          this.pageConfigChanged.emit();
        }
      };
    });
    const inputInfos: InputInfo[] = [
      {type: "group", label: "", infos: [sizeNameInput, orientationInput], groupStyle: getGroupStyle()},
      {type: "group", label: "", infos: [widthInput, heightInput], groupStyle: getGroupStyle()},
      {type: "group", label: "", infos: [backgroundInput, workSpaceBackgroundInput], groupStyle: getGroupStyle()},
      {type: "group", label: "页边距", infos: paddingInput, groupStyle: getGroupStyle()}
    ];
    this.inputInfos.set(inputInfos);
  }
}
