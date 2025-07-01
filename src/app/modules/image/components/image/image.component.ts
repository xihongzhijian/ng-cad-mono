import {animate, style, transition, trigger} from "@angular/animations";
import {
  AfterViewInit,
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  output,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {getElementVisiblePercentage, timeout} from "@lucilor/utils";
import {Property} from "csstype";
import {ImageEvent} from "./image.component.types";

const imgEmpty = "assets/images/empty.jpg";
const imgLoading = "assets/images/loading.gif";

@Component({
  selector: "app-image",
  templateUrl: "./image.component.html",
  styleUrls: ["./image.component.scss"],
  animations: [
    trigger("toggle", [
      transition(":enter", [style({transform: "scale(0)", opacity: 0}), animate("0.3s", style({transform: "scale(1)", opacity: 1}))]),
      transition(":leave", [style({transform: "scale(1)", opacity: 1}), animate("0.3s", style({transform: "scale(0)", opacity: 0}))])
    ])
  ],
  imports: [MatButtonModule, MatIconModule]
})
export class ImageComponent implements AfterViewInit {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostBinding("class") class: string[] = [];

  src = input.required<string | undefined>();
  bigPicSrc = input<string>();
  bigPicClickShowDisabled = input(false, {transform: booleanAttribute});
  prefix = input<string>();
  control = input<boolean>();
  loadingSrc = input<string>(imgLoading);
  emptySrc = input<string>(imgEmpty);
  objectFit = input<Property.ObjectFit>("contain");
  noLazy = input(false, {transform: booleanAttribute});
  imgLoad = output<ImageEvent>();
  imgError = output<ImageEvent>();
  imgEnd = output<ImageEvent>();

  loading = signal(false);
  error = signal(false);

  intersectionObserver = new IntersectionObserver((entries) => {
    if (entries.length < 1) {
      return;
    }
    const ratio = entries[0].intersectionRatio;
    if (ratio > 0 && this.updateCurrSrcPending) {
      this.updateCurrSrc(ratio);
    }
  });

  ngAfterViewInit() {
    const el = this.el.nativeElement;
    this.intersectionObserver.observe(el);
  }

  currSrc = signal("");
  updateCurrSrcPending = false;
  async updateCurrSrc(ratio?: number) {
    const src = this.src();
    const prefix = this.prefix();
    const el = this.el.nativeElement;
    if (!this.noLazy()) {
      if (typeof ratio !== "number") {
        ratio = getElementVisiblePercentage(el);
      }
      if (ratio <= 0) {
        this.updateCurrSrcPending = true;
        return;
      }
    }
    this.updateCurrSrcPending = false;
    const currSrc = this.getUrl(src, prefix);
    this.currSrc.set(currSrc);
    if (currSrc) {
      this.loading.set(true);
      this.error.set(false);
    } else {
      this.loading.set(false);
      this.error.set(false);
    }
  }
  updateCurrSrcEff = effect(() => this.updateCurrSrc());
  getUrl(url: string | undefined, prefix: string | undefined) {
    if (!url) {
      return "";
    }
    if (prefix && !/^(\/)|(http)/.test(url)) {
      if (!prefix.endsWith("/")) {
        prefix += "/";
      }
      return prefix + url;
    }
    return url;
  }

  classEff = effect(() => {
    setTimeout(() => {
      const cls = [];
      if (this.loading()) {
        cls.push("loading");
      }
      if (this.error()) {
        cls.push("error");
      }
      this.class = cls;
    }, 0);
  });

  onLoad(event: Event) {
    this.loading.set(false);
    this.imgLoad.emit({event});
    this.imgEnd.emit({event});
  }
  onError(event: Event) {
    this.loading.set(false);
    this.error.set(true);
    this.imgError.emit({event});
    this.imgEnd.emit({event});
  }

  currBigPicSrc = computed(() => {
    const bigPicSrc = this.bigPicSrc();
    const prefix = this.prefix();
    return this.getUrl(bigPicSrc, prefix);
  });
  bigPicDiv = viewChild<ElementRef<HTMLDivElement>>("bigPicDiv");
  bigPicVisible = signal(false);
  async showBigPic() {
    const bigPicSrc = this.bigPicSrc();
    const bigPicDiv = this.bigPicDiv();
    if (bigPicSrc && bigPicDiv) {
      const el = bigPicDiv.nativeElement;
      document.body.append(el);
      bigPicDiv.nativeElement.style.display = "flex";
      await timeout();
      this.bigPicVisible.set(true);
    }
  }
  async hideBigPic() {
    const bigPicSrc = this.bigPicSrc();
    const bigPicDiv = this.bigPicDiv();
    if (bigPicSrc && bigPicDiv) {
      this.bigPicVisible.set(false);
      await timeout(300);
      const el = bigPicDiv.nativeElement;
      this.el.nativeElement.append(el);
      bigPicDiv.nativeElement.style.display = "none";
    }
  }

  private _getDomMatrix(el: HTMLElement) {
    return new DOMMatrix(getComputedStyle(el).transform);
  }
  onWheel(event: WheelEvent) {
    if (!this.control()) {
      return;
    }
    event.stopPropagation();
    const img = event.target as HTMLImageElement;
    const matrix = this._getDomMatrix(img);
    const scale = event.deltaY < 0 ? 1.1 : 0.9;
    const {left, top, width, height} = img.getBoundingClientRect();
    const offsetX = ((event.clientX - left) / width) * 100;
    const offsetY = ((event.clientY - top) / height) * 100;
    matrix.scaleSelf(scale);
    img.style.transform = matrix.toString();
    img.style.transformOrigin = `${offsetX}% ${offsetY}%`;
  }
  onPointerDown(event: PointerEvent) {
    if (!this.control()) {
      return;
    }
    event.stopPropagation();
    const img = event.target as HTMLImageElement;
    img.setAttribute("x", event.clientX.toString());
    img.setAttribute("y", event.clientY.toString());
    const lastX = 0;
    const lastY = 0;
    const matrix = this._getDomMatrix(img);
    matrix.translateSelf(event.clientX - lastX, event.clientY - lastY);
  }
  onPointerMove(event: PointerEvent) {
    if (!this.control()) {
      return;
    }
    event.stopPropagation();
    const img = event.target as HTMLImageElement;
    if (!img.hasAttribute("x") || !img.hasAttribute("y")) {
      return;
    }
    const x = parseFloat(img.getAttribute("x") || "0");
    const y = parseFloat(img.getAttribute("y") || "0");
    const matrix = this._getDomMatrix(img);
    matrix.translateSelf(event.clientX - x, event.clientY - y);
    img.style.transform = matrix.toString();
    img.setAttribute("x", event.clientX.toString());
    img.setAttribute("y", event.clientY.toString());
  }
  onPointerUp(event: PointerEvent) {
    if (!this.control()) {
      return;
    }
    event.stopPropagation();
    const img = event.target as HTMLImageElement;
    img.removeAttribute("x");
    img.removeAttribute("y");
  }

  clickImgContainer() {
    if (!this.bigPicClickShowDisabled()) {
      this.showBigPic();
    }
  }
}
