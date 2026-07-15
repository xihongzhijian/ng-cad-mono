import {CadDimensionType} from "@lucilor/cad-viewer";

export abstract class CadStatus {
  name = "None";
  index = -1;
  canLeave = false;
  leaveWithEsc = false;
  canConfirm = false;
  confirmWithEnter = false;
  confirmed = false;

  constructor(index?: number) {
    if (typeof index === "number") {
      this.index = index;
    }
  }

  isEquals(status: CadStatus) {
    return this.name === status.name && this.index === status.index;
  }
}

export class CadStatusNormal extends CadStatus {
  name = "普通";
}

export class CadStatusSelectBaseline extends CadStatus {
  name = "选择基准线";
  canLeave = true;
  leaveWithEsc = true;
}

export class CadStatusSelectJointpoint extends CadStatus {
  name = "选择连接点";
  canLeave = true;
  leaveWithEsc = true;
}

export class CadStatusAssemble extends CadStatus {
  name = "装配";
  canLeave = true;
}

export class CadStatusSplit extends CadStatus {
  name = "选取CAD";
  canLeave = true;
  leaveWithEsc = true;
}

export class CadStatusDrawLine extends CadStatus {
  name = "画线";
  canLeave = true;
  leaveWithEsc = true;

  constructor(
    public isFenti: boolean,
    index?: number
  ) {
    super(index);
  }
}

export class CadStatusMoveLines extends CadStatus {
  name = "移线";
  canLeave = true;
  leaveWithEsc = true;
}

export class CadStatusCutLine extends CadStatus {
  name = "截线";
  canLeave = true;
  leaveWithEsc = true;
  canConfirm = true;
  confirmWithEnter = true;
}

export class CadStatusEditDimension extends CadStatus {
  name = "编辑标注";
  canLeave = true;
  leaveWithEsc = true;

  constructor(
    public type: CadDimensionType,
    index?: number
  ) {
    super(index);
  }
}

export class CadStatusIntersection extends CadStatus {
  name = "取交点";
  canLeave = true;
  leaveWithEsc = true;

  constructor(
    public info: string,
    index?: number,
    public multi?: boolean
  ) {
    super(index);
  }

  isEquals(status: CadStatus) {
    if (!(status instanceof CadStatusIntersection)) {
      return false;
    }
    return super.isEquals(status) && this.info === status.info && this.multi === status.multi;
  }
}
