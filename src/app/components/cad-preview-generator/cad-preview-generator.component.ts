import {Component, computed, effect, HostBinding, input, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {imgLoading} from "@app/app.common";
import {getCadPreviewRaw} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {toFixed} from "@app/utils/func";
import {getTrbl, Trbl, trblItems} from "@app/utils/trbl";
import {CadData} from "@lucilor/cad-viewer";
import {downloadByUrl, Rectangle} from "@lucilor/utils";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {getInputInfoGroup, getUnifiedInputs, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import Color, {ColorInstance} from "color";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";

@Component({
  selector: "app-cad-preview-generator",
  imports: [ImageComponent, InputComponent, MatButtonModule, MatSlideToggleModule, NgScrollbarModule],
  templateUrl: "./cad-preview-generator.component.html",
  styleUrl: "./cad-preview-generator.component.scss"
})
export class CadPreviewGeneratorComponent {
  @HostBinding("class") class = ["ng-page"];

  collection = input.required<CadCollection>();
  data = input.required<CadData>();
  optionsInput = input<Partial<CadPreviewGeneratorOptions> | undefined>(undefined, {alias: "options"});

  options = signal<CadPreviewGeneratorOptions>({
    showGongshi: true,
    showLineLength: true,
    showDimensions: true,
    backgroundColor: new Color("white"),
    padding: getTrbl(10)
  });
  optionsInputEff = effect(() => {
    this.options.update((v) => ({...v, ...this.optionsInput()}));
  });
  optionsEff = effect(() => {
    this.generatePreview();
  });

  inputInfos = computed(() => {
    const options = this.options();
    const onChange = () => {
      this.options.set({...options});
    };
    const getter = new InputInfoWithDataGetter(options, {onChange});
    const booleanInputOptions: Parameters<typeof getter.boolean>[1] = {appearance: "switch", style: {flex: "0 0 auto", width: "auto"}};
    const getterPadding = new InputInfoWithDataGetter(options.padding, {onChange});
    return [
      getInputInfoGroup([
        getter.boolean("showGongshi", {label: "显示公式", ...booleanInputOptions}),
        getter.boolean("showLineLength", {label: "显示线段长度", ...booleanInputOptions}),
        getter.boolean("showDimensions", {label: "显示标注", ...booleanInputOptions})
      ]),
      getter.color("backgroundColor", {label: "背景颜色", options: ["white", "black"].map((c) => new Color(c))}),
      getUnifiedInputs(
        "边距",
        trblItems.map(({name, index}) => getterPadding.numberWithUnit(index, "mm", {label: name})),
        options.padding,
        {inputStyle: {flex: "0 0 25%"}}
      )
    ];
  });

  previewSrc = signal("");
  previewData = signal<CadData | undefined>(undefined);
  async generatePreview() {
    this.previewSrc.set(imgLoading);
    const options = this.options();
    const cad = await getCadPreviewRaw(this.collection(), this.data(), {
      showFenti: true,
      config: {
        reverseSimilarColor: true,
        hideLineGongshi: !options.showGongshi,
        hideLineLength: !options.showLineLength,
        hideDimensions: !options.showDimensions,
        backgroundColor: options.backgroundColor.string(),
        padding: options.padding
      }
    });
    const {width, height} = cad.data.getBoundingRect();
    this.previewData.set(cad.data);
    cad.resize(width + options.padding[1] + options.padding[3], height + options.padding[0] + options.padding[2]);
    cad.center();
    const src = await cad.toDataURL();
    this.previewSrc.set(src);
    cad.destroy();
  }

  dataRect = computed(() => {
    const data = this.previewData();
    return data ? data.getBoundingRect() : new Rectangle();
  });
  dataWidth = computed(() => toFixed(this.dataRect().width, 2));
  dataHeight = computed(() => toFixed(this.dataRect().height, 2));

  imgWidth = computed(() => {
    const dataWidth = this.dataRect().width;
    const padding = this.options().padding;
    return Math.round(dataWidth + padding[1] + padding[3]);
  });
  imgHeight = computed(() => {
    const dataHeight = this.dataRect().height;
    const padding = this.options().padding;
    return Math.round(dataHeight + padding[0] + padding[2]);
  });
  smallImgMaxSize = [300, 300];
  imgStyle = computed(() => {
    const style: Properties = {
      width: `${this.imgWidth()}px`,
      height: `${this.imgHeight()}px`,
      maxWidth: `${this.smallImgMaxSize[0]}px`,
      maxHeight: `${this.smallImgMaxSize[1]}px`
    };
    return style;
  });

  downloadPreview() {
    const data = this.data();
    downloadByUrl(this.previewSrc(), {filename: `${data.name}.png`});
  }
}

export interface CadPreviewGeneratorOptions {
  showGongshi: boolean;
  showLineLength: boolean;
  showDimensions: boolean;
  backgroundColor: ColorInstance;
  padding: Trbl;
}
