import {Angle, Arc, getTypeOf, Line, Matrix, Point, timeout} from "@lucilor/utils";
import {Container, Element, Image, Path, PathArrayAlias, Circle as SvgCircle, Line as SvgLine, Text} from "@svgdotjs/svg.js";
import {CadAxis, CadDimensionBlock, CadImage} from "./cad-data";
import {CadDimension} from "./cad-data/cad-entity/cad-dimension";
import {CadDimensionStyle, FontStyle, LineStyle} from "./cad-data/cad-styles";

const setLineStyle = (el: Element, style: LineStyle) => {
  const {color, width, dashArray} = style;
  el.stroke({width, color});
  if (dashArray) {
    el.css("stroke-dasharray" as any, dashArray.join(", "));
  }
};

export const drawLine = (draw: Container, start: Point, end: Point, style?: LineStyle, i = 0) => {
  let el = draw.children()[i] as SvgLine;
  let {x: x1, y: y1} = start;
  let {x: x2, y: y2} = end;
  const {dashArray, padding, forcePadding} = style || {};
  if (forcePadding || (dashArray && dashArray.length > 0)) {
    const line = new Line(start, end);
    let [offsetStart, offsetEnd] = Array.isArray(padding) ? [...padding] : [padding];
    const getNum = (n: any) => {
      const result = Number(n);
      if (isNaN(result)) {
        return 0;
      }
      if (forcePadding) {
        return result;
      }
      return Math.min(result, line.length / 10);
    };
    offsetStart = getNum(offsetStart);
    offsetEnd = typeof offsetEnd === "number" ? getNum(offsetEnd) : offsetStart;
    const theta = line.theta.rad;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    x1 += offsetStart * cos;
    y1 += offsetStart * sin;
    x2 -= offsetEnd * cos;
    y2 -= offsetEnd * sin;
  }
  if (el instanceof SvgLine) {
    el.plot(x1, y1, x2, y2);
  } else {
    el = draw.line(x1, y1, x2, y2).addClass("stroke").fill("none");
  }
  setLineStyle(el, style || {});
  return [el];
};

export const drawCircle = (draw: Container, center: Point, radius: number, style?: LineStyle, i = 0) => {
  let el = draw.children()[i] as SvgCircle;
  if (el instanceof SvgCircle) {
    el.size(radius * 2).center(center.x, center.y);
  } else {
    el = draw.circle(radius * 2).center(center.x, center.y);
    el.addClass("stroke");
    if (style?.fillColor) {
      el.fill(style.fillColor);
      el.addClass("fill");
    } else {
      el.fill("none");
    }
  }
  setLineStyle(el, style || {});
  return [el];
};

export const drawArc = (
  draw: Container,
  center: Point,
  radius: number,
  startAngle: number,
  endAngle: number,
  clockwise: boolean,
  style?: LineStyle,
  i = 0
) => {
  const arc = new Arc(new Point(center.x, center.y), radius, new Angle(startAngle, "deg"), new Angle(endAngle, "deg"), clockwise);
  const totalAngle = arc.totalAngle.deg;
  if (totalAngle === 360) {
    return drawCircle(draw, center, radius, style, i);
  }
  const isLargeArc = totalAngle > 180 ? 1 : 0;
  const {x: x0, y: y0} = arc.startPoint;
  const {x: x1, y: y1} = arc.endPoint;
  const path: PathArrayAlias = [
    ["M", x0, y0],
    ["A", radius, radius, 0, isLargeArc, clockwise ? 0 : 1, x1, y1]
  ];
  let el = draw.children()[i] as Path;
  if (el instanceof Path) {
    el.plot(path);
  } else {
    el = draw.path(path).addClass("stroke").fill("none");
  }
  setLineStyle(el, style || {});
  return [el];
};

