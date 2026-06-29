import {Component, computed, effect, HostBinding, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatOptionModule} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {exportCadDataRemoveLengthTextCount, 激光开料标记线类型} from "@app/cad/utils";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {
  CadBaseLine,
  CadData,
  CadEntities,
  CadEntity,
  CadEventCallBack,
  CadJointPoint,
  CadLine,
  IntersectionKey,
  intersectionKeys,
  intersectionKeysTranslate,
  sortLines
} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {Utils} from "@mixins/utils.mixin";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadPoints} from "@services/app-status.types";
import {CadStatusIntersection, CadStatusSelectBaseline, CadStatusSelectJointpoint} from "@services/cad-status";
import {debounce, isEqual} from "lodash";
import {getCadInfoInputs, Intersection2Item} from "./cad-info.utils";

@Component({
  selector: "app-cad-info",
  templateUrl: "./cad-info.component.html",
  styleUrls: ["./cad-info.component.scss"],
  imports: [
    FormsModule,
    InputComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule
  ]
})
export class CadInfoComponent extends Utils() implements OnInit, OnDestroy {
  private config = inject(AppConfigService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  private _cadPointsLock = false;
  cadStatusIntersectionInfo: CadStatusIntersection["info"] = "";
  bjxTypes = 激光开料标记线类型;
  prevConfig: Partial<AppConfig> = {};

  selectJointpointEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusSelectJointpoint,
    () => {
      this._updateCadPoints();
    },
    () => {
      this._cadPointsLock = true;
      this.status.setCadPoints("single");
    }
  );

  private _setIntersectionConfig() {
    return this.config.setConfig({selectMode: "none", cadSelectModeLocked: true}, {sync: false});
  }
  intersectionEff = this.status.getCadStatusEffect(
    (v): v is CadStatusIntersection => {
      return v instanceof CadStatusIntersection && v.info === this.cadStatusIntersectionInfo;
    },
    () => {
      this.prevConfig = this._setIntersectionConfig();
      this._updateCadPoints();
    },
    () => {
      this._cadPointsLock = true;
      this.status.clearCadPoints();
      this.cadStatusIntersectionInfo = "";
      this.config.setConfig(this.prevConfig, {sync: false});
    },
    () => {
      this.config.setConfig(this.prevConfig, {sync: false});
      this.prevConfig = this._setIntersectionConfig();
      this._updateCadPoints();
    }
  );

  ngOnInit() {
    const cad = this.status.cad;
    cad.on("entityclick", this._onEntityClick);
    cad.on("moveentities", this._onEntityMove);
    cad.on("zoom", this._onZoom);
    cad.on("move", this._onMove);
  }
  ngOnDestroy() {
    const cad = this.status.cad;
    cad.off("entityclick", this._onEntityClick);
    cad.off("moveentities", this._onEntityMove);
    cad.off("zoom", this._onZoom);
    cad.off("move", this._onMove);
  }

  openCadOptionsEff = effect(() => {
    this.status.openCadOptions();
    this.updateIntersectionInputs();
    this.updateIntersectionInputs2();
  });

  componentsSelected = this.status.components.selected;
  data = computed(() => {
    const components = this.componentsSelected();
    let data: CadData;
    if (components.length === 1) {
      data = components[0];
    } else {
      data = this.status.cadData();
    }
    return {data};
  });

