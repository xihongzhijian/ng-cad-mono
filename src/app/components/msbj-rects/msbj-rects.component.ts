import {
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  model,
  output,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {setGlobal} from "@app/app.common";
import {getTrbl, TrblLike} from "@app/utils/trbl";
import {Debounce} from "@decorators/debounce";
import {ObjectOf, Rectangle, timeout} from "@lucilor/utils";
import {AppStatusService} from "@services/app-status.service";
import Color from "color";
import {Properties} from "csstype";
import {cloneDeep, random} from "lodash";
import {ClickStopPropagationDirective} from "../../modules/directives/click-stop-propagation.directive";
import {MsbjRectInfo, MsbjRectInfoRaw, MsbjRectSelectType} from "./msbj-rects.types";

@Component({
  selector: "app-msbj-rects",
  templateUrl: "./msbj-rects.component.html",
  styleUrls: ["./msbj-rects.component.scss"],
  imports: [ClickStopPropagationDirective, MatButtonModule]
})
export class MsbjRectsComponent {
  private status = inject(AppStatusService);

  rectInfos = input.required<MsbjRectInfoRaw[]>();
  padding = input<TrblLike>(0);
  selectType = input<MsbjRectSelectType>("all");
  generateRectsStart = output();
  generateRectsEnd = output<GenerateRectsEndEvent>();
  activeRectInfo = model<MsbjRectInfo | null>(null);

  @HostBinding("class") class = "ng-page";

  rgbMin = 200;
  rgbMax = 245;
  altColors = [
    "rgb(231, 224, 200)",
    "rgb(218, 235, 202)",
    "rgb(240, 203, 230)",
    "rgb(234, 205, 230)",
    "rgb(208, 215, 243)",
    "rgb(211, 201, 201)",
    "rgb(219, 205, 212)",
    "rgb(245, 228, 239)",
    "rgb(231, 212, 203)",
    "rgb(237, 229, 223)"
  ];
  private _rectColors: ObjectOf<string> = {};

  constructor() {
    setGlobal("msbjRects", this);
  }

  @HostListener("window:resize")
  @Debounce(500)
  onWindowResize() {
    this.generateRects({isWindowResize: true});
  }

  getRectSelectable(info: MsbjRectInfo) {
    switch (this.selectType()) {
      case "all":
        return true;
      case "bujuOnly":
        return info.raw.isBuju;
      case "none":
        return false;
    }
  }
  getRectStyle(info: MsbjRectInfo) {
    const {rect, bgColor} = info;
    const style: Properties = {
      left: `${rect.min.x * 100}%`,
      top: `${rect.min.y * 100}%`,
      width: `${Math.max(0, rect.width) * 100}%`,
      height: `${Math.max(0, rect.height) * 100}%`,
      backgroundColor: bgColor
    };
    if (this.getRectSelectable(info)) {
      style.cursor = "pointer";
    }
    return style;
  }
  sortRectInfos(infos: MsbjRectInfo[]) {
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i];
      if (typeof info.raw.排序 !== "number") {
        continue;
      }
      let minOrder = info.raw.排序;
      let minOrderIndex = -1;
      for (let j = i + 1; j < infos.length; j++) {
        const info2 = infos[j];
        if (typeof info2.raw.排序 !== "number") {
          continue;
        }
        if (info2.raw.排序 < minOrder) {
          minOrder = info2.raw.排序;
          minOrderIndex = j;
        }
      }
      if (minOrderIndex >= 0) {
        [infos[i], infos[minOrderIndex]] = [infos[minOrderIndex], infos[i]];
      }
    }
  }

  rectInfosAbsolute = signal<MsbjRectInfo[]>([]);
  rectInfosRelative = signal<MsbjRectInfo[]>([]);
  rectOuter = viewChild<ElementRef<HTMLDivElement>>("rectOuter");
  rectOuterPadding = signal(getTrbl(0));
  rectOuterStyle = signal<Properties>({});
  async generateRects(opts?: GenerateRectsOpts) {
    this.generateRectsStart.emit();
    const rectInfosAbsolute: MsbjRectInfo[] = [];
    const rectInfosRelative: MsbjRectInfo[] = [];
    const totalRect = Rectangle.min;
    const names = new Set<string>();
    for (const infoRaw of this.rectInfos()) {
      const infoAbsolute = new MsbjRectInfo(infoRaw);
      rectInfosAbsolute.push(infoAbsolute);
      totalRect.expandByRect(infoAbsolute.rect);
      if (infoAbsolute.name) {
        names.add(infoAbsolute.name);
      }
    }
    this.sortRectInfos(rectInfosAbsolute);
    const {resetColors, isWindowResize} = opts || {};
    const {width, height, left, bottom} = totalRect;
    if (resetColors) {
      this._rectColors = {};
    }
    const rectColors = this._rectColors;
    const randRGB = () => random(this.rgbMin, this.rgbMax);
    let i = 0;
    const altColors = this.altColors;
    const randColorStr = () => {
      if (i < altColors.length) {
        return altColors[i++];
      }
      return `rgb(${randRGB()}, ${randRGB()}, ${randRGB()})`;
    };
    let charCode = 65;
    for (const infoAbsolute of rectInfosAbsolute) {
      const infoRelative = cloneDeep(infoAbsolute);
      const {min, max} = infoRelative.rect;
      min.set((min.x - left) / width, (min.y - bottom) / height);
      max.set((max.x - left) / width, (max.y - bottom) / height);
      const raw = infoRelative.raw;
      if (raw.isBuju) {
        if (rectColors[raw.vid]) {
          infoRelative.bgColor = rectColors[raw.vid];
        } else {
          let colorStr: string;
          const list = Object.values(rectColors);
          do {
            colorStr = randColorStr();
          } while (list.includes(colorStr));
          let color = new Color(colorStr);
          if (this.status.isDrakMode()) {
            if (color.isLight()) {
              color = color.darken(0.5);
            }
          } else {
            if (color.isDark()) {
              color = color.lighten(0.5);
            }
          }
          colorStr = color.rgb().string();
          infoRelative.bgColor = colorStr;
          rectColors[raw.vid] = colorStr;
        }
        if (!infoAbsolute.name) {
          let name: string;
          do {
            name = String.fromCharCode(charCode++);
          } while (names.has(name));
          infoAbsolute.name = name;
          infoRelative.name = name;
        }
      }
      infoRelative.style = this.getRectStyle(infoRelative);
      rectInfosRelative.push(infoRelative);
    }
    this.rectInfosAbsolute.set(rectInfosAbsolute);
    this.rectInfosRelative.set(rectInfosRelative);
    const el = this.rectOuter()?.nativeElement;
    if (el) {
      this.rectOuterStyle.update((v) => ({...v, padding: "0", opacity: "0"}));
      await timeout(100);
      const padding = getTrbl(this.padding());
      const elRect = el.getBoundingClientRect();
      const ratio1 = (elRect.width - padding[1] - padding[3]) / (elRect.height - padding[0] - padding[2]);
      const ratio2 = width / height;
      if (ratio1 > ratio2) {
        const diff = (elRect.width - elRect.height * ratio2) / 2;
        padding[1] += diff;
        padding[3] += diff;
      } else {
        const diff = (elRect.height - elRect.width / ratio2) / 2;
        padding[0] += diff;
        padding[2] += diff;
      }
      for (let j = 0; j < 4; j++) {
        padding[j] = Math.max(0, padding[j]);
      }
      this.rectOuterPadding.set(padding);
      this.rectOuterStyle.update((v) => ({
        ...v,
        padding: `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`,
        opacity: "1"
      }));
    }
    this.generateRectsEnd.emit({isWindowResize});
  }
  generateRectsEff = effect(() => {
    this.generateRects({resetColors: true});
  });

  bujuRectInfos = computed(() => {
    if (this.selectType() === "none") {
      return [];
    }
    return this.rectInfosRelative().filter((v) => v.raw.isBuju);
  });
  bujuRectStyle = computed(() => {
    const padding = this.rectOuterPadding();
    const style: Properties = {marginTop: `-${padding[2]}px`};
    return style;
  });

  onRectClick(info: MsbjRectInfo) {
    if (!this.getRectSelectable(info)) {
      return;
    }
    this.activeRectInfo.set(info);
  }
}

export interface GenerateRectsEndEvent {
  isWindowResize?: boolean;
}

export interface GenerateRectsOpts extends GenerateRectsEndEvent {
  resetColors?: boolean;
}
