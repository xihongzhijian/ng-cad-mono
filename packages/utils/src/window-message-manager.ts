import {EventEmitter} from "events";
import {getTypeOf} from "./misc";

export class WindowMessageManager extends EventEmitter {
  constructor(public messageType: string, public instance: any, public win?: Window | null) {
    super();
    window.addEventListener("message", this._onMessage);
  }

  private _onMessage = (async (event: MessageEvent) => {
    const data: MessageData = event.data;
    const {messageType, instance, win} = this;
    if (!data || getTypeOf(data) !== "object" || data.type !== messageType) {
      return;
    }
    if (!instance || typeof instance !== "object") {
      return;
    }
    if (!win || typeof win !== "object") {
      return;
    }
    this.emit(data.action, data.data);
    const fn = instance[data.action];
    if (typeof fn === "function") {
      try {
        const result = await fn.apply(instance, [data.data]);
        if (result) {
          this.postMessage(result.action, result.data);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }).bind(this);

  postMessage(action: string, data?: any) {
    const message: MessageData = {type: this.messageType, action, data};
    this.emit(action, data);
    this.win?.postMessage(message, "*");
  }

  waitForMessage<T = any>(action: string) {
    return new Promise<T>((resolve) => {
      this.once(action, resolve);
    });
  }

  destroy() {
    window.removeEventListener("message", this._onMessage);
    this.removeAllListeners();
  }
}

export interface MessageData {
  type: string;
  action: string;
  data: any;
}
