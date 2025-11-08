import {MatrixLike} from "./matrix";
import {Point} from "./point";

export abstract class Curve {
  abstract get length(): number;

  abstract getPoint(t: number): Point;

  abstract transform(matrix: MatrixLike): this;

  abstract contains(object: Point | this, extend?: boolean, tol?: number): boolean;

  abstract intersects(target: Curve, extend?: boolean, refPoint?: Point, tol?: number): Point[];
}
