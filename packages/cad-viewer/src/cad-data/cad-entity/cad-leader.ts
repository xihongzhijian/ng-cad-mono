import {Matrix, MatrixLike, ObjectOf, Point, purgeObject, Rectangle} from "@lucilor/utils";
import {CadStylizer} from "../../cad-stylizer";
import {getVectorsFromArray} from "../../cad-utils";
import {CadDimensionStyle} from "../cad-styles";
import {EntityType} from "../cad-types";
import {CadEntity} from "./cad-entity";

export class CadLeader extends CadEntity {
  type: EntityType = "LEADER";
  vertices: Point[] = [];
  size: number;
  style: CadDimensionStyle = {};
  get _boundingRectCalc() {
    return Rectangle.fromPoints(this.vertices);
  }

  constructor(data: any = {}, resetId = false) {
    super(data, resetId);
    this.vertices = getVectorsFromArray(data.vertices) ?? [];
    this.size = data.size ?? 5;
    this.setStyle(data.style || {});
  }

  export() {
    return {
      ...super.export(),
      ...purgeObject<ObjectOf<any>>({vertices: this.vertices.map((v) => v.toArray()), size: this.size, style: this.style})
    };
  }

  clone(resetId = false): CadLeader {
    return this._afterClone(new CadLeader(this.export(), resetId));
  }

  protected _transform(matrix: MatrixLike) {
    this.vertices.forEach((v) => v.transform(matrix));
    const m = new Matrix(matrix);
    const [scaleX, scaleY] = m.scale();
    this.size *= Math.abs(Math.sqrt(scaleX * scaleY));
  }

  setStyle(style: CadDimensionStyle): this {
    if (!this.style) {
      this.style = {};
    }
    CadStylizer.mergeDimStyle(this.style, style);
    return this;
  }
}
