import {Rectangle} from "./geometry";
import {MaybeArray, ObjectOf} from "./types";

export const dataURLtoBlob = (dataURL: string) => {
  const arr = dataURL.split(",");
  const mime = arr[0].split(":")[1].split(";")[0];
  const bstr = window.atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type: mime});
};

export const getDPI = () => {
  let dpiX = 0;
  let dpiY = 0;
  const tmpNode = document.createElement("div");
  tmpNode.style.cssText = "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden";
  document.body.appendChild(tmpNode);
  dpiX = tmpNode.offsetWidth;
  dpiY = tmpNode.offsetHeight;
  if (!(dpiX > 0) || !(dpiY > 0)) {
    console.warn("Unable to get screen dpi.Assuming dpi = 96.");
    dpiX = dpiY = 96;
  }
  tmpNode.remove();
  return [dpiX, dpiY] as [number, number];
};

export const timeout = <T>(time = 0, value?: T) =>
  new Promise<T | undefined>((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, time)
  );

export const getTypeOf = (value: any) => {
  const type = typeof value;
  if (type === "object") {
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return "array";
    }
  }
  if (type === "number" && isNaN(value)) {
    return "NaN";
  }
  return type;
};

export const isTypeOf: {
  (value: any, type: "string"): value is string;
  (value: any, type: "number"): value is number;
  (value: any, type: "bigint"): value is bigint;
  (value: any, type: "boolean"): value is boolean;
  (value: any, type: "symbol"): value is symbol;
  (value: any, type: "array"): value is any[];
  (value: any, type: "object"): value is ObjectOf<any>;
  (value: any, type: "function"): value is (...args: any[]) => any;
  (value: any, type: "undefined"): value is undefined;
  (value: any, type: "null"): value is null;
  (value: any, type: "NaN"): value is typeof NaN;
  (value: any, type: MaybeArray<ReturnType<typeof getTypeOf>>): boolean;
  <T>(value: any, type: MaybeArray<ReturnType<typeof getTypeOf>>): value is T;
} = <T = any>(value: any, type: MaybeArray<ReturnType<typeof getTypeOf>>): value is T => {
  const valueType = getTypeOf(value);
  if (Array.isArray(type)) {
    return type.includes(valueType);
  }
  return valueType === type;
};

export const getElementVisiblePercentage = (el: HTMLElement, parentEl = document.body) => {
  const rect0 = el.getBoundingClientRect();
  const parentRect0 = parentEl.getBoundingClientRect();
  const rect = new Rectangle([rect0.left, rect0.top], [rect0.right, rect0.bottom]);
  const elArea = rect.area;
  if (elArea <= 0) {
    return 0;
  }
  const parentRect = new Rectangle([parentRect0.left, parentRect0.top], [parentRect0.right, parentRect0.bottom]);
  const visibleArea = rect.intersects(parentRect)?.area || 0;
  const visiblePercentage = (visibleArea / elArea) * 100;
  return visiblePercentage;
};

export const px2mm = (px: number, dpi: number) => (px * 25.4) / dpi;
export const mm2px = (mm: number, dpi: number) => (mm * dpi) / 25.4;

export interface WaitForOpts {
  interval?: number;
  timeout?: number;
}
export const waitFor = async <T>(getter: () => T | null | undefined, opts?: WaitForOpts) => {
  const defaultOpts: Required<WaitForOpts> = {
    interval: 100,
    timeout: 10000
  };
  opts = {...defaultOpts, ...opts};
  const getVal = () => {
    const val = getter();
    if (val === null || val === undefined) {
      return null;
    }
    return val;
  };
  let val = getVal();
  if (val !== null) {
    return val;
  }
  await timeout(0);
  val = getVal();
  if (val !== null) {
    return val;
  }
  return new Promise<NonNullable<T>>((resolve, reject) => {
    const i = setInterval(() => {
      val = getVal();
      if (val !== null) {
        clearInterval(i);
        resolve(val);
      }
    }, opts.interval);
    setTimeout(() => {
      clearInterval(i);
      reject(new Error("Timeout!"));
    }, opts.timeout);
  });
};