  cadPointsEff = effect(() => {
    const points = this.status.cadPoints();
    const activePoints = points.filter((p) => p.active);
    if (this._cadPointsLock) {
      this._cadPointsLock = false;
      return;
    }
    const data = this.data().data;
    const selectJointpointStatus = this.status.findCadStatus((v) => v instanceof CadStatusSelectJointpoint);
    const intersectionStatus = this.status.findCadStatus(
      (v): v is CadStatusIntersection => v instanceof CadStatusIntersection && v.info === this.cadStatusIntersectionInfo
    );
    if (selectJointpointStatus) {
      const jointPoint = data.jointPoints[selectJointpointStatus.index];
      if (activePoints.length < 1) {
        jointPoint.valueX = NaN;
        jointPoint.valueY = NaN;
      } else {
        const {valueX: x, valueY: y} = jointPoint;
        for (const p of activePoints) {
          const p2 = this._setActiveCadPoint({x, y}, points);
          if (!p2 || !isEqual([p.x, p.y], [p2.x, p2.y])) {
            jointPoint.valueX = p.x;
            jointPoint.valueY = p.y;
            this._updateCadPoints();
            break;
          }
        }
      }
      this.updateJointPointInfos();
    } else if (intersectionStatus) {
      const key = this.cadStatusIntersectionInfo;
      const {index, multi} = intersectionStatus;
      if (intersectionKeys.includes(key as IntersectionKey)) {
        const key2 = key as IntersectionKey;
        if (multi) {
          const toAdd: string[][] = [];
          const foundIndexs: number[] = [];
          for (const p of activePoints) {
            const linesOldIndex = data[key2].findIndex((lines) => isEqual(lines, p.lines));
            if (linesOldIndex >= 0) {
              foundIndexs.push(linesOldIndex);
            } else {
              toAdd.push(p.lines.slice());
            }
          }
          data[key2] = data[key2].filter((_, i) => foundIndexs.includes(i)).concat(toAdd);
          if (Array.isArray(data.info.刨坑深度)) {
            data.info.刨坑深度 = data.info.刨坑深度.filter((_, i) => foundIndexs.includes(i));
          }
        } else {
          const lines = data[key2][index];
          if (activePoints.length < 1) {
            data[key2][index] = [];
          } else {
            for (const p of activePoints) {
              const p2 = this._setActiveCadPoint({lines}, points);
              if (!p2 || !isEqual(p.lines, p2.lines)) {
                data[key2][index] = p.lines.slice();
                this._updateCadPoints();
                break;
              }
            }
          }
        }
        this.updateIntersectionInputs();
      } else if (this.intersectionKeys2.includes(key)) {
        let arr: Intersection2Item[] = data.info[key];
        if (!arr) {
          data.info[key] = arr = [];
        }
        let item = arr[index];
        if (!item) {
          arr[index] = item = {name: "", ids: []};
        }
        if (activePoints.length < 1) {
          item.ids = [];
        } else {
          for (const p of activePoints) {
            const p2 = this._setActiveCadPoint({lines: item.ids}, points);
            if (!p2 || !isEqual(p.lines, p2.lines)) {
              item.ids = p.lines.slice();
              this._updateCadPoints();
              break;
            }
          }
        }
        this.updateIntersectionInputs2();
      } else if (key === "激光开料标记线") {
        if (!data.info.激光开料标记线) {
          data.info.激光开料标记线 = [];
        }
        const item = data.info.激光开料标记线[index];
        if (activePoints.length < 1) {
          item.ids = [];
        } else {
          for (const p of activePoints) {
            const p2 = this._setActiveCadPoint({lines: item.ids}, points);
            if (!p2 || !isEqual(p.lines, p2.lines)) {
              item.ids = p.lines.slice();
              this._updateCadPoints();
              break;
            }
          }
        }
      }
    }
  });

