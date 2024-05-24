import {Point} from "./point";

export abstract class Curve {
  abstract contains(object: Point | this, extend?: boolean, tol?: number): boolean;

  abstract intersects(target: Curve, extend?: boolean, refPoint?: Point, tol?: number): Point[];
}
