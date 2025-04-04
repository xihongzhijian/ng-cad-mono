import {Point, Rectangle} from "@lucilor/utils";
import {CadEntities} from "./cad-data/cad-entities";
import {CadDimension, CadEntity} from "./cad-data/cad-entity";
import {CadDimensionLinear} from "./cad-data/cad-entity/cad-dimension-linear";
import {CadViewer} from "./cad-viewer";
import {CadViewerSelectMode} from "./cad-viewer.types";

let pointer: {from: Point; to: Point} | null = null;
let button: number | null = null;
let multiSelector: HTMLDivElement | null = null;
let entitiesToDrag: CadEntities | null = null;
let entitiesNotToDrag: CadEntities | null = null;
let draggingDimension: CadDimension | null = null;
let movedEntities: CadEntities | null = null;

export interface CadEvents {
  click: [MouseEvent];
  entitiesadd: [CadEntities];
  entitiescopy: [CadEntities];
  entitiespaste: [CadEntities];
  entitiesremove: [CadEntities];
  entitiesselect: [CadEntities, boolean, MouseEvent | null];
  entitiesunselect: [CadEntities, boolean, MouseEvent | null];
  entityclick: [MouseEvent, CadEntity];
  entitydblclick: [MouseEvent, CadEntity];
  entitypointerdown: [PointerEvent, CadEntity];
  entitypointermove: [PointerEvent, CadEntity];
  entitypointerup: [PointerEvent, CadEntity];
  keydown: [KeyboardEvent];
  moveentities: [CadEntities, [number, number]];
  moveentitiesend: [CadEntities];
  pointerdown: [PointerEvent];
  pointerenter: [PointerEvent];
  pointerleave: [PointerEvent];
  pointermove: [PointerEvent];
  pointerup: [PointerEvent];
  render: [CadEntities];
  wheel: [WheelEvent];
  zoom: [];
}
export type CadEventCallBack<T extends keyof CadEvents> = (...params: CadEvents[T]) => void;

function onWheel(this: CadViewer, event: WheelEvent) {
  this.emit("wheel", event);
  if (!this.getConfig("enableZoom")) {
    return;
  }
  event.preventDefault();
  const step = 0.1;
  const {deltaY, clientX, clientY} = event;
  const {x, y} = this.getWorldPoint(clientX, clientY);
  const zoom = this.zoom();
  if (deltaY > 0) {
    this.zoom(zoom * (1 - step), [x, y]);
  } else if (deltaY < 0) {
    this.zoom(zoom * (1 + step), [x, y]);
  }
}

function onPointerDown(this: CadViewer, event: PointerEvent) {
  this.emit("pointerdown", event);
  event.preventDefault();
  const {clientX, clientY, button: eBtn} = event;
  const point = new Point(clientX, clientY);
  pointer = {from: point, to: point.clone()};
  button = eBtn;
  if (multiSelector) {
    multiSelector.remove();
    multiSelector = null;
  }
}