  parseOptionString = computed(() => false);
  infoGroup1 = computed(() => {
    const infos = getCadInfoInputs(
      ["id", "名字", "唯一码", "显示名字", "排版序号名字", "开孔对应名字", "切内空对应名字", "分类", "分类2", "选项", "条件"],
      this.data().data,
      this.dialog,
      this.status,
      this.parseOptionString()
    );
    for (const info of infos) {
      info.onChange = (val: any) => {
        if (info.label === "名字") {
          this.setCadName(val);
        } else {
          this.status.emitChangeCadSignal();
        }
      };
    }
    return infos;
  });
  infoGroup2 = computed(() => {
    const infos = getCadInfoInputs(
      [
        "开料时刨坑",
        "变形方式",
        "板材纹理方向",
        "激光开料是否翻转",
        "激光开料打标",
        "开料排版方式",
        "默认开料板材",
        "默认开料材料",
        "默认开料板材厚度",
        "固定开料板材",
        "算料处理",
        "显示宽度标注",
        "板材厚度方向",
        "自定义属性",
        "型号花件",
        "必须绑定花件",
        "可独立板材",
        "必须选择板材",
        "双向折弯",
        "自动生成双折宽双折高公式",
        "算料单显示"
      ],
      this.data().data,
      this.dialog,
      this.status,
      this.parseOptionString()
    );
    for (const info of infos) {
      info.onChange = (val: any) => {
        if (info.label === "板材厚度方向") {
          this.offset(val);
        } else {
          this.status.emitChangeCadSignal();
        }
      };
    }
    return infos;
  });
  infoGroup3 = computed(() => {
    const infos = getCadInfoInputs(
      [
        "算料单显示放大倍数",
        "企料前后宽同时改变",
        "主CAD",
        "算料单展开显示位置",
        "属于门框门扇",
        "内开做分体",
        "板材绑定选项",
        "算料单线长显示的最小长度",
        "检查企料厚度",
        "对应门扇厚度",
        "显示厚度",
        "跟随CAD开料板材",
        "算料特殊要求",
        "正面宽差值",
        "墙厚差值",
        "企料翻转",
        "企料门框配合位增加值",
        "企料包边类型",
        "指定封口厚度",
        "拼接料拼接时垂直翻转",
        "正面线到见光线展开模板",
        "指定板材分组",
        "指定下单板材",
        "指定下单材料",
        "指定下单厚度",
        "拉码碰撞判断",
        "装配示意图自动拼接锁边铰边",
        "开料孔位配置",
        "算料单翻转",
        "激光开料排版后只保留孔",
        "激光开料折弯标记长直线",
        "激光开料折弯标记短直线",
        "门缝配置",
        "门缝"
      ],
      this.data().data,
      this.dialog,
      this.status,
      this.parseOptionString()
    );
    for (const info of infos) {
      info.onChange = () => {
        this.status.emitChangeCadSignal();
      };
    }
    return infos;
  });

  private _onEntityClick: CadEventCallBack<"entityclick"> = (_, entity) => {
    const data = this.data().data;
    const selectBaseLineStatus = this.status.findCadStatus((v) => v instanceof CadStatusSelectBaseline);
    if (selectBaseLineStatus) {
      if (entity instanceof CadLine) {
        const baseLine = data.baseLines[selectBaseLineStatus.index];
        if (entity.isHorizontal()) {
          baseLine.idY = entity.selected ? entity.id : "";
        }
        if (entity.isVertical()) {
          baseLine.idX = entity.selected ? entity.id : "";
        }
        data.updateBaseLines();
        this.updateBaseLineInfos();
        data.getAllEntities().forEach((e) => {
          e.selected = [baseLine.idX, baseLine.idY].includes(e.id);
        });
        this.status.cad.render();
      }
    }
  };
  private _checkMtext = debounce((entities: CadEntities) => {
    const cad = this.status.cad;
    const count = exportCadDataRemoveLengthTextCount;
    if (cad.data.entities.length > count && entities.mtext.some((e) => e.info.isLengthText)) {
      this.message.snack(`CAD实体数量大于${count}，线长位置不会保存`);
    }
  }, 500).bind(this);
  private _onEntityMove: CadEventCallBack<"moveentities"> = (entities) => {
    this._checkMtext(entities);
    this._updateCadPoints();
  };
  private _onZoom: CadEventCallBack<"zoom"> = () => {
    this._updateCadPoints();
  };
  private _onMove: CadEventCallBack<"move"> = () => {
    this._updateCadPoints();
  };
  private _updateCadPoints = () => {
    const data = this.data().data;
    const key = this.cadStatusIntersectionInfo;
    const selectJointpointStatus = this.status.findCadStatus((v) => v instanceof CadStatusSelectJointpoint);
    const intersectionStatus = this.status.findCadStatus((v) => v instanceof CadStatusIntersection);
    if (selectJointpointStatus) {
      const points = this.status.getCadPoints(data.getAllEntities());
      const {valueX, valueY} = data.jointPoints[selectJointpointStatus.index];
      this._setActiveCadPoint({x: valueX, y: valueY}, points);
      this._cadPointsLock = true;
      this.status.setCadPoints("single", points);
    } else if (intersectionStatus) {
      const points = this.status.getCadPoints(data.getAllEntities());
      const {index, multi} = intersectionStatus;
      const key2 = key as IntersectionKey;
      if (intersectionKeys.includes(key2)) {
        if (multi) {
          for (const point of points) {
            const found = data[key2].some((lines) => isEqual(lines, point.lines));
            point.active = found;
          }
        } else {
          this._setActiveCadPoint({lines: data[key2][index]}, points);
        }
      } else if (this.intersectionKeys2.includes(key)) {
        this._setActiveCadPoint({lines: data.info[key][index].ids}, points);
      } else if (key === "激光开料标记线") {
        this._setActiveCadPoint({lines: data.info.激光开料标记线?.[index].ids}, points);
      }
      this._cadPointsLock = true;
      this.status.setCadPoints(multi ? "multiple" : "single", points);
    }
  };
  private _setActiveCadPoint(point: Partial<CadPoints[0]>, points: CadPoints) {
    points.forEach((p) => (p.active = false));
    for (const p of points) {
      if (isEqual(p.lines, point.lines) || isEqual([p.x, p.y], [point.x, point.y])) {
        p.active = true;
        return p;
      }
    }
    return null;
  }