export const drawText = (draw: Container, text: string, position: Point, anchor: Point, style?: FontStyle, i = 0) => {
  const {size, family, weight, color, vertical, vertical2} = style || {};
  if (!text || !size || !(size > 0)) {
    draw.remove();
    return [];
  }
  let el = draw.children()[i] as Text;
  if (el instanceof Text) {
    el.text(text).font({size});
  } else {
    el = draw.text(text).addClass("fill").stroke("none");
    el.font({size}).leading(1);
  }
  el.css("transform-box" as any, "fill-box");
  el.css("white-space" as any, "pre");
  el.css("transform-origin" as any, `${anchor.x * 100}% ${anchor.y * 100}%`);
  const {width, height} = el.bbox();
  let tx = -width * anchor.x;
  let ty = -height * anchor.y;
  let deg = 0;
  if (vertical) {
    tx += height / 2;
    ty -= width / 2;
    deg = 90;
  }
  const getStr = (val: any) => {
    switch (getTypeOf(val)) {
      case "string":
        return val;
      case "number":
        return String(val);
      default:
        return "";
    }
  };
  if (vertical2) {
    el.css("writing-mode" as any, "vertical-lr");
  } else {
    el.css("writing-mode" as any, "");
  }
  el.css("transform", `translate(${tx}px, ${ty}px) scale(1, -1) rotate(${deg}deg)`);
  el.css("font-family" as any, getStr(family));
  el.css("font-weight" as any, getStr(weight));
  if (color) {
    el.fill(color);
  } else {
    el.fill("");
  }
  el.move(position.x, position.y);
  return [el];
};

export interface DrawShapeOptions {
  color?: string;
  blank?: boolean;
  i?: number;
}
export const drawShape = (draw: Container, points: Point[], options?: DrawShapeOptions) => {
  const {color, blank, i = 0} = options || {};
  let el = draw.children()[i] as Path;
  const path = points
    .map((p, j) => {
      const {x, y} = p;
      if (j === 0) {
        return `M${x} ${y}`;
      } else {
        return `L${x} ${y}`;
      }
    })
    .join(" ");
  if (el instanceof Path) {
    el.plot(path);
  } else {
    el = draw.path(path).addClass("fill stroke");
  }
  if (color) {
    el.stroke(color).fill(blank ? "none" : color);
  }
  return [el];
};

export interface ArrowInfo {
  triangle?: {
    noThirdLine?: boolean;
    reverse?: boolean;
  };
  oblique?: {
    thick?: boolean;
  };
  circle?: {
    double?: boolean;
  };
  square?: Record<string, never>;
  angle?: number;
  blank?: boolean;
  paddingFactor?: number;
  sizeFactor?: number;
}
export const getArrowInfo = (blockRaw: string) => {
  const info: ArrowInfo = {};

  const block = blockRaw.replace(/^_/, "") as CadDimensionBlock;
  switch (block) {
    case "":
    case "CLOSEDBLANK":
    case "Closed":
      info.triangle = {};
      if (block !== "Closed") {
        info.paddingFactor = 1;
      }
      if (block === "CLOSEDBLANK" || block === "Closed") {
        info.blank = true;
      }
      break;
    case "Dot":
    case "DotSmall":
      info.circle = {};
      if (block === "Dot") {
        info.paddingFactor = 0.5;
      } else {
        info.sizeFactor = 0.25;
      }
      break;
    case "DotBlank":
    case "Small":
      info.circle = {};
      info.blank = true;
      if (block === "DotBlank") {
        info.paddingFactor = 0.5;
      } else {
        info.sizeFactor = 0.25;
      }
      break;
    case "Oblique":
    case "ARCHTICK":
      info.oblique = {};
      info.angle = 45;
      if (block === "ARCHTICK") {
        info.oblique.thick = true;
      }
      break;
    case "Open":
    case "Open30":
    case "Open90":
      info.triangle = {noThirdLine: true};
      info.blank = true;
      if (block === "Open30") {
        info.angle = 30;
      } else if (block === "Open90") {
        info.angle = 90;
        info.sizeFactor = 0.5;
      }
      break;
    case "Origin":
    case "Origin2":
      info.circle = {};
      info.blank = true;
      if (block === "Origin2") {
        info.circle.double = true;
        info.paddingFactor = 0.5;
      }
      break;
    case "BoxFilled":
    case "BoxBlank":
      info.square = {};
      info.paddingFactor = 0.5;
      if (block === "BoxBlank") {
        info.blank = true;
      }
      break;
    case "DatumFilled":
    case "DatumBlank":
      info.triangle = {reverse: true};
      info.paddingFactor = 1;
      info.angle = 60;
      if (block === "DatumBlank") {
        info.blank = true;
      }
      break;
    case "Integral": // TODO
      info.oblique = {};
      info.angle = 45;
      break;
    default:
      console.warn(`Unknown arrow block: ${block}`);
  }
  return info;
};