function onPointerMove(this: CadViewer, event: PointerEvent) {
  this.emit("pointermove", event);
  event.preventDefault();
  const {clientX, clientY, shiftKey} = event;
  if (this.entitiesCopied && !pointer) {
    const point = new Point(clientX, clientY);
    pointer = {from: point, to: point.clone()};
  }
  if (pointer) {
    const {selectMode, entityDraggable, dragAxis} = this.getConfig();
    const {from, to} = pointer;
    const translate = new Point(clientX, clientY).sub(to).divide(this.zoom());
    if (this.entitiesCopied) {
      const entities = this.entitiesCopied;
      translate.y = -translate.y;
      entities.transform({translate}, false);
    } else if ((button === 0 && shiftKey) || button === 1) {
      if (!dragAxis.includes("x")) {
        translate.x = 0;
      }
      if (!dragAxis.includes("y")) {
        translate.y = 0;
      }
      this.move(translate.x, -translate.y);
    } else if (button === 0) {
      const selectModesWithSelection: CadViewerSelectMode[] = ["single", "multiple"];
      if (entitiesToDrag && entitiesNotToDrag && entityDraggable) {
        if (Array.isArray(entityDraggable)) {
          const toRemove: CadEntity[] = [];
          entitiesToDrag.forEach((e) => {
            if (!entityDraggable.includes(e.type)) {
              toRemove.push(e);
            }
          });
          for (const e of toRemove) {
            entitiesToDrag.remove(e);
            entitiesNotToDrag.add(e);
          }
        }
        movedEntities = this.moveEntities(entitiesToDrag, entitiesNotToDrag, translate.x, -translate.y);
      } else if (draggingDimension) {
        const [p1, p2] = this.data.getDimensionPoints(draggingDimension).map((v) => this.getScreenPoint(v.x, v.y));
        if (p1 && p2) {
          const left = Math.min(p1.x, p2.x);
          const right = Math.max(p1.x, p2.x);
          const top = Math.max(p1.y, p2.y);
          const bottom = Math.min(p1.y, p2.y);
          if (draggingDimension instanceof CadDimensionLinear) {
            const distance = draggingDimension.getDistance();
            if (draggingDimension.axis === "x") {
              if (clientX >= left && clientX <= right) {
                draggingDimension.setDistance(distance - translate.y);
              } else if (clientY >= bottom && clientY <= top) {
                draggingDimension.switchAxis();
                if (clientX <= left) {
                  draggingDimension.setDistance(clientX - left);
                } else {
                  draggingDimension.setDistance(clientX - right);
                }
              } else {
                draggingDimension.setDistance(distance - translate.y);
              }
            }
            if (draggingDimension.axis === "y") {
              if (clientY >= bottom && clientY <= top) {
                draggingDimension.setDistance(distance + translate.x);
              } else if (clientX >= left && clientX <= right) {
                draggingDimension.switchAxis();
                if (clientY >= top) {
                  draggingDimension.setDistance(top - clientY);
                } else {
                  draggingDimension.setDistance(bottom - clientY);
                }
              } else {
                draggingDimension.setDistance(distance + translate.x);
              }
            }
          } else {
            console.log(draggingDimension);
          }
          this.render(draggingDimension);
        }
      } else if (selectModesWithSelection.includes(selectMode) && from.distanceTo(to) > 1) {
        if (!multiSelector) {
          multiSelector = document.createElement("div");
          multiSelector.classList.add("multi-selector");
          this.dom.appendChild(multiSelector);
        }
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y);
        const w = Math.abs(from.x - to.x);
        const h = Math.abs(from.y - to.y);
        multiSelector.style.left = x + "px";
        multiSelector.style.top = y + "px";
        multiSelector.style.width = w + "px";
        multiSelector.style.height = h + "px";
      }
    }
    to.set(clientX, clientY);
  }
}

function clearPointer(this: CadViewer, event: PointerEvent) {
  if (pointer) {
    const {from, to} = pointer;
    if (from.distanceTo(to) < 1) {
      this.emit("click", event);
      if (this.entitiesCopied) {
        this.emit("entitiespaste", this.entitiesCopied);
        this.entitiesCopied = undefined;
      } else {
        this.emit("click", event);
      }
    } else if (multiSelector) {
      const selectorRect = Rectangle.fromDomRect(multiSelector.getBoundingClientRect());
      const toSelect = Array<CadEntity>();
      this.data.getAllEntities().forEach((e) => {
        const elDomRect = e.el?.node.getBoundingClientRect();
        if (!elDomRect) {
          return;
        }
        const elRect = Rectangle.fromDomRect(elDomRect);
        if (selectorRect.contains(elRect)) {
          toSelect.push(e);
        }
      });
      const {selectMode} = this.getConfig();
      if (selectMode === "multiple") {
        if (toSelect.every((e) => e.selected)) {
          this.unselect(toSelect);
        } else {
          this.select(toSelect);
        }
      } else if (selectMode === "single") {
        this.unselectAll();
        this.select(toSelect[0]);
      }
      multiSelector.remove();
      multiSelector = null;
    }
  }
  pointer = null;
  button = null;
  if (movedEntities) {
    this.render(movedEntities);
    this.emit("moveentitiesend", movedEntities);
    movedEntities = null;
  }
  entitiesToDrag = entitiesNotToDrag = draggingDimension = null;
}

