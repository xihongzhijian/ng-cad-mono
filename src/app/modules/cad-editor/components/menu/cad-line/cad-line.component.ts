import {
  AfterViewInit,
  Component,
  computed,
  effect,
  forwardRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked
} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {autoFixLine, generateLineTexts2, getLineLengthTextSize, isLengthTextSizeSetKey, validColors} from "@app/cad/utils";
import {CustomValidators} from "@app/utils/input-validators";
import {openCadLineTiaojianquzhiDialog} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {
  CadEntities,
  CadEventCallBack,
  CadLine,
  CadLineLike,
  cadLineOptions,
  Defaults,
  lineweight2linewidth,
  linewidth2lineweight,
  PointsMap
} from "@lucilor/cad-viewer";
import {Point} from "@lucilor/utils";
import {InputComponent} from "@modules/input/components/input.component";
import {
  InputInfo,
  InputInfoArray,
  InputInfoBoolean,
  InputInfoNumber,
  InputInfoOptions,
  InputInfoPart,
  InputInfoSelectSingle,
  InputInfoString
} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CadPoints} from "@services/app-status.types";
import {CadStatus, CadStatusCutLine, CadStatusDrawLine, CadStatusIntersection, CadStatusMoveLines} from "@services/cad-status";
import Color, {ColorInstance} from "color";
import {debounce} from "lodash";
import {ColorCircleModule} from "ngx-color/circle";
import {convertToCadFentiLine, getCadFentiInfo} from "../cad-fenti-config/cad-fenti-config.utils";
import {CadLayerInputComponent} from "../cad-layer-input/cad-layer-input.component";
import {parseLineNames, stringifyLineNames} from "./cad-line.utils";

@Component({
  selector: "app-cad-line",
  templateUrl: "./cad-line.component.html",
  styleUrls: ["./cad-line.component.scss"],
  imports: [
    CadLayerInputComponent,
    ColorCircleModule,
    FormsModule,
    forwardRef(() => InputComponent),
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatOptionModule
  ]
})
export class CadLineComponent implements OnInit, AfterViewInit, OnDestroy {
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  lineDrawing: {start?: Point; end?: Point; entity?: CadLine; oldEntity?: CadLine} | null = null;
  private _lineDrawingLock = false;
  linesMoving: {start?: Point} | null = null;
  linesCutting: {lines: CadLine[]; points: Point[]} | null = null;
  selected = signal<CadLineLike[]>([]);
  editDiabled = computed(() => this.selected().length < 1);
  zhewanOptions = computed(() => {
    const lengths = this.status.zhewanLengths();
    return ["自动", "无", ...lengths.map((v) => `${v}mm`)];
  });
  WHDashedLines: {line: CadLineLike; map: PointsMap} | null = null;
  cadLineOptions = cadLineOptions;

