import {OverlayModule} from "@angular/cdk/overlay";
import {
  AfterViewInit,
  type AnimationCallbackEvent,
  booleanAttribute,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  output,
  signal
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {imgEmpty, imgLoading} from "@app/app.common";
import {getElementVisiblePercentage} from "@lucilor/utils";
import {Property} from "csstype";
import {ImageEvent} from "./image.component.types";

@Component({
  selector: "app-image",
  templateUrl: "./image.component.html",
  styleUrls: ["./image.component.scss"],
  imports: [MatButtonModule, MatIconModule, OverlayModule]
})
export class ImageComponent implements AfterViewInit {
  private cd = inject(ChangeDetectorRef);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostBinding("class") class: string[] = [];

  src = input.required<string | undefined>();
  bigPicSrc = input<string>();
  bigPicClickShowDisabled = input(false, {transform: booleanAttribute});
  prefix = input<string>();
  control = input(false, {transform: booleanAttribute});
  loadingSrc = input<string>(imgLoading);
  emptySrc = input<string>(imgEmpty);
  objectFit = input<Property.ObjectFit>("contain");
  noLazy = input(false, {transform: booleanAttribute});
  noLoading = input(false, {transform: booleanAttribute});
  imgLoad = output<ImageEvent>();
  imgError = output<ImageEvent>();
  imgEnd = output<ImageEvent>();

  loading = signal(false);
  error = signal(false);
  controlBigPic = signal(true);

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
    const cls = [];
    if (this.loading()) {
      cls.push("loading");
    }
    if (this.error()) {
      cls.push("error");
    }
    this.class = cls;
    this.cd.markForCheck();
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
  bigPicVisible = signal(false);
  showBigPic() {
    this.bigPicVisible.set(true);
  }
  hideBigPic() {
    this.bigPicVisible.set(false);
  }

  onBigPicEnter(event: AnimationCallbackEvent) {
    this.runScaleAnimation(event, 0, 1);
  }

  onBigPicLeave(event: AnimationCallbackEvent) {
    this.runScaleAnimation(event, 1, 0);
  }

  private runScaleAnimation(event: AnimationCallbackEvent, from: number, to: number) {
    const animation = event.target.animate(
      [
        {transform: `scale(${from})`, opacity: from === 0 ? 0 : 1},
        {transform: `scale(${to})`, opacity: to === 0 ? 0 : 1}
      ],
      {duration: 300, easing: "ease", fill: "both"}
    );
    const done = () => event.animationComplete();
    animation.addEventListener("finish", done, {once: true});
    animation.addEventListener("cancel", done, {once: true});
  }

  private _getDomMatrix(el: HTMLElement) {
    return new DOMMatrix(getComputedStyle(el).transform);
  }
  private _pointerTargetScale = 1;
  private _pointerTargetPressed = false;
  private _pointerTargetMoved = false;
  onWheel(event: WheelEvent) {
    const {target} = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    event.stopPropagation();
    const matrix = this._getDomMatrix(target);
    const scale = event.deltaY < 0 ? 1.1 : 0.9;
    const {left, top, width, height} = target.getBoundingClientRect();
    const offsetX = ((event.clientX - left) / width) * 100;
    const offsetY = ((event.clientY - top) / height) * 100;
    matrix.scaleSelf(scale);
    target.style.transform = matrix.toString();
    target.style.transformOrigin = `${offsetX}% ${offsetY}%`;
    this._pointerTargetScale *= scale;
  }
  onPointerDown(event: PointerEvent) {
    const {target} = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    event.stopPropagation();
    target.setAttribute("x", event.clientX.toString());
    target.setAttribute("y", event.clientY.toString());
    const lastX = 0;
    const lastY = 0;
    const matrix = this._getDomMatrix(target);
    matrix.translateSelf(event.clientX - lastX, event.clientY - lastY);
    this._pointerTargetPressed = true;
    this._pointerTargetMoved = false;
  }
  onPointerMove(event: PointerEvent) {
    const {target} = event;
    if (!(target instanceof HTMLElement) || !this._pointerTargetPressed) {
      return;
    }
    event.stopPropagation();
    const x = parseFloat(target.getAttribute("x") || "0");
    const y = parseFloat(target.getAttribute("y") || "0");
    const scale = this._pointerTargetScale;
    const dx = (event.clientX - x) / scale;
    const dy = (event.clientY - y) / scale;
    const matrix = this._getDomMatrix(target);
    matrix.translateSelf(dx, dy);
    target.style.transform = matrix.toString();
    target.setAttribute("x", event.clientX.toString());
    target.setAttribute("y", event.clientY.toString());
    this._pointerTargetMoved = true;
  }
  onPointerUp(event: PointerEvent) {
    const {target} = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    event.stopPropagation();
    target.removeAttribute("x");
    target.removeAttribute("y");
    this._pointerTargetPressed = false;
    this._pointerTargetMoved = false;
  }

  onSmallPicWheel(event: WheelEvent) {
    if (!this.control()) {
      return;
    }
    this.onWheel(event);
  }
  onSmallPicPointerDown(event: PointerEvent) {
    if (!this.control()) {
      return;
    }
    this.onPointerDown(event);
  }
  onSmallPicPointerMove(event: PointerEvent) {
    if (!this.control()) {
      return;
    }
    this.onPointerMove(event);
  }
  onSmallPicPointerUp(event: PointerEvent) {
    if (!this.control()) {
      return;
    }
    this.onPointerUp(event);
  }

  onBigPicWheel(event: WheelEvent) {
    if (!this.controlBigPic()) {
      return;
    }
    this.onWheel(event);
  }
  onBigPicPointerDown(event: PointerEvent) {
    if (!this.controlBigPic()) {
      return;
    }
    this.onPointerDown(event);
  }
  onBigPicPointerMove(event: PointerEvent) {
    if (!this.controlBigPic()) {
      return;
    }
    this.onPointerMove(event);
  }
  onBigPicPointerUp(event: PointerEvent) {
    if (!this.controlBigPic()) {
      return;
    }
    if (!this._pointerTargetMoved) {
      this.hideBigPic();
    }
    this.onPointerUp(event);
  }

  clickImgContainer(event: MouseEvent) {
    if (!this.bigPicClickShowDisabled() && this.currBigPicSrc()) {
      this.showBigPic();
      event.stopPropagation();
    }
  }

  onBigPicOuterClick(event: MouseEvent) {
    this.hideBigPic();
    event.stopPropagation();
  }
}
