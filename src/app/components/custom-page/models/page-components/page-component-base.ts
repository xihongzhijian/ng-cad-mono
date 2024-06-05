import {Angle, Point} from "@lucilor/utils";
import {Properties, Property} from "csstype";
import {v4} from "uuid";

export abstract class PageComponentBase {
  id = v4();
  size = new Point(0, 0);
  position = new Point(0, 0);
  scale = new Point(1, 1);
  anchor = new Point(0.5, 0.5);
  rotation = new Angle(0);
  border: Property.Border = "none";
  zIndex: Property.ZIndex = 0;
  background: Property.Background = "transparent";

  protected _locked = false;
  protected _hidden = false;
  styleOverrides: Properties = {};

  constructor(public name: string) {}

  import(data: ReturnType<typeof this.export>) {
    this.size.copy(data.size);
    this.position.copy(data.position);
    this.scale.copy(data.scale);
    this.anchor.copy(data.anchor);
    this.rotation.deg = data.rotation;
    this.border = data.border;
    this.zIndex = data.zIndex;
    this.background = data.background;
  }
  export() {
    return {
      id: this.id,
      name: this.name,
      size: this.size.toArray(),
      position: this.position.toArray(),
      scale: this.scale.toArray(),
      anchor: this.anchor.toArray(),
      rotation: this.rotation.deg,
      border: this.border,
      zIndex: this.zIndex,
      background: this.background,
      styleOverrides: this.styleOverrides
    };
  }

  getStyle(): Properties {
    const {x: scaleX, y: scaleY} = this.scale;
    let rotation = "";
    if (this.rotation.unit === "deg") {
      rotation = `${this.rotation.deg}deg`;
    } else if (this.rotation.unit === "rad") {
      rotation = `${this.rotation.rad}rad`;
    }
    return {
      width: `${this.size.x}px`,
      height: `${this.size.y}px`,
      left: `${this.position.x}px`,
      top: `${this.position.y}px`,
      transform: `scale(${scaleX},${scaleY}) rotate(${rotation}deg)`,
      transformOrigin: `${this.anchor.x * 100}% ${this.anchor.y * 100}%`,
      background: this.background,
      zIndex: this.zIndex,
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

  isHidden() {
    return this._hidden;
  }
  hide() {
    this._hidden = true;
  }
  show() {
    this._hidden = false;
  }
}
