import {MatrixLike, ObjectOf, Point, Rectangle, Spline} from "@lucilor/utils";
import {CadLineLike} from "../..";
import {getVectorsFromArray, purgeObject} from "../../cad-utils";
import {EntityType} from "../cad-types";

export class CadSpline extends CadLineLike {
  type: EntityType = "SPLINE";
  fitPoints: Point[] = [];
  controlPoints: Point[] = [];
  degree = 3;
  calcBoundingRect = false;
  get _boundingRectCalc() {
    return Rectangle.min;
  }

  get start() {
    return this.curve.getPoint(0);
  }
  get end() {
    return this.curve.getPoint(1);
  }
  get middle() {
    return this.curve.getPoint(0.5);
  }
  get curve() {
    return new Spline(this.fitPoints, this.controlPoints, this.degree);
  }
  get length() {
    return this.curve.length;
  }

  constructor(data: any = {}, resetId = false) {
    super(data, resetId);
    this.fitPoints = getVectorsFromArray(data.fitPoints) ?? [];
    this.controlPoints = getVectorsFromArray(data.controlPoints) ?? [];
    if (typeof data.degree === "number") {
      this.degree = data.degree;
    }
  }

  export(): ObjectOf<any> {
    return {
      ...super.export(),
      ...purgeObject({
        fitPoints: this.fitPoints.map((v) => v.toArray()),
        controlPoints: this.controlPoints.map((v) => v.toArray()),
        degree: this.degree
      })
    };
  }

  clone(resetId = false): CadSpline {
    return this._afterClone(new CadSpline(this.export(), resetId));
  }

  protected _transform(matrix: MatrixLike) {
    this.fitPoints.forEach((p) => p.transform(matrix));
    this.controlPoints.forEach((p) => p.transform(matrix));
  }
}
