import {compose, decomposeTSR, rotate, scale, skew, translate} from "transformation-matrix";
import {PointLike} from "./point";

export interface MatrixParams {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
  translate?: PointLike;
  scale?: PointLike;
  skew?: PointLike;
  rotate?: number;
  origin?: PointLike;
}

export interface MatrixParamsRequired {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export type MatrixLike = Matrix | number[] | MatrixParams;

type MatrixKey = "a" | "b" | "c" | "d" | "e" | "f";

const matrixKeys: MatrixKey[] = ["a", "b", "c", "d", "e", "f"];
const matrixValues: Record<MatrixKey, number> = {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0};

const getPoint = (source?: PointLike, defaultValue = 0): [number, number] => {
  let x = defaultValue;
  let y = defaultValue;
  if (typeof source === "number") {
    x = y = source;
  } else if (Array.isArray(source)) {
    x = Number(source[0]);
    y = Number(source[1]);
  } else if (typeof source === "object") {
    x = Number(source.x);
    y = Number(source.y);
  }
  if (isNaN(x)) {
    x = 0;
  }
  if (isNaN(y)) {
    y = 0;
  }
  return [x, y];
};

export class Matrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  origin: [number, number] = [0, 0];

  get isFinite() {
    const {a, b, c, d, e, f} = this;
    const [ox, oy] = this.origin;
    return isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d) && isFinite(e) && isFinite(f) && isFinite(ox) && isFinite(oy);
  }
  get isNaN() {
    const {a, b, c, d, e, f} = this;
    const [ox, oy] = this.origin;
    return isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d) || isNaN(e) || isNaN(f) || isNaN(ox) || isNaN(oy);
  }

  constructor(source?: MatrixLike) {
    if (source) {
      this.compose(source);
    }
  }

  private _setMatrix(source: ReturnType<typeof compose>) {
    this.a = source.a;
    this.b = source.b;
    this.c = source.c;
    this.d = source.d;
    this.e = source.e;
    this.f = source.f;
  }

  compose(source: MatrixLike = {}) {
    if (Array.isArray(source)) {
      matrixKeys.forEach((k, i) => {
        this[k] = source[i] ?? matrixValues[k];
      });
    } else if (typeof source === "object") {
      matrixKeys.forEach((k) => {
        this[k] = source[k] ?? matrixValues[k];
      });
      this.origin = getPoint(source.origin);
      const matrixs: Parameters<typeof compose> = [];
      if (!(source instanceof Matrix)) {
        if (source.translate !== undefined) {
          matrixs.push(translate(...getPoint(source.translate)));
        }
        if (source.scale !== undefined) {
          matrixs.push(scale(...getPoint(source.scale, 1)));
        }
        if (source.skew !== undefined) {
          matrixs.push(skew(...getPoint(source.skew, 0)));
        }
        const rotateNum = Number(source.rotate);
        if (!isNaN(rotateNum)) {
          matrixs.push(rotate(rotateNum));
        }
      }
      this._setMatrix(compose(this, ...matrixs));
    }
  }

  decompose() {
    const result = {} as MatrixParamsRequired;
    matrixKeys.forEach((k) => {
      result[k] = this[k];
    });
    return result;
  }

  decomposeTSR() {
    const {a, d} = this;
    return decomposeTSR(this, d < 0, a < 0);
  }

  toArray() {
    const result: number[] = [];
    matrixKeys.forEach((k) => {
      result.push(this[k]);
    });
    return result;
  }

  transform(matrix: MatrixLike) {
    matrix = new Matrix(matrix);
    this._setMatrix(compose(this, matrix));
    return this;
  }

  scale(): [number, number];
  scale(x: number, y?: number): this;
  scale(x?: number, y = x) {
    if (typeof x !== "number" || typeof y !== "number") {
      const {sx, sy} = this.decomposeTSR().scale;
      return [sx, sy];
    }
    return this.transform(scale(x, y));
  }

  translate(): [number, number];
  translate(x: number, y?: number): this;
  translate(x?: number, y = x) {
    if (typeof x !== "number" || typeof y !== "number") {
      const {tx, ty} = this.decomposeTSR().translate;
      return [tx, ty];
    }
    return this.transform(translate(x, y));
  }

  skew(): [number, number];
  skew(radX?: number, radY?: number): this;
  skew(radX?: number, radY = radX) {
    if (typeof radX !== "number" || typeof radY !== "number") {
      return [Math.atan(this.b), Math.atan(this.c)];
    }
    return this.transform(skew(radX, radY));
  }

  rotate(): number;
  rotate(rad: number): this;
  rotate(rad?: number) {
    if (typeof rad === "number") {
      return this.transform(rotate(rad));
    }
    return this.decomposeTSR().rotation.angle;
  }

  equals(matrix: MatrixLike) {
    matrix = new Matrix(matrix);
    return (
      this.a === matrix.a && this.b === matrix.b && this.c === matrix.c && this.d === matrix.d && this.e === matrix.e && this.f === matrix.f
    );
  }
}
