import {keysOf, ObjectOf} from "./types";

export const log = (msg: string, type?: string, styles: Partial<CSSStyleDeclaration> = {}, ...others: any[]) => {
  if (typeof type === "string" && type) {
    type = `[${type}] `;
  } else {
    type = "";
  }
  const div = document.createElement("div");
  keysOf(styles).forEach((key: any) => (div.style[key] = styles[key] as any));
  const cssText = div.style.cssText;
  let msg2 = type + msg;
  if (cssText) {
    if (!msg2.includes("%c")) {
      msg2 = "%c" + msg2;
    }
    console.log(msg2, cssText, ...others);
  } else {
    console.log(msg2, ...others);
  }
};

export class Timer {
  private _pool: ObjectOf<number> = {};
  fractionDigits = 2;
  get now() {
    return performance.now();
  }

  constructor(public logStyles?: Partial<CSSStyleDeclaration>) {}

  log(name: string, content: string) {
    if (content) {
      content += ": ";
    }
    const duration = this.getDuration(name) || 0;
    log(`${content}${Timer.getDurationString(duration, this.fractionDigits)}`, "Timer", this.logStyles);
    return this;
  }

  start(name: string, content?: string) {
    this._pool[name] = this.now;
    if (typeof content === "string") {
      this.log(name, content);
    }
    return this;
  }

  end(name: string, content?: string) {
    if (typeof content === "string") {
      this.log(name, content);
    }
    delete this._pool[name];
    return this;
  }

  getStartTime(name: string) {
    return this._pool[name] as number | undefined;
  }

  getDuration(name: string) {
    const start = this.getStartTime(name);
    if (typeof start !== "number") {
      return undefined;
    }
    return this.now - start;
  }

  static getDurationString(duration: number, fractionDigits = 2) {
    if (duration < 1000) {
      return duration.toFixed(0) + "ms";
    }
    if (duration < 1000 * 60) {
      return (duration / 1000).toFixed(fractionDigits) + "s";
    }
    if (duration < 1000 * 60 * 60) {
      return (duration / 1000 / 60).toFixed(fractionDigits) + "min";
    }
    return (duration / 1000 / 60 / 60).toFixed(fractionDigits) + "h";
  }
}
