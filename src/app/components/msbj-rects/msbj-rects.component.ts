import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
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
import {Properties} from "csstype";
import {cloneDeep, random} from "lodash";
import {ClickStopPropagationDirective} from "../../modules/directives/click-stop-propagation.directive";
import {MsbjRectInfo, MsbjRectInfoRaw, MsbjRectSelectType} from "./msbj-rects.types";

@Component({
  selector: "app-msbj-rects",
  templateUrl: "./msbj-rects.component.html",
  styleUrls: ["./msbj-rects.component.scss"],
  imports: [ClickStopPropagationDirective, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MsbjRectsComponent {
  rectInfos = input.required<MsbjRectInfoRaw[]>();
  padding = input<TrblLike>(0);
  selectType = input<MsbjRectSelectType>("all");
  generateRectsStart = output();
  generateRectsEnd = output<GenerateRectsEndEvent>();
  activeRectInfo = model<MsbjRectInfo | null>(null);

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
    const {rect, bgColor, raw} = info;
    let order = 0;
    if (raw.isBuju) {
      order++;
    }
    if (typeof raw.排序 === "number") {
      order += raw.排序;
    }
    const style: Properties = {
      left: `${rect.min.x * 100}%`,
      top: `${rect.min.y * 100}%`,
      width: `${Math.max(0, rect.width) * 100}%`,
      height: `${Math.max(0, rect.height) * 100}%`,
      backgroundColor: bgColor,
      zIndex: order
    };
    if (this.getRectSelectable(info)) {
      style.cursor = "pointer";
    }
    return style;
  }

  rectInfosAbsolute = signal<MsbjRectInfo[]>([]);
  rectInfosRelative = signal<MsbjRectInfo[]>([]);
  rectInfosRelativeWithStyle = computed(() => {
    const rectInfos = this.rectInfosRelative();
    return rectInfos.map((info) => {
      const {rect, bgColor, raw} = info;
      let order = 0;
      if (raw.isBuju) {
        order++;
      }
      if (typeof raw.排序 === "number") {
        order += raw.排序;
      }
      const style: Properties = {
        left: `${rect.min.x * 100}%`,
        top: `${rect.min.y * 100}%`,
        width: `${Math.max(0, rect.width) * 100}%`,
        height: `${Math.max(0, rect.height) * 100}%`,
        backgroundColor: bgColor,
        zIndex: order
      };
      if (this.getRectSelectable(info)) {
        style.cursor = "pointer";
      }
      const info2 = new MsbjRectInfo(info.raw);
      info2.style = style;
      return info2;
    });
  });
  rectOuter = viewChild<ElementRef<HTMLDivElement>>("rectOuter");
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
    const {resetColors, isWindowResize} = opts || {};
    const {width, height, left, bottom} = totalRect;
    if (resetColors) {
      this._rectColors = {};
    }
    const rectColors = this._rectColors;
    const randRGB = () => random(this.rgbMin, this.rgbMax);
    let i = 0;
    const altColors = this.altColors;
    const randColor = () => {
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
          let color: string;
          const list = Object.values(rectColors);
          do {
            color = randColor();
          } while (list.includes(color));
          infoRelative.bgColor = color;
          rectColors[raw.vid] = color;
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
      await timeout(0);
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
      this.rectOuterStyle.update((v) => ({...v, padding: `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`}));
      await timeout(0);
      this.rectOuterStyle.update((v) => ({...v, opacity: "1"}));
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
