import {Matrix, MatrixLike, ObjectOf, Point, Rectangle} from "@lucilor/utils";
import {cloneDeep, isEqual} from "lodash";
import {getVectorFromArray, purgeObject} from "../../cad-utils";
import {FontStyle} from "../cad-styles";
import {EntityType} from "../cad-types";
import {CadEntity} from "./cad-entity";

export interface CadMtextInfo {
  [key: string]: any;
  isLengthText?: boolean;
  isGongshiText?: boolean;
  isBianhuazhiText?: boolean;
  offset?: number[];
}

export class CadMtext extends CadEntity {
  type: EntityType = "MTEXT";
  insert: Point;
  text: string;
  anchor: Point;
  fontStyle: FontStyle;
  info: CadMtextInfo;

  get _boundingRectCalc() {
    const rect = Rectangle.min;
    if (this.text) {
      rect.expandByPoint(this.insert);
    }
    return rect;
  }

  constructor(data: any = {}, resetId = false) {
    super(data, resetId);
    this.insert = getVectorFromArray(data.insert);
    this.text = data.text ?? "";
    this.anchor = getVectorFromArray(data.anchor);
    this.fontStyle = data.fontStyle ? cloneDeep(data.fontStyle) : {};
    if (data.font_size) {
      this.fontStyle.size = data.font_size;
    }
    this.info = data.info ?? {};
  }

  export(): ObjectOf<any> {
    const anchor = this.anchor.toArray();
    return {
      ...super.export(),
      ...purgeObject({insert: this.insert.toArray(), fontStyle: this.fontStyle, text: this.text, anchor})
    };
  }

  protected _transform(matrix: MatrixLike, isFromParent?: boolean) {
    this.insert.transform(matrix);
    const scale = new Matrix(matrix).scale();
    if (scale[0] < 0) {
      this.anchor.x = 1 - this.anchor.x;
    }
    if (scale[1] < 0) {
      this.anchor.y = 1 - this.anchor.y;
    }
    const m = new Matrix(matrix);
    if (this.info.isLengthText || this.info.isGongshiText) {
      if (!isFromParent) {
        if (!Array.isArray(this.info.offset)) {
          this.info.offset = [0, 0];
        }
        this.info.offset[0] += m.e;
        this.info.offset[1] += m.f;
      }
    }
  }

  clone(resetId = false): CadMtext {
    return this._afterClone(new CadMtext(this.export(), resetId));
  }

  equals(entity: CadMtext) {
    return (
      this.insert.equals(entity.insert) &&
      isEqual(this.fontStyle, entity.fontStyle) &&
      this.text === entity.text &&
      this.anchor.equals(entity.anchor)
    );
  }
}