export interface DrawArrowOptions {
  info?: ReturnType<typeof getArrowInfo>;
  color?: string;
  i?: number;
}
export const drawArrow = (draw: Container, p1: Point, p2: Point, size: number, options?: DrawArrowOptions) => {
  const info = options?.info || getArrowInfo("");
  const {angle = 20, blank} = info;
  if (typeof info.sizeFactor === "number") {
    size *= info.sizeFactor;
  }
  const {i} = options || {};
  if (info.triangle) {
    const theta = new Line(p1, p2).theta.rad;
    const dTheta = (angle / 360) * Math.PI;
    const theta1 = theta + dTheta;
    const theta2 = theta - dTheta;
    let d = size / Math.cos(dTheta);
    if (info.triangle.reverse) {
      p1 = p1.clone().add(size * Math.cos(theta), size * Math.sin(theta));
      d = -d;
    }
    const p3 = p1.clone().add(d * Math.cos(theta1), d * Math.sin(theta1));
    const p4 = p1.clone().add(d * Math.cos(theta2), d * Math.sin(theta2));
    let path: Point[];
    if (info.triangle.noThirdLine) {
      path = [p3, p1, p4];
    } else {
      path = [p1, p3, p4, p1];
    }
    return drawShape(draw, path, {color: options?.color, blank, i});
  } else if (info.oblique) {
    const theta = new Line(p1, p2).theta.rad;
    const dTheta = (45 / 180) * Math.PI;
    const theta1 = theta + dTheta;
    const theta2 = theta + dTheta + Math.PI;
    const size2 = (size / 2) * Math.SQRT2;
    const p3 = p1.clone().add(size2 * Math.cos(theta1), size2 * Math.sin(theta1));
    const p4 = p1.clone().add(size2 * Math.cos(theta2), size2 * Math.sin(theta2));
    if (info.oblique.thick) {
      const d = size / 20;
      const theta3 = theta + (135 / 180) * Math.PI;
      const dx = Math.cos(theta3) * d;
      const dy = Math.sin(theta3) * d;
      const p5 = p3.clone().add(dx, dy);
      const p6 = p3.clone().sub(dx, dy);
      const p7 = p4.clone().sub(dx, dy);
      const p8 = p4.clone().add(dx, dy);
      return drawShape(draw, [p5, p6, p7, p8, p5], {color: options?.color, blank, i});
    } else {
      return drawLine(draw, p3, p4, {color: options?.color}, options?.i);
    }
  } else if (info.circle) {
    const radius = size / 2;
    const result = drawCircle(draw, p1, radius, {color: options?.color, fillColor: info.blank ? "none" : options?.color}, i);
    if (info.circle.double) {
      const radius2 = radius / 2;
      const j = typeof i === "number" ? i + result.length : undefined;
      const result2 = drawCircle(draw, p1, radius2, {color: options?.color}, j);
      result.push(...result2);
    }
    return result;
  } else if (info.square) {
    const radius = size / 2;
    const p3 = p1.clone().add(radius, radius);
    const p4 = p1.clone().add(-radius, radius);
    const p5 = p1.clone().add(-radius, -radius);
    const p6 = p1.clone().add(radius, -radius);
    return drawShape(draw, [p3, p4, p5, p6, p3], {color: options?.color, blank, i});
  }
  return [];
};

