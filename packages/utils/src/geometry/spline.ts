import {Curve} from "./curve";
import {MatrixLike} from "./matrix";
import {Point} from "./point";

export class Spline extends Curve {
  fitPoints: Point[];
  controlPoints: Point[];
  degree: number;

  constructor(fitPoints: Point[] = [], controlPoints: Point[] = [], degree = 3) {
    super();
    this.fitPoints = fitPoints;
    this.controlPoints = controlPoints;
    this.degree = degree;
  }

  // FIXME: Approximate length by summing distances between control points
  get length() {
    let length = 0;
    const numPoints = this.controlPoints.length;
    if (numPoints < 2) {
      return length;
    }
    let prevPoint = this.controlPoints[0];
    for (let i = 1; i < numPoints; i++) {
      const currPoint = this.controlPoints[i];
      length += prevPoint.distanceTo(currPoint);
      prevPoint = currPoint;
    }
    return length;
  }

  getPoint(t: number) {
    const pts = this.controlPoints;
    const total = pts.length - 1;
    const i = Math.round(t * total);
    return pts[Math.min(Math.max(i, 0), total)]?.clone() ?? new Point();
  }

  transform(matrix: MatrixLike) {
    this.fitPoints.forEach((p) => p.transform(matrix));
    this.controlPoints.forEach((p) => p.transform(matrix));
    return this;
  }

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contains(object: Point | this, extend?: boolean, tol?: number): boolean {
    throw new Error("Method not implemented.");
  }

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  intersects(target: Curve, extend?: boolean, refPoint?: Point, tol?: number): Point[] {
    throw new Error("Method not implemented.");
  }
}
