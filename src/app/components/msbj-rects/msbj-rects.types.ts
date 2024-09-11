import {Formulas} from "@app/utils/calc";
import {输入} from "@components/lurushuju/xinghao-data";
import {ObjectOf, Rectangle} from "@lucilor/utils";
import {uniqueId} from "lodash";

export interface MsbjRectInfoRaw {
  vid: number;
  name?: string;
  选项名称?: string;
  isBuju: boolean;
  rect: {
    origin: {
      x: number;
      y: number;
    };
    size: {
      w: number;
      h: number;
    };
  };
}

export interface MsbjPeizhishuju {
  模块节点: MsbjRectInfoRaw[];
  模块大小关系?: GongshiObj;
  模块大小配置?: 模块大小配置;
}
export type GongshiObj = ObjectOf<any>;
export interface 模块大小配置 {
  算料公式: Formulas;
  输入显示: 输入[];
  vars?: Formulas;
}

export type MsbjSelectRectEvent = {info: MsbjRectInfo | null};

export class MsbjRectInfo {
  id: string;
  rect: Rectangle;
  bgColor?: string;

  get name() {
    return this.raw.name || "";
  }
  set name(value) {
    this.raw.name = value;
  }

  get 选项名称() {
    return this.raw.选项名称 || "";
  }
  set 选项名称(value) {
    this.raw.选项名称 = value;
  }

  constructor(public raw: MsbjRectInfoRaw) {
    this.id = uniqueId();
    const {x, y} = raw.rect.origin;
    const {w, h} = raw.rect.size;
    this.rect = new Rectangle([x, y], [x + w, y + h]);
  }
}