export const drawDimensionLinear = (
  draw: Container,
  points: Point[],
  text: string,
  axis: CadAxis,
  xiaoshuchuli: CadDimension["xiaoshuchuli"],
  活动标注显示扣数?: string,
  style?: CadDimensionStyle,
  i = 0
) => {
  text = String(text);
  const color = style?.color;
  if (points.length < 4) {
    draw.remove();
    return [];
  }
  const [p1, p2, p3, p4] = points;

  let arrowSize = Number(style?.arrows?.size ?? 0);
  const arrowColor = style?.arrows?.color ?? color;
  let arrowInfos1: ReturnType<typeof getArrowInfo> | undefined;
  let arrowInfos2: ReturnType<typeof getArrowInfo> | undefined;
  const dimLinePadding = [0, 0];
  if (!style?.arrows?.hidden) {
    if (isNaN(arrowSize) || arrowSize <= 0) {
      arrowSize = Math.max(1, Math.min(20, p3.distanceTo(p4) / 8));
    }
    let block1 = "";
    let block2 = "";
    const block = style?.arrows?.block;
    if (typeof block === "string") {
      block1 = block;
      block2 = block;
    }
    if (Array.isArray(block)) {
      block1 = block[0] || "";
      block2 = block[1] || "";
    }
    arrowInfos1 = getArrowInfo(block1);
    arrowInfos2 = getArrowInfo(block2);
    if (typeof arrowInfos1.paddingFactor === "number") {
      dimLinePadding[0] = arrowSize * arrowInfos1.paddingFactor;
    }
    if (typeof arrowInfos2.paddingFactor === "number") {
      dimLinePadding[1] = arrowSize * arrowInfos2.paddingFactor;
    }
  }

  const dimLineStyle = {...style?.dimensionLine};
  if (!dimLineStyle.padding) {
    dimLineStyle.padding = dimLinePadding;
    dimLineStyle.forcePadding = true;
  }
  let dimLine: ReturnType<typeof drawLine> = [];
  if (!dimLineStyle.hidden) {
    if (!dimLineStyle.color) {
      dimLineStyle.color = color;
    }
    dimLine = drawLine(draw, p3, p4, dimLineStyle, i);
    dimLine.forEach((el) => el.addClass("dim-line"));
    i += dimLine.length;
  }
  const extLinesStyle = style?.extensionLines || {};
  let extLine1: ReturnType<typeof drawLine> = [];
  let extLine2: ReturnType<typeof drawLine> = [];
  if (!extLinesStyle.hidden) {
    const length = extLinesStyle.length;
    if (!extLinesStyle.color) {
      extLinesStyle.color = color;
    }
    if (typeof length === "number") {
      if (axis === "x") {
        extLine1 = drawLine(draw, p3.clone().sub(0, length), p3.clone().add(0, length), extLinesStyle, i);
        i += extLine1.length;
        extLine2 = drawLine(draw, p4.clone().sub(0, length), p4.clone().add(0, length), extLinesStyle, i);
        i += extLine2.length;
      } else if (axis === "y") {
        extLine1 = drawLine(draw, p3.clone().sub(length, 0), p3.clone().add(length, 0), extLinesStyle, i);
        i += extLine1.length;
        extLine2 = drawLine(draw, p4.clone().sub(length, 0), p4.clone().add(length, 0), extLinesStyle, i);
        i += extLine2.length;
      }
    } else {
      extLine1 = drawLine(draw, p1, p3, extLinesStyle, i);
      i += extLine1.length;
      extLine2 = drawLine(draw, p2, p4, extLinesStyle, i);
      i += extLine2.length;
    }
    [...extLine1, ...extLine2].forEach((el) => el.addClass("ext-line"));
  }
  let arrow1: ReturnType<typeof drawArrow> = [];
  let arrow2: ReturnType<typeof drawArrow> = [];
  if (arrowInfos1) {
    arrow1 = drawArrow(draw, p3, p4, arrowSize, {info: arrowInfos1, color: arrowColor, i});
    i += arrow1.length;
  }
  if (arrowInfos2) {
    arrow2 = drawArrow(draw, p4, p3, arrowSize, {info: arrowInfos2, color: arrowColor, i});
    i += arrow2.length;
  }
  [...arrow1, ...arrow2].forEach((el) => el.addClass("dim-arrow"));
  const textStyle = {...style?.text};
  let textEls: ReturnType<typeof drawText> = [];
  if (!textStyle.hidden) {
    if (!textStyle.color) {
      textStyle.color = color;
    }
    if (text === "") {
      text = "<>";
    }
    const suffixs: string[] = [];
    if (text.includes("活动标注") && !text.includes("<>")) {
      suffixs.push("<>");
    }
    if (活动标注显示扣数) {
      const 活动标注显示扣数2 = Number(活动标注显示扣数);
      if (活动标注显示扣数2 > 0) {
        活动标注显示扣数 = "+" + 活动标注显示扣数;
      }
      suffixs.push(`扣数${活动标注显示扣数}`);
    }
    if (suffixs.length > 0) {
      text += `(${suffixs.join(", ")})`;
    }
    if (text.includes("<>")) {
      const num = p3.distanceTo(p4);
      let numStr: string;
      switch (xiaoshuchuli) {
        case "四舍五入":
          numStr = Math.round(num).toString();
          break;
        case "舍去小数":
          numStr = Math.floor(num).toString();
          break;
        case "小数进一":
          numStr = Math.ceil(num).toString();
          break;
        case "保留一位":
          numStr = num.toFixed(1);
          break;
        case "保留两位":
          numStr = num.toFixed(2);
          break;
        default:
          numStr = num.toString();
          break;
      }
      text = text.replace(/<>/g, numStr);
    }
    const middle = p3.clone().add(p4).divide(2);
    if (axis === "x") {
      textEls = drawText(draw, text, middle, new Point(0.5, 1), textStyle, i);
    } else if (axis === "y") {
      textStyle.vertical = true;
      textEls = drawText(draw, text, middle, new Point(1, 0.5), textStyle, i);
    }
    textEls.forEach((el) => el.addClass("dim-text"));
    i += textEls.length;
  }

  return [...dimLine, ...extLine1, ...extLine2, ...arrow1, ...arrow2, ...textEls].filter((v) => v);
};