  baseLineInfos = signal<{data: CadBaseLine; class: string}[]>([]);
  updateBaseLineInfos() {
    this.baseLineInfos.set(
      this.data().data.baseLines.map((baseLine, i) => {
        let cls = "";
        if (this.status.hasCadStatus((v) => v instanceof CadStatusSelectBaseline && i === v.index)) {
          cls = "accent";
        }
        return {data: baseLine, class: cls};
      })
    );
  }
  baseLinesEff = effect(() => {
    this.updateBaseLineInfos();
  });
  addBaseLine(index: number) {
    const arr = this.data().data.baseLines;
    arr.splice(index + 1, 0, new CadBaseLine());
    this.updateBaseLineInfos();
  }
  async removeBaseLine(index: number) {
    if (await this.message.confirm("是否确定删除？")) {
      const arr = this.data().data.baseLines;
      if (arr.length === 1) {
        arr[0] = new CadBaseLine();
      } else {
        arr.splice(index, 1);
      }
      this.updateBaseLineInfos();
    }
  }
  selectBaseLine(i: number) {
    this.status.toggleCadStatus(new CadStatusSelectBaseline(i));
  }

  jointPointInfos = signal<{data: CadJointPoint; class: string}[]>([]);
  updateJointPointInfos() {
    this.jointPointInfos.set(
      this.data().data.jointPoints.map((jointPoint, i) => {
        let cls = "";
        if (this.status.hasCadStatus((v) => v instanceof CadStatusSelectJointpoint && i === v.index)) {
          cls = "accent";
        }
        return {data: jointPoint, class: cls};
      })
    );
  }
  jointPointsEff = effect(() => {
    this.updateJointPointInfos();
  });
  addJointPoint(index: number) {
    const arr = this.data().data.jointPoints;
    arr.splice(index + 1, 0, new CadJointPoint());
    this.updateJointPointInfos();
  }
  async removeJointPoint(index: number) {
    if (await this.message.confirm("是否确定删除？")) {
      const arr = this.data().data.jointPoints;
      if (arr.length === 1) {
        arr[0] = new CadJointPoint();
      } else {
        arr.splice(index, 1);
      }
      this.updateJointPointInfos();
    }
  }
  selectJointPoint(i: number) {
    this.status.toggleCadStatus(new CadStatusSelectJointpoint(i));
  }

