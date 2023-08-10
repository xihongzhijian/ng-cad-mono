import {Angle} from "./angle";
import {Line} from "./line";
import {Matrix, MatrixLike} from "./matrix";
import {Point} from "./point";

export class Arc {
  center: Point;
  radius: number;
  clockwise: boolean;
  startAngle: Angle;
  endAngle: Angle;
  get isFinite() {
    return (
      this.center.isFinite &&
      this.startPoint.isFinite &&
      this.endPoint.isFinite &&
      isFinite(this.radius) &&
      this.startAngle.isFinite &&
      this.endAngle.isFinite
    );
  }
  get isNaN() {
    return (
      this.center.isNaN ||
      this.startPoint.isNaN ||
      this.endPoint.isNaN ||
      isNaN(this.radius) ||
      this.startAngle.isNaN ||
      this.endAngle.isNaN
    );
  }

  constructor(center = new Point(), radius?: number, start?: Angle | Point, end?: Angle | Point, clockwise = true) {
    this.center = center;
    this.radius = radius || 0;
    this.clockwise = clockwise;
    if (start instanceof Angle) {
      this.startAngle = start;
    } else if (start instanceof Point) {
      this.startAngle = new Angle();
      this.startPoint = start;
    } else {
      this.startAngle = new Angle(0);
    }
    if (end instanceof Angle) {
      this.endAngle = end;
    } else if (end instanceof Point) {
      this.endAngle = new Angle();
      this.endPoint = end;
    } else {
      this.endAngle = new Angle(Math.PI * 2);
    }
  }

  get startPoint() {
    const d = new Point(Math.cos(this.startAngle.rad), Math.sin(this.startAngle.rad)).multiply(this.radius);
    return this.center.clone().add(d);
  }
  set startPoint(value: Point) {
    this.startAngle.rad = new Line(this.center, value).theta.rad;
  }
  get endPoint() {
    const d = new Point(Math.cos(this.endAngle.rad), Math.sin(this.endAngle.rad)).multiply(this.radius);
    return this.center.clone().add(d);
  }
  set endPoint(value: Point) {
    this.endAngle.rad = new Line(this.center, value).theta.rad;
  }
  get totalAngle() {
    const {startAngle, endAngle, clockwise} = this;
    let start = startAngle.rad;
    let end = endAngle.rad;
    // if (clockwise) {
    //     if (start > end) {
    //         return new Angle(start - end, "deg");
    //     } else {
    //         return new Angle(360 - (end - start), "deg");
    //     }
    // } else {
    //     if (start > end) {
    //         return new Angle(360 - (start - end), "deg");
    //     } else {
    //         return new Angle(end - start, "deg");
    //     }
    // }
    if (clockwise) {
      while (end > start) {
        end -= Math.PI * 2;
      }
      return new Angle(start - end, "rad");
    } else {
      while (start > end) {
        start -= Math.PI * 2;
      }
      return new Angle(end - start, "rad");
    }
  }
  get length() {
    return this.radius * this.totalAngle.rad;
  }

  equals(arc: Arc) {
    return (
      this.center.equals(arc.center) &&
      this.radius === arc.radius &&
      this.startAngle.equals(arc.startAngle) &&
      this.endAngle.equals(arc.endAngle) &&
      this.clockwise === arc.clockwise
    );
  }

  getPoint(t: number) {
    const {startAngle, totalAngle, clockwise, radius} = this;
    const angle = startAngle.rad + totalAngle.rad * t * (clockwise ? -1 : 1);
    const offset = new Point(Math.cos(angle), Math.sin(angle)).multiply(radius);
    return this.center.clone().add(offset);
  }

  transform(matrix: MatrixLike) {
    matrix = new Matrix(matrix);
    const start = this.getPoint(0).transform(matrix);
    const end = this.getPoint(1).transform(matrix);
    this.center.transform(matrix);
    this.startPoint = start;
    this.endPoint = end;
    this.radius = this.center.distanceTo(start);

    const scale = matrix.scale();
    if (scale[0] * scale[1] < 0) {
      this.clockwise = !this.clockwise;
    }

    return this;
  }
}