export const drawLeader = (draw: Container, start: Point, end: Point, size: number, color?: string, i = 0) => {
  const line = drawLine(draw, start, end, {color}, i);
  i += line.length;
  const arrowInfo = getArrowInfo("");
  const triangle = drawArrow(draw, start, end, size, {info: arrowInfo, color, i});
  i += triangle.length;
  return [...line, ...triangle];
};

export const drawImage = async (draw: Container, e: CadImage, i = 0) => {
  if (!e.sourceSize) {
    e.sourceSize = new Point(0, 0);
  }
  const {url, position, anchor, sourceSize, targetSize, objectFit, transformMatrix} = e;
  let imageContainer = draw.children()[i] as Container;
  let imageEl: Image;
  if (imageContainer) {
    imageEl = imageContainer.findOne("image") as Image;
  } else {
    imageContainer = draw.group();
    imageContainer.css({
      transform: "scale(1, -1)",
      "transform-origin": "50% 50%",
      "transform-box": "fill-box"
    } as any);
    imageEl = imageContainer.image();
    imageEl.css({
      "transform-origin": `${anchor.x * 100}% ${anchor.y * 100}%`,
      "transform-box": "fill-box"
    } as any);
  }
  if (url && imageEl.attr("href") !== url) {
    imageEl.load(url);
    await new Promise<void>((resolve) => {
      imageEl.on("load", async () => {
        await timeout(0);
        resolve();
      });
      imageEl.on("error", (event) => {
        console.error(event);
        resolve();
      });
    });
  }
  const sw = imageEl.node.width.baseVal.value;
  const sh = imageEl.node.height.baseVal.value;
  let tw: number;
  let th: number;
  sourceSize.set(sw, sh);
  if (targetSize) {
    tw = targetSize.x;
    th = targetSize.y;
  } else {
    tw = sw;
    th = sh;
  }
  const translateX = position.x - anchor.x * sw;
  const translateY = position.y - anchor.y * sh;
  let scaleX: number;
  let scaleY: number;
  if (sw > 0 && sh > 0) {
    scaleX = tw / sw;
    scaleY = th / sh;
    const sourceRatio = sw / sh;
    const targetRatio = tw / th;
    switch (objectFit) {
      case "contain":
        if (sourceRatio >= targetRatio) {
          scaleY = scaleX;
        } else {
          scaleX = scaleY;
        }
        break;
      case "cover":
        if (sourceRatio >= targetRatio) {
          scaleX = scaleY;
        } else {
          scaleY = scaleX;
        }
        break;
      case "fill":
        break;
      case "scale-down": {
        if (sw <= tw || sh <= th) {
          scaleX = scaleY = 1;
        } else if (sourceRatio >= targetRatio) {
          scaleY = scaleX;
        } else {
          scaleX = scaleY;
        }
        break;
      }
      case "none":
        scaleX = 1;
        scaleY = 1;
        break;
      default:
        break;
    }
  } else {
    scaleX = 1;
    scaleY = 1;
  }
  const matrix = new Matrix({translate: [translateX, translateY], scale: [scaleX, scaleY], origin: anchor});
  matrix.transform(transformMatrix);
  imageEl.transform(matrix);
  return [imageContainer];
};
