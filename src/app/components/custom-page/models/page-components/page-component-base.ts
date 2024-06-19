import {Angle, Point} from "@lucilor/utils";
import {Properties, Property} from "csstype";
import {cloneDeep} from "lodash";
import {v4} from "uuid";
import {pageComponentInfos, PageComponentType} from "../page-component-infos";

export abstract class PageComponentBase {
  abstract readonly type: string;
  id = v4();
  size = new Point(0, 0);
  position = new Point(0, 0);
  scale = new Point(1, 1);
  anchor = new Point(0.5, 0.5);
  rotation = new Angle(0, "deg");
  border: Property.Border = "none";
  background: Property.Background = "transparent";
  color: Property.Color = "black";

  protected _locked = false;
  protected _hidden = false;
  styleOverrides: Properties = {};

  constructor(public name: string) {}

  import(data: ReturnType<typeof this.export>) {
    if (data.type !== this.type) {
      throw new Error(`Invalid component type: ${data.type}, expected: ${this.type}`);
    }
    this.id = data.id;
    this.name = data.name;
    this.size.copy(data.size);
    this.position.copy(data.position);
    this.scale.copy(data.scale);
    this.anchor.copy(data.anchor);
    this.rotation.deg = data.rotation;
    this.border = data.border;
    this.background = data.background;
    this.color = data.color;
  }
  export() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
      size: this.size.toArray(),
      position: this.position.toArray(),
      scale: this.scale.toArray(),
      anchor: this.anchor.toArray(),
      rotation: this.rotation.deg,
      border: this.border,
      background: this.background,
      color: this.color,
      styleOverrides: cloneDeep(this.styleOverrides)
    };
  }
  clone(resetId?: boolean): this {
    const component = new (this.constructor as any)(this.name);
    const data = this.export();
    if (resetId) {
      data.id = component.id;
    }
    component.import(data);
    return component;
  }

  getStyle(): Properties {
    const {x: scaleX, y: scaleY} = this.scale;
    let rotation = "";
    if (this.rotation.unit === "deg") {
      rotation = `${this.rotation.deg}deg`;
    } else if (this.rotation.unit === "rad") {
      rotation = `${this.rotation.rad}rad`;
    }
    const {resizable} = pageComponentInfos[this.type as PageComponentType] || {};
    return {
      width: resizable.x ? `${this.size.x}px` : "auto",
      height: resizable.y ? `${this.size.y}px` : "auto",
      left: `${this.position.x}px`,
      top: `${this.position.y}px`,
      transform: `scale(${scaleX},${scaleY}) rotate(${rotation})`,
      transformOrigin: `${this.anchor.x * 100}% ${this.anchor.y * 100}%`,
      background: this.background,
      border: this.border,
      color: this.color,
      display: this._hidden ? "none" : "block",
      ...this.styleOverrides
    };
  }

  isLocked() {
    return this._locked;
  }
  lock() {
    this._locked = true;
  }
  unlock() {
    this._locked = false;
  }
  toggleLock() {
    this._locked = !this._locked;
  }

  isHidden() {
    return this._hidden;
  }
  hide() {
    this._hidden = true;
  }
  show() {
    this._hidden = false;
  }
  toggleHidden() {
    this._hidden = !this._hidden;
  }
}