  isDrawingLine = computed(() => this.status.hasCadStatus((v) => v instanceof CadStatusDrawLine));
  drawLineName = new CadStatusDrawLine(false).name;
  drawLineEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusDrawLine,
    () => {
      this.status.cad.traverse((e) => {
        e.info.prevSelectable = e.selectable;
        e.selectable = false;
      });
      this.lineDrawing = {};
      this._updateCadPoints();
    },
    () => {
      const cad = this.status.cad;
      const lineDrawing = this.lineDrawing;
      if (lineDrawing) {
        cad.remove(lineDrawing.entity);
        if (lineDrawing.oldEntity) {
          lineDrawing.oldEntity.opacity = 1;
        }
      }
      cad.traverse((e) => {
        e.selectable = e.info.prevSelectable ?? true;
        delete e.info.prevSelectable;
      });
      this.lineDrawing = null;
      this.status.setCadPoints();
    }
  );

  isMovingLines = computed(() => this.status.hasCadStatus((v) => v instanceof CadStatusMoveLines));
  moveLinesName = new CadStatusMoveLines().name;
  moveLinesEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusMoveLines,
    () => {
      this.linesMoving = {};
      this._updateCadPoints();
    },
    () => {
      this.status.setCadPoints();
      this.linesMoving = null;
    }
  );

  isCuttingLine = computed(() => this.status.hasCadStatus((v) => v instanceof CadStatusCutLine));
  cutLineName = new CadStatusCutLine().name;
  cutLineEff = this.status.getCadStatusEffect(
    (v) => v instanceof CadStatusCutLine,
    () => {
      this.linesCutting = {lines: [], points: []};
      this._updateCadPoints();
    },
    (cadStatus) => {
      const cad = this.status.cad;
      const {linesCutting} = this;
      this.status.setCadPoints();
      this.linesCutting = null;
      if (cadStatus.confirmed && linesCutting) {
        const lines = linesCutting.lines;
        linesCutting.points.forEach((point) => {
          let index = -1;
          let split1: CadLine | undefined;
          let split2: CadLine | undefined;
          lines.forEach((line, i) => {
            if (line.curve.contains(point)) {
              split1 = new CadLine(line.export(), true);
              split2 = new CadLine();
              split2.setColor(line.getColor());
              split2.zhankaixiaoshuchuli = line.zhankaixiaoshuchuli;
              split1.end.copy(point);
              split2.start.copy(point);
              split2.end.copy(line.end);
              index = i;
              cad.data.entities.add(split1, split2);
              cad.remove(line);
            }
          });
          if (index > -1 && split1 && split2) {
            lines.splice(index, 1, split1, split2);
          }
        });
      }
    }
  );

  checkAddWHDashedLines = (v: CadStatus) => v instanceof CadStatusIntersection && v.info === "addWHDashedLines";
  isAddingWHDashedLines = computed(() => {
    const cadStatuses = this.status.cadStatuses();
    return cadStatuses.some(this.checkAddWHDashedLines);
  });
  addWHDashedLinesEff = this.status.getCadStatusEffect(
    this.checkAddWHDashedLines,
    () => {
      this.addWHDashedLinesStart();
    },
    () => {
      this.addWHDashedLinesEnd();
    }
  );

  data = this.status.cadData;

  readonly selectableColors = validColors.map((v) => new Color(v));

  ngOnInit() {
    const cad = this.status.cad;
    cad.on("pointermove", this._onPointerMove);
    cad.on("click", this._onClick);
    cad.on("entitiesselect", this._onEntitiesChange);
    cad.on("entitiesunselect", this._onEntitiesChange);
    cad.on("entitiesadd", this._onEntitiesChange);
    cad.on("entitiesremove", this._onEntitiesChange);
    cad.on("moveentities", this._updateCadPoints);
    cad.on("zoom", this._updateCadPoints);
  }
  ngOnDestroy() {
    const cad = this.status.cad;
    cad.off("pointermove", this._onPointerMove);
    cad.off("click", this._onClick);
    cad.off("entitiesselect", this._onEntitiesChange);
    cad.off("entitiesunselect", this._onEntitiesChange);
    cad.off("entitiesadd", this._onEntitiesChange);
    cad.off("entitiesremove", this._onEntitiesChange);
    cad.off("moveentities", this._updateCadPoints);
    cad.off("zoom", this._updateCadPoints);
  }
  ngAfterViewInit() {
    setTimeout(() => {
      this.status.updateZhewanLengths();
    }, 0);
  }

  openCadOptionsEff = effect(() => {
    this.status.openCadOptions();
    this._onEntitiesChange();
  });

  private _onPointerMove: CadEventCallBack<"pointermove"> = async ({clientX, clientY, shiftKey}) => {
    const lineDrawing = this.lineDrawing;
    const cad = this.status.cad;
    if (!lineDrawing) {
      return;
    }
    let entity = lineDrawing.entity;
    if (lineDrawing.oldEntity) {
      if (!entity) {
        return;
      }
      if (lineDrawing.start) {
        entity.start.copy(cad.getWorldPoint(clientX, clientY));
      } else if (lineDrawing.end) {
        entity.end.copy(cad.getWorldPoint(clientX, clientY));
      }
    } else {
      if (!lineDrawing.start) {
        return;
      }
      lineDrawing.end = cad.getWorldPoint(clientX, clientY);
      if (entity) {
        entity.end = lineDrawing.end;
      } else {
        entity = new CadLine({...lineDrawing});
        const cadStatus = this.status.findCadStatus((v) => v instanceof CadStatusDrawLine);
        if (cadStatus?.isFenti) {
          entity = convertToCadFentiLine(entity);
        }
        lineDrawing.entity = entity;
        cad.data.entities.add(entity);
        await cad.render(entity);
        entity.opacity = 0.6;
        entity.selectable = false;
        entity.lengthTextSize = getLineLengthTextSize(entity);
      }
    }
    if (shiftKey) {
      const {start, end} = entity;
      const dx = Math.abs(start.x - end.x);
      const dy = Math.abs(start.y - end.y);
      if (dx < dy) {
        end.x = start.x;
      } else {
        end.y = start.y;
      }
    }
    await cad.render(entity);
  };
  private _onClick: CadEventCallBack<"click"> = (event: MouseEvent) => {
    if (this._lineDrawingLock) {
      return;
    }
    this._lineDrawingLock = true;
    setTimeout(() => (this._lineDrawingLock = false), 0);
    const lineDrawing = this.lineDrawing;
    if (!lineDrawing) {
      return;
    }
    const {entity, oldEntity} = lineDrawing;
    if (!entity) {
      this.status.addCadPoint({x: event.clientX, y: event.clientY, active: true, lines: []});
      return;
    }
    if (!oldEntity) {
      this.addLineDrawing(true, true);
    }
  };

  private _onEntitiesChange = () => {
    const selected: CadLineLike[] = [];
    this.status.cad.selected().forEach((e) => {
      if (e instanceof CadLineLike) {
        selected.push(e);
      }
    });
    this.selected.set(selected);
  };

  cadPointsEff = effect(async () => {
    const cadPoints = this.status.cadPoints();
    untracked(() => this.onCadPointsChange(cadPoints));
  });
  onCadPointsChange = async (cadPoints: CadPoints) => {
    const activePoints = cadPoints.filter((v) => v.active);
    if (!activePoints.length) {
      this.status.updateCadStatuses((cadStatus) => {
        if (cadStatus instanceof CadStatusDrawLine) {
          cadStatus.leaveWithEsc = true;
        }
      });
      return;
    }
    const cad = this.status.cad;
    const worldPoints = activePoints.map((v) => cad.getWorldPoint(v.x, v.y));
    const {lineDrawing, linesMoving, linesCutting} = this;
    if (this.status.hasCadStatus((v) => v instanceof CadStatusDrawLine) && lineDrawing) {
      const {entity, oldEntity} = lineDrawing;
      if (oldEntity) {
        if (!entity) {
          return;
        }
        if (worldPoints.length === 2) {
          entity.start.copy(worldPoints[0]);
          entity.end.copy(worldPoints[1]);
          cad.data.entities.add(entity);
          await cad.remove(oldEntity);
          entity.selected = false;
          this.lineDrawing = null;
          this.drawLine();
        }
      } else {
        this.status.updateCadStatuses((cadStatus) => {
          if (cadStatus instanceof CadStatusDrawLine) {
            cadStatus.leaveWithEsc = false;
          }
        });
        if (worldPoints.length === 1) {
          lineDrawing.start = worldPoints[0];
        } else if (entity) {
          if (worldPoints[0].equals(entity.start)) {
            entity.end.copy(worldPoints[1]);
          } else {
            entity.end.copy(worldPoints[0]);
          }
          this.addLineDrawing(false);
        }
      }
    } else if (this.status.hasCadStatus((v) => v instanceof CadStatusMoveLines) && linesMoving) {
      if (worldPoints.length === 1) {
        if (linesMoving.start) {
          this.moveLines();
          const translate = worldPoints[0].sub(linesMoving.start).toArray();
          const selected = new CadEntities().fromArray(this.selected());
          selected.transform({translate}, true);
          await this.status.cad.render(selected);
          await this.status.refreshCadFenti();
        } else {
          linesMoving.start = worldPoints[0];
        }
        this._updateCadPoints();
      }
    } else if (this.status.hasCadStatus((v) => v instanceof CadStatusCutLine) && linesCutting) {
      linesCutting.points = worldPoints;
    } else if (this.status.hasCadStatus(this.checkAddWHDashedLines)) {
      const worldPoint = worldPoints[0];
      const map = this.WHDashedLines?.map;
      if (!worldPoint || !map) {
        return;
      }
      const index = map.findIndex(({point}) => worldPoint.equals(point));
      if (index >= 0) {
        map[index].lines.forEach((l) => (l.opacity = 1));
        map.splice(index, 1);
      }
      generateLineTexts2(cad.data);
      this.toggleWHDashedLines();
    }
  };
  private _updateCadPoints = () => {
    const {lineDrawing, linesMoving, linesCutting, WHDashedLines} = this;
    const selected = this.selected();
    const selected0 = selected[0];
    const cad = this.status.cad;
    if (lineDrawing) {
      const info = getCadFentiInfo(cad.data);
      const cadStatus = this.status.findCadStatus((v) => v instanceof CadStatusDrawLine);
      if (cadStatus?.isFenti) {
        this.status.setCadPoints(info.fentiEntities, {mid: true});
      } else {
        this.status.setCadPoints(info.rawEntities, {mid: true});
      }
      this.lineDrawing = {};
    } else if (linesMoving) {
      if (linesMoving.start) {
        const {x, y} = cad.getScreenPoint(linesMoving.start.x, linesMoving.start.y);
        this.status.setCadPoints(cad.data.getAllEntities(), {exclude: [{x, y}]});
      } else {
        if (selected.length < 1) {
          this.message.alert("没有选中线");
          this.moveLines();
          this.linesMoving = null;
        } else {
          this.status.setCadPoints(new CadEntities().fromArray(selected));
        }
      }
    } else if (linesCutting) {
      if (!(selected0 instanceof CadLine)) {
        this.message.alert("请先选中一条直线");
        this.cutLine();
        this.linesCutting = null;
      } else {
        const points: CadPoints = [];
        const {curve, start, end} = selected0;
        cad.data.getAllEntities().line.forEach((l) => {
          if (l.id === selected0.id) {
            return;
          }
          const intersection = l.curve.intersects(curve).at(0);
          if (intersection && !intersection.equals(start) && !intersection.equals(end)) {
            const {x, y} = this.status.cad.getScreenPoint(intersection.x, intersection.y);
            points.push({x, y, active: false, lines: []});
          }
        });
        if (points.length) {
          this.status.cadPoints.set(points);
          this.linesCutting = {lines: [selected0], points: []};
        } else {
          this.message.alert("无法截这条线(相交的线不足)");
        }
      }
    } else if (WHDashedLines) {
      this.status.setCadPoints(WHDashedLines.map);
    }
  };

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (this.status.hasCadStatus((v) => v instanceof CadStatusDrawLine)) {
        const lineDrawing = this.lineDrawing;
        if (lineDrawing) {
          this.status.cad.remove(lineDrawing.entity);
          if (lineDrawing.oldEntity) {
            lineDrawing.oldEntity.opacity = 1;
          }
          this.lineDrawing = null;
          this.status.cadPoints.update((v) => v.map((v2) => ({...v2, active: false})));
        }
      }
    }
  }

  getLineLengthInfo() {
    const lines = this.selected();
    let value: number | undefined;
    const length = lines.length;
    const isZero = length === 0;
    let isMultiple = false;
    if (isZero) {
      value = undefined;
    } else {
      const values = new Set(lines.map((v) => Number(v.length.toFixed(2))));
      if (values.size === 1) {
        value = values.values().next().value;
      } else {
        isMultiple = true;
        value = undefined;
      }
    }
    return {value, isZero, isMultiple};
  }
  async setLineLength(value: number) {
    const selected = this.selected();
    const cad = this.status.cad;
    const lines = selected.filter((v) => v instanceof CadLine);
    await this.status.setLinesLength(lines, value);
    this.status.validate();
    await cad.render();
    if (lines.some((v) => v.zhankaifangshi === "指定长度")) {
      this.message.snack("线的展开方式为指定长度");
    }
    this.status.emitChangeCadSignal();
  }

  lineColor = signal(new Color("black"));
  lineColorBg = signal("white");
  lineColorEff = effect(() => {
    const color = this.lineColor();
    if (color.isLight()) {
      this.lineColorBg.set("black");
    } else {
      this.lineColorBg.set("white");
    }
  });
  getLineColor() {
    const lines = this.selected();
    if (lines.length === 1) {
      return lines[0].getColor();
    }
    if (lines.length) {
      const strs = Array.from(new Set(lines.map((l) => l.getColor().hex())));
      if (strs.length === 1) {
        return new Color(strs[0]);
      }
    }
    return new Color("black");
  }
  setLineColor(color: ColorInstance) {
    this.lineColor.set(color);
    const selected = this.selected();
    selected.forEach((e) => e.setColor(color.hex()));
    this.status.cad.render(selected);
  }

  getLineValue(field: string, isInfo?: boolean) {
    const lines = this.selected();
    const result: {value?: string | number | boolean; isZero?: boolean; isMultiple?: boolean} = {};
    let getter: (e: CadLineLike) => any;
    if (field === "kegaimingzi") {
      getter = (e: CadLineLike) => {
        const vars = e.root?.root?.info.vars;
        if (vars) {
          for (const key in vars) {
            if (vars[key] === e.id) {
              return key;
            }
          }
        }
        return "";
      };
    } else if (isInfo) {
      getter = (e: any) => e.info[field] ?? "";
    } else {
      getter = (e: any) => e[field] ?? "";
    }
    const vals = new Set<any>();
    lines.forEach((l) => {
      vals.add(getter(l));
    });
    const size = vals.size;
    if (size === 0) {
      result.isZero = true;
    } else if (vals.size === 1) {
      result.value = vals.values().next().value;
    } else {
      result.isMultiple = true;
    }
    return result;
  }
  setLineValue(value: string | number | boolean, field: string, isInfo?: boolean) {
    const cad = this.status.cad;
    if (field === "kegaimingzi") {
      if (!cad.data.info) {
        cad.data.info = {};
      }
      const info = cad.data.info;
      if (!info.vars) {
        info.vars = {};
      }
      const vars = info.vars;
      const line = this.selected()[0];
      const id = line.id;
      const toRender: CadLineLike[] = [line];
      Object.keys(vars).forEach((key) => {
        if (vars[key] === id) {
          delete vars[key];
        }
      });
      const value2 = String(value);
      if (value2) {
        if (vars[value2]) {
          const e = cad.data.getAllEntities().line.find((v) => v.id === vars[value2]);
          if (e) {
            toRender.push(e);
          }
        }
        vars[value2] = id;
      }
      cad.render(toRender);
    } else {
      if (field === "zhewanValue" && Number(value) < 0) {
        this.message.alert("指定折弯标记位置不能小于0");
        value = 0;
      }
      this.selected().forEach((e) => {
        if (isInfo) {
          e.info[field] = value;
        } else {
          (e as any)[field] = value;
        }
        const keys: (keyof CadLineLike)[] = [
          "mingzi",
          "mingzi2",
          "gongshi",
          "guanlianbianhuagongshi",
          "lengthTextSize",
          "linewidth",
          "hideLength",
          "显示线长",
          "圆弧显示",
          "开料不要",
          "刨坑起始线",
          "企料位置识别"
        ];
        if (keys.includes(field as keyof CadLineLike)) {
          cad.render(e);
        }
        if (field === "lengthTextSize") {
          if (typeof value === "number" && value > 0) {
            e.info[isLengthTextSizeSetKey] = true;
          } else {
            delete e.info[isLengthTextSizeSetKey];
          }
        }
      });
    }
    this.status.emitChangeCadSignal();
  }

  lineInputInfos1 = computed(() => {
    const lengthInfo = this.getLineLengthInfo();
    const selected = this.selected();
    const disabled = selected.length < 1;
    const infos: InputInfo[] = [
      {
        type: "number",
        label: "长度",
        value: lengthInfo.value,
        hint: lengthInfo.isMultiple ? "多个值" : "",
        disabled,
        onChange: (val) => {
          this.setLineLength(val);
        }
      }
    ];
    return infos;
  });
  lineInputInfos2 = computed(() => {
    const selected = this.selected();
    const disabled = selected.length < 1;
    const getStringInfo = (field: string, label = field, others?: InputInfoPart<InputInfoString>, isInfo = false) => {
      const {value, isMultiple} = this.getLineValue(field, isInfo);
      const info: InputInfoString = {
        type: "string",
        label,
        disabled,
        onInput: debounce((val: string) => this.setLineValue(val, field, isInfo), 500),
        ...others
      };
      if (value !== undefined) {
        info.value = String(value);
      } else {
        info.value = undefined;
      }
      if (isMultiple) {
        info.hint = "多个值";
      }
      return info;
    };
    const getNumberInfo = (field: string, label = field, others?: InputInfoPart<InputInfoNumber>, isInfo = false) => {
      const {value, isMultiple} = this.getLineValue(field, isInfo);
      const info: InputInfoNumber = {
        type: "number",
        label,
        disabled,
        onInput: debounce((val: number) => this.setLineValue(val, field, isInfo), 500),
        ...others
      };
      const valueNum = Number(value);
      if (!isNaN(valueNum)) {
        info.value = valueNum;
      } else {
        info.value = undefined;
      }
      if (isMultiple) {
        info.hint = "多个值";
      }
      return info;
    };
    const getBooleanInfo = (field: string, label = field, others?: InputInfoPart<InputInfoBoolean>, isInfo = false) => {
      const {value, isZero, isMultiple} = this.getLineValue(field, isInfo);
      const info: InputInfoBoolean = {
        type: "boolean",
        label,
        allowEmpty: isZero || isMultiple,
        indeterminate: isMultiple,
        disabled,
        onChange: (val) => this.setLineValue(val, field, isInfo),
        ...others
      };
      if (typeof value === "boolean") {
        info.value = value;
      } else {
        info.value = undefined;
      }
      if (isMultiple) {
        info.hint = "多个值";
      }
      return info;
    };
    const getSelectSingleInfo = (
      options: InputInfoOptions,
      field: string,
      label = field,
      others?: InputInfoPart<InputInfoSelectSingle>,
      isInfo = false
    ) => {
      const {value, isMultiple} = this.getLineValue(field, isInfo);
      const info: InputInfoSelectSingle = {
        type: "select",
        label,
        options,
        disabled,
        onChange: (val) => this.setLineValue(val, field, isInfo),
        ...others
      };
      if (value !== undefined) {
        info.value = value;
      } else {
        info.value = undefined;
      }
      if (isMultiple) {
        info.hint = "多个值";
      }
      return info;
    };
    const getNameInputInfo = () => {
      const {value: mingziRaw, isMultiple, isZero} = this.getLineValue("mingzi");
      const {value: mingzi2Raw} = this.getLineValue("mingzi2");
      const names: string[] = parseLineNames(String(mingziRaw ?? ""), String(mingzi2Raw ?? ""));
      const info: InputInfoArray<unknown, string> = {
        type: "array",
        label: "",
        valueLabel: (i) => (i === 0 ? "名字" : "名字2"),
        disabled: isMultiple || isZero,
        hint: isMultiple ? "选中多根线时无法编辑" : "",
        sortable: true,
        value: names,
        onChange: (val) => {
          const {mingzi, mingzi2} = stringifyLineNames(val);
          this.setLineValue(mingzi, "mingzi");
          this.setLineValue(mingzi2, "mingzi2");
        }
      };
      return [info];
    };
    const data = this.data();
    const zhewanOptions = this.zhewanOptions();
    const infos: InputInfo[] = [
      getStringInfo("显示线长"),
      getBooleanInfo("hideLength", "是否隐藏线长", {appearance: "checkbox"}),
      getNumberInfo("lengthTextSize", "线长字体大小"),
      {
        type: "color",
        label: "颜色",
        options: this.selectableColors,
        optionsOnly: true,
        disabled,
        value: this.getLineColor(),
        onChange: (val) => {
          this.setLineColor(val);
        }
      },
      getStringInfo("linewidth", "线宽"),
      ...getNameInputInfo(),
      getBooleanInfo("刨坑起始线"),
      getStringInfo("kegaimingzi", "可改名字", {hidden: data.type !== "包边正面", disabled: selected.length !== 1}),
      getStringInfo("qujian", "区间", {validators: CustomValidators.numberRangeStr}),
      getStringInfo("gongshi", "公式", {validators: CustomValidators.lineGongshi}),
      getStringInfo("guanlianbianhuagongshi", "关联变化公式", {validators: CustomValidators.lineGuanlianbianhuagongshi}),
      getStringInfo("分体线长公式"),
      getStringInfo("kongwei", "孔位"),
      getSelectSingleInfo(zhewanOptions, "nextZhewan", "下一个折弯标线"),
      getSelectSingleInfo(zhewanOptions, "betweenZhewan", "两根线之间的折弯标记"),
      getNumberInfo("zhewanOffset", "折弯标记偏移"),
      getNumberInfo("zhewanValue", "指定折弯标记位置"),
      getSelectSingleInfo(cadLineOptions.zhankaifangshi.values, "zhankaifangshi", "展开方式"),
      getStringInfo("zidingzhankaichang", "指定展开长", {hidden: this.getLineValue("zhankaifangshi").value !== "指定长度"}),
      {
        type: "string",
        label: "条件取值",
        readonly: true,
        disabled,
        value: (() => {
          const es = selected.filter((v) => v instanceof CadLine);
          if (es.length > 1) {
            return "只能选一根线";
          }
          const e = es[0];
          if (e) {
            return `${e.tiaojianquzhi.length}条数据`;
          }
          return "";
        })(),
        suffixIcons: [
          {
            name: "edit",
            isDefault: true,
            onClick: () => {
              this.editTiaojianquzhi();
            }
          }
        ]
      },
      getSelectSingleInfo(cadLineOptions.zhankaixiaoshuchuli.values, "zhankaixiaoshuchuli", "展开小数处理"),
      getSelectSingleInfo(cadLineOptions.suanliaosanxiaoshuchuli.values, "suanliaosanxiaoshuchuli", "算料单小数处理"),
      getBooleanInfo("kailiaoshishanchu", "开料时删除"),
      getBooleanInfo("门框分体模板跳过折弯线识别", undefined, undefined, true),
      getSelectSingleInfo(cadLineOptions.变化方式.values, "变化方式"),
      getBooleanInfo("可输入修改"),
      getSelectSingleInfo(cadLineOptions.圆弧显示.values, "圆弧显示"),
      getSelectSingleInfo(cadLineOptions.企料位置识别.values, "企料位置识别"),
      getBooleanInfo("算料不要"),
      getBooleanInfo("开料不要"),
      getStringInfo("双向折弯附加值"),
      getSelectSingleInfo(cadLineOptions.线功能.values, "线功能")
    ];
    return infos;
  });

  getLinewidth() {
    const lines = this.selected();
    if (lines.length === 1) {
      return linewidth2lineweight(lines[0].linewidth).toString();
    }
    if (lines.length) {
      const texts = Array.from(new Set(lines.map((l) => l.linewidth)));
      if (texts.length === 1) {
        return linewidth2lineweight(texts[0]).toString();
      }
      return "多个值";
    }
    return "";
  }

  setLinewidth(event: Event) {
    this.selected().forEach((entity) => {
      const width = Number((event.target as HTMLInputElement).value);
      entity.linewidth = lineweight2linewidth(width);
    });
    this.status.cad.render();
  }

  drawLine() {
    this.status.toggleCadStatus(new CadStatusDrawLine(false));
  }

  moveLines() {
    this.status.toggleCadStatus(new CadStatusMoveLines());
  }

  cutLine() {
    this.status.toggleCadStatus(new CadStatusCutLine());
  }

  async addLineDrawing(round: boolean, isFinished = false) {
    const lineDrawing = this.lineDrawing;
    const entity = lineDrawing?.entity;
    if (!lineDrawing || !entity) {
      return;
    }
    const cad = this.status.cad;
    if (round) {
      await this.status.setLinesLength([entity], Math.round(entity.length));
    } else {
      await this.status.updateCadTotalLength();
    }
    if (isFinished) {
      this.status.generateLineTexts();
    }
    await cad.render(entity);
    entity.opacity = 1;
    entity.selectable = true;
    this._updateCadPoints();
  }

  async autoFix() {
    const selected = this.selected();
    const cad = this.status.cad;
    selected.forEach((e) => {
      if (e instanceof CadLine) {
        autoFixLine(cad, e);
      }
    });
    this.status.validate();
    await cad.render();
    await this.status.refreshCadFenti();
  }

  async editTiaojianquzhi() {
    const lines = this.selected().filter((v) => v instanceof CadLine);
    if (lines.length < 1) {
      this.message.alert("请先选中一条直线");
    } else if (lines.length > 1) {
      this.message.alert("无法同时编辑多根线的条件取值");
    } else {
      const result = await openCadLineTiaojianquzhiDialog(this.dialog, {data: lines[0]});
      if (result) {
        this.status.emitChangeCadSignal();
      }
    }
  }

  canAddWHDashedLines() {
    const selected = this.selected();
    if (selected.length !== 1) {
      return false;
    }
    const line = selected[0];
    if (line instanceof CadLineLike) {
      const {deltaX, deltaY} = line;
      return deltaX !== 0 && deltaY !== 0;
    }
    return false;
  }

  toggleWHDashedLines() {
    this.status.toggleCadStatus(new CadStatusIntersection("addWHDashedLines"));
  }

  addWHDashedLinesStart() {
    const line = this.selected()[0];
    const data = this.data;
    if (!(line instanceof CadLineLike) || !data) {
      return;
    }
    const {minX, minY, maxX, maxY, start, end} = line;
    const topLeft = new Point(minX, maxY);
    const topRight = new Point(maxX, maxY);
    const bottomLeft = new Point(minX, minY);
    const bottomRight = new Point(maxX, minY);
    const points: [Point, Point, Required<CadLine>["宽高虚线"]["position"]][] = [
      [topLeft, topRight, "上"],
      [bottomLeft, bottomRight, "下"],
      [topLeft, bottomLeft, "左"],
      [topRight, bottomRight, "右"]
    ];

    const lines = points.map((v) => {
      const l = new CadLine({start: v[0], end: v[1]});
      l.dashArray = Defaults.DASH_ARRAY;
      l.opacity = 0.7;
      l.宽高虚线 = {source: line.id, position: v[2]};
      return l;
    });
    const map: PointsMap = [
      {point: new Point(), lines: [], selected: false},
      {point: new Point(), lines: [], selected: false}
    ];
    if (bottomLeft.equals(start) || bottomLeft.equals(end)) {
      map[0].point.copy(topLeft);
      map[1].point.copy(bottomRight);
      map[0].lines = [lines[0], lines[2]];
      map[1].lines = [lines[1], lines[3]];
    } else {
      map[0].point.copy(bottomLeft);
      map[1].point.copy(topRight);
      map[0].lines = [lines[1], lines[2]];
      map[1].lines = [lines[0], lines[3]];
    }
    this.WHDashedLines = {line, map};
    this.status.setCadPoints(map);
    const whLinesBefore = line.children.line.filter((l) => l.宽高虚线);
    whLinesBefore.forEach((l) => l.remove());
    line.removeChild(...whLinesBefore);
    line.addChild(...lines);
    this.status.cad.render(lines);
  }

  addWHDashedLinesEnd() {
    if (this.WHDashedLines) {
      this.WHDashedLines.map.forEach((v) => {
        v.lines.forEach((line) => line.remove());
      });
      this.WHDashedLines = null;
      this.status.setCadPoints();
    }
  }
}