  intersectionKeys = intersectionKeys;
  intersectionKeysTranslate = intersectionKeysTranslate;
  intersectionInputs = signal<Partial<Record<IntersectionKey, InputInfo[][]>>>({});
  updateIntersectionInputs() {
    const inputs: ReturnType<typeof this.intersectionInputs> = {};
    const data = this.data().data;
    for (const key of intersectionKeys) {
      const arr = data[key];
      inputs[key] = [];
      for (const [i, v] of arr.entries()) {
        const arr2: InputInfo[] = [
          {
            type: "string",
            label: "",
            value: v.length ? "已指定" : "未指定",
            selectOnly: true,
            suffixIcons: [
              {
                name: "linear_scale",
                isDefault: true,
                class: this.getPointClass(i, key),
                onClick: () => {
                  this.selectPoint(i, key);
                }
              },
              {
                name: "add_circle",
                onClick: () => {
                  this.addIntersectionValue(key, i + 1);
                }
              },
              {
                name: "remove_circle",
                onClick: () => {
                  this.removeIntersectionValue(key, i);
                }
              }
            ],
            style: {flex: "2 2 0", width: 0}
          }
        ];
        if (key === "zhidingweizhipaokeng") {
          if (!Array.isArray(data.info.刨坑深度)) {
            data.info.刨坑深度 = [];
          }
          if (typeof data.info.刨坑深度[i] !== "string") {
            data.info.刨坑深度[i] = "";
          }
          arr2.push({
            type: "string",
            label: "刨坑深度",
            model: {data: data.info.刨坑深度, key: i},
            options: ["默认"],
            suffixTexts: [{name: "mm"}],
            validators: () => {
              const val = data.info.刨坑深度[i];
              if (val === "默认") {
                return null;
              }
              const num = Number(val);
              if (isNaN(num) || num < 0) {
                return {请输入不小于0的数字: true};
              }
              return null;
            },
            style: {flex: "1 1 0", width: 0}
          });
        }
        inputs[key].push(arr2);
      }
    }
    this.intersectionInputs.set(inputs);
  }

  intersectionKeys2 = ["装配信息"];
  intersectionInputs2 = signal<Partial<Record<string, InputInfo[][]>>>({});
  updateIntersectionInputs2() {
    const inputs: ReturnType<typeof this.intersectionInputs2> = {};
    const data = this.data().data;
    for (const key of this.intersectionKeys2) {
      const arr: Intersection2Item[] = data.info[key] || [];
      inputs[key] = [];
      for (const [i, v] of arr.entries()) {
        const arr2: InputInfo[] = [
          {
            type: "string",
            label: "",
            value: v.ids.length > 0 ? "已指定" : "未指定",
            selectOnly: true,
            suffixIcons: [
              {
                name: "linear_scale",
                isDefault: true,
                class: this.getPointClass(i, key),
                onClick: () => {
                  this.selectPoint(i, key);
                }
              },
              {
                name: "add_circle",
                onClick: () => {
                  this.addIntersectionValue2(key, i + 1);
                }
              },
              {
                name: "remove_circle",
                onClick: () => {
                  this.removeIntersectionValue2(key, i);
                }
              }
            ],
            style: {width: "130px"}
          },
          {
            type: "string",
            label: "名字",
            model: {data: v, key: "name"},
            autocomplete: "off",
            style: {flex: "1 1 0", width: 0}
          }
        ];
        inputs[key].push(arr2);
      }
    }
    this.intersectionInputs2.set(inputs);
  }

  async offset(value: string) {
    const data = this.data().data;
    const cad = this.status.cad;
    data.bancaihoudufangxiang = value;
    this.status.emitChangeCadSignal();
    let direction: number;
    if (value === "gt0") {
      direction = 1;
    } else if (value === "lt0") {
      direction = -1;
    } else {
      return;
    }
    const distance = 2;
    const lines = sortLines(data.entities);
    const entities = new CadEntities();
    for (const group of lines) {
      for (const e of group) {
        let e2: CadEntity;
        if (e instanceof CadLine) {
          const e3 = new CadLine();
          e3.setColor(e.getColor());
          e3.start.copy(e.start);
          e3.end.copy(e.end);
          e2 = e3;
        } else {
          e2 = e.clone(true);
        }
        e2.selectable = false;
        e2.calcBoundingRectForce = false;
        entities.add(e2);
      }
    }
    entities.offset(direction, distance);
    await cad.add(entities);

    const blinkInterval = 500;
    const blinkCount = 3;
    this.status.saveCadLocked$.next(true);
    try {
      for (let i = 0; i < blinkCount; i++) {
        entities.forEach(async (e) => {
          const el = e.el;
          if (el) {
            el.css({opacity: "1", transition: `${blinkInterval}ms ease-in-out`});
            await timeout(blinkInterval);
            el.css({opacity: "0"});
          }
        });
        await timeout(blinkInterval * 2);
      }
      cad.remove(entities);
    } finally {
      this.status.saveCadLocked$.next(false);
    }
  }

