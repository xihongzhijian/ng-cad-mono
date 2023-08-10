import {Line} from "..";
import {Matrix, MatrixLike} from "./matrix";
import {DEFAULT_TOLERANCE} from "./numbers";

export type PointLike = number | number[] | {x: number; y: number};

export class Point {
  x: number;
  y: number;
  get isFinite() {
    return isFinite(this.x) && isFinite(this.y);
  }
  get isNaN() {
    return isNaN(this.x) || isNaN(this.y);
  }

  constructor(x?: number, y?: number);
  constructor(xy: PointLike);
  constructor(x: PointLike = 0, y?: number) {
    if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else if (typeof x === "number") {
      this.x = x;
      this.y = typeof y === "number" ? y : x;
    } else if (typeof x?.x === "number" && typeof x?.y === "number") {
      this.x = x.x;
      this.y = x.y;
    } else {
      this.x = this.y = 0;
    }
  }

  set(x: number, y = x) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(point: PointLike) {
    const {x, y} = new Point(point);
    return this.set(x, y);
  }

  equals(point: Point, tolerance = DEFAULT_TOLERANCE) {
    const {x, y} = point;
    return Math.abs(x - this.x) <= tolerance && Math.abs(y - this.y) <= tolerance;
  }

  add(point?: Point): Point;
  add(x?: number, y?: number): Point;
  add(x?: Point | number, y?: number): Point {
    if (x instanceof Point) {
      this.x += x.x;
      this.y += x.y;
      return this;
    }
    return this.add(new Point(x, y));
  }

  sub(point?: Point): Point;
  sub(x?: number, y?: number): Point;
  sub(x?: Point | number, y?: number): Point {
    if (x instanceof Point) {
      this.x -= x.x;
      this.y -= x.y;
      return this;
    }
    return this.sub(new Point(x, y));
  }

  multiply(point?: Point): Point;
  multiply(x?: number, y?: number): Point;
  multiply(x?: Point | number, y?: number): Point {
    if (x instanceof Point) {
      this.x *= x.x;
      this.y *= x.y;
      return this;
    }
    return this.multiply(new Point(x, y));
  }

  divide(point?: Point): Point;
  divide(x?: number, y?: number): Point;
  divide(x?: Point | number, y?: number): Point {
    if (x instanceof Point) {
      this.x /= x.x;
      this.y /= x.y;
      return this;
    }
    return this.divide(new Point(x, y));
  }

  clone() {
    return new Point(this.x, this.y);
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  distanceTo(point: Point | Line) {
    const {x, y} = this;
    if (point instanceof Point) {
      return Math.hypot(x - point.x, y - point.y);
    } else {
      return point.distanceTo(this);
    }
  }

  crossProduct(point: Point) {
    return this.x * point.y - this.y * point.x;
  }

  transform(matrix: MatrixLike) {
    matrix = new Matrix(matrix);
    const {a, d, e, f} = matrix;
    const angle = matrix.rotate();
    const origin = new Point(matrix.origin);
    let offset: Point;
    if (angle) {
      const {x: x1, y: y1} = origin;
      const {x: x2, y: y2} = this;
      const theta = Math.atan2(y2 - y1, x2 - x1) + angle;
      const length = this.distanceTo(origin);
      offset = new Point(Math.cos(theta), Math.sin(theta)).multiply(length);
    } else {
      offset = this.clone().sub(origin).multiply(a, d);
    }
    this.copy(origin.add(offset).add(e, f));
    return this;
  }

  normalize() {
    return this.divide(Math.hypot(this.x, this.y));
  }
}