function onPointerUp(this: CadViewer, event: PointerEvent) {
  this.emit("pointerup", event);
  event.preventDefault();
  clearPointer.call(this, event);
  this.dom.focus();
}

function onPointerEnter(this: CadViewer, event: PointerEvent) {
  this.emit("pointerenter", event);
}

function onPointerLeave(this: CadViewer, event: PointerEvent) {
  this.emit("pointerleave", event);
  clearPointer.call(this, event);
}

function onKeyDown(this: CadViewer, event: KeyboardEvent) {
  this.emit("keydown", event);
  const hotKeys = this.getConfig("hotKeys");
  const checkHotKey = (type: keyof typeof hotKeys) => {
    const isHotKey = hotKeys[type].some(
      (k) => k.key === event.key && !!k.ctrl === !!event.ctrlKey && !!k.alt === !!event.altKey && !!k.shift === !!event.shiftKey
    );
    if (isHotKey) {
      event.preventDefault();
    }
    return isHotKey;
  };
  if (checkHotKey("selectAll")) {
    this.selectAll();
  } else if (checkHotKey("unSelectAll")) {
    this.unselectAll();
  } else if (checkHotKey("copyEntities")) {
    this.entitiesCopied = this.selected().clone(true);
    this.emit("entitiescopy", this.entitiesCopied);
  } else if (checkHotKey("pasteEntities")) {
    if (this.entitiesCopied) {
      this.emit("entitiespaste", this.entitiesCopied);
      this.entitiesCopied = undefined;
    }
  } else if (checkHotKey("deleteEntities")) {
    this.remove(this.selected());
  }
}

function onEntityClick(this: CadViewer, event: MouseEvent, entity: CadEntity) {
  this.emit("entityclick", event, entity);
  event.stopImmediatePropagation();
  if (!entity.selectable) {
    return;
  }
  const selectMode = this.getConfig("selectMode");
  if (selectMode === "single" || selectMode === "multiple") {
    if (selectMode === "single") {
      this.unselectAll();
    }
    if (entity.selected) {
      this.unselect(entity, event);
    } else {
      this.select(entity, event);
    }
  }
  this.dom.focus();
}

function onEntityDoubleClick(this: CadViewer, event: MouseEvent, entity: CadEntity) {
  this.emit("entitydblclick", event, entity);
  event.stopImmediatePropagation();
  if (!entity.selectable) {
    return;
  }
  this.dom.focus();
}

function onEntityPointerDown(this: CadViewer, event: PointerEvent, entity: CadEntity) {
  this.emit("entitypointerdown", event, entity);
  if (this.getConfig("entityDraggable") && entity.selectable) {
    if (entity instanceof CadDimension) {
      draggingDimension = entity;
    } else {
      entitiesToDrag = this.selected();
      entitiesNotToDrag = this.unselected();
    }
  }
}

function onEntityPointerMove(this: CadViewer, event: PointerEvent, entity: CadEntity) {
  this.emit("entitypointermove", event, entity);
}

function onEntityPointerUp(this: CadViewer, event: PointerEvent, entity: CadEntity) {
  this.emit("entitypointerup", event, entity);
}

export const controls = {
  onEntityClick,
  onEntityDoubleClick,
  onEntityPointerDown,
  onEntityPointerMove,
  onEntityPointerUp,
  onKeyDown,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  onWheel
};