  async editZhankai(data: CadData) {
    await editCadZhankai(this.dialog, data);
  }

  setCadName(value: string) {
    this.status.updateTitle();
    const zhankai = this.data().data.zhankai[0];
    if (zhankai) {
      zhankai.name = value;
    }
    this.status.emitChangeCadSignal();
  }

  selectPoint(i: number, key: string, multi?: boolean) {
    this.cadStatusIntersectionInfo = key;
    this.status.toggleCadStatus(new CadStatusIntersection(key, i, multi));
    if (intersectionKeys.includes(key as IntersectionKey)) {
      this.updateIntersectionInputs();
    } else if (this.intersectionKeys2.includes(key)) {
      this.updateIntersectionInputs2();
    }
  }
  selectPointMulti(key: string) {
    this.selectPoint(-1, key, true);
  }
  isMultiSelectingIntersection(key: string) {
    return this.status.hasCadStatus((v) => v instanceof CadStatusIntersection && !!v.multi && v.info === key);
  }

  selectBjxPoint(i: number, event?: PointerEvent) {
    event?.stopPropagation();
    this.cadStatusIntersectionInfo = "激光开料标记线";
    this.status.toggleCadStatus(new CadStatusIntersection("激光开料标记线", i));
  }

  getPointClass(i: number, key: string) {
    if (this.status.hasCadStatus((v) => v instanceof CadStatusIntersection && v.info === key && i === v.index)) {
      return "accent";
    }
    return "";
  }

  getBjxPointClass(i: number) {
    if (this.status.hasCadStatus((v) => v instanceof CadStatusIntersection && v.info === "激光开料标记线" && i === v.index)) {
      return "accent";
    }
    return "";
  }

  copyCadId(cad: CadData) {
    this.message.copyText(cad.id, {successText: "id已复制"});
  }

  addIntersectionValue(key: IntersectionKey, i?: number) {
    const data = this.data().data;
    this.arrayAdd(data[key], [], i);
    if (key === "zhidingweizhipaokeng") {
      if (!Array.isArray(data.info.刨坑深度)) {
        data.info.刨坑深度 = [];
      }
      this.arrayAdd(data.info.刨坑深度, "", i);
    }
    this.updateIntersectionInputs();
  }
  removeIntersectionValue(key: IntersectionKey, i: number) {
    const data = this.data().data;
    this.arrayRemove(data[key], i);
    if (key === "zhidingweizhipaokeng") {
      this.arrayRemove(data.info.刨坑深度, i);
    }
    this.updateIntersectionInputs();
  }

  addIntersectionValue2(key: string, i?: number) {
    const data = this.data().data;
    let arr: Intersection2Item[] | undefined = data.info[key];
    if (!Array.isArray(arr)) {
      arr = [];
      data.info[key] = arr;
    }
    this.arrayAdd(arr, {name: "", ids: []}, i);
    this.updateIntersectionInputs2();
  }
  removeIntersectionValue2(key: string, i: number) {
    const data = this.data().data;
    const arr: Intersection2Item[] | undefined = data.info[key];
    if (!Array.isArray(arr)) {
      return;
    }
    this.arrayRemove(arr, i);
    this.updateIntersectionInputs2();
  }

  addBjxItem(i?: number, event?: PointerEvent) {
    event?.stopPropagation();
    this.arrayAddEnsure(this.data().data.info, "激光开料标记线", {type: "短直线", ids: []}, i);
  }
  removeBjxItem(i: number, event?: PointerEvent) {
    event?.stopPropagation();
    this.arrayRemoveEnsure(this.data().data.info, "激光开料标记线", i);
  }
}
