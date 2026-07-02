import {CadCollection} from "@app/cad/collections";
import {validColors} from "@app/cad/utils";
import {toFixed} from "@app/utils/func";
import {environment} from "@env";
import {CadData, CadMtext, CadStylizer, CadViewer, FontStyle} from "@lucilor/cad-viewer";
import {Angle, keysOf, ObjectOf} from "@lucilor/utils";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import Color from "color";

export const cadMtextFields = {
  内容: "text",
  锚点: "anchor",
  样式: "fontStyle",
  变换: "transformMatrix"
} as const satisfies ObjectOf<keyof CadMtext>;

export const getCadMtextInputs = (
  keys: string[],
  data: CadData | (() => CadData),
  mtext: CadMtext | (() => CadMtext),
  status: AppStatusService
) => {
  const result: InputInfo[] = [];
  const getMtext = (data: CadMtext | (() => CadMtext)) => (typeof data === "function" ? data() : data);
  mtext = getMtext(mtext);
  for (const key of keys) {
    if (result.some((v) => v.label === key)) {
      continue;
    }
    let info: InputInfo | InputInfo[] | undefined;
    const getter = new InputInfoWithDataGetter(mtext, {clearable: true});
    const config = status.cad.getConfig();
    let fontStyle: FontStyle | undefined;
    const getFontStyle = () => {
      if (!fontStyle) {
        fontStyle = CadStylizer.get(mtext, config).fontStyle;
      }
      return fontStyle;
    };
    const setFontStyle = (style: Partial<FontStyle>) => {
      Object.assign(mtext.fontStyle, style);
    };
    switch (key) {
      case "内容":
        info = getter.string(cadMtextFields[key], {label: key, textarea: {autosize: {minRows: 1}}});
        break;
      case "字体大小":
        info = {
          type: "number",
          label: key,
          value: getFontStyle().size,
          onInput: (val) => {
            setFontStyle({size: val});
          }
        };
        break;
      case "颜色":
        info = {
          type: "color",
          label: key,
          value: mtext.getColor(),
          options: validColors.map((v) => new Color(v)),
          onChange: (val) => {
            mtext.setColor(val);
          }
        };
        break;
      case "锚点":
        info = {
          type: "coordinate",
          label: key,
          value: mtext.anchor.toArray(),
          onChange: (val) => {
            mtext.anchor.set(val.anchor[0], val.anchor[1]);
          }
        };
        break;
      case "旋转角度":
        info = {
          type: "number",
          label: key,
          value: Number(toFixed(getCadMtextRotate(mtext), status.cadNumberDigits())),
          onChange: (val) => {
            setCadMtextRotate(mtext, val);
          }
        };
        break;
      case "竖排":
        info = {
          type: "boolean",
          label: key,
          value: getFontStyle().vertical,
          onChange: (val) => {
            setFontStyle({vertical: val});
          }
        };
        break;
      case "竖排2":
        info = {
          type: "boolean",
          label: key,
          value: getFontStyle().vertical2,
          onChange: (val) => {
            setFontStyle({vertical2: val});
          }
        };
        break;
      default:
        info = {type: "string", label: key + "（未实现）", disabled: true};
    }
    if (info) {
      if (Array.isArray(info)) {
        result.push(...info);
      } else {
        result.push(info);
      }
    }
  }
  return result;
};

export const openCadMtextForm = async (
  collection: CadCollection,
  status: AppStatusService,
  message: MessageService,
  cad: CadViewer,
  mtext: CadMtext
) => {
  const mtext2 = mtext.clone();
  const data = cad.data;
  const keys = ["内容", "字体大小", "颜色", "锚点", "旋转角度", "竖排"];
  if (!environment.production) {
    keys.push("竖排2");
  }
  const form = getCadMtextInputs(keys, data, mtext2, status);
  const result = await message.form(form, {title: "编辑文本"});
  if (result) {
    for (const key of keysOf(cadMtextFields)) {
      const key2 = cadMtextFields[key];
      (mtext as any)[key2] = mtext2[key2];
    }
    mtext.setColor(mtext2.getColor());
    status.emitChangeCadSignal();
    await cad.render(mtext);
  }
  return result;
};

export const getCadMtextRotate = (mtext: CadMtext) => {
  const lastRotate = mtext.info.lastRotate;
  if (typeof lastRotate === "number") {
    return lastRotate;
  }
  return Angle.radToDeg(mtext.transformMatrix.rotate());
};
export const setCadMtextRotate = (mtext: CadMtext, deg: number) => {
  let rotateRad: number;
  const lastRotate = mtext.info.lastRotate;
  if (typeof lastRotate === "number") {
    rotateRad = Angle.degToRad(lastRotate);
  } else {
    rotateRad = mtext.transformMatrix.rotate();
  }
  mtext.transformMatrix.rotate(-rotateRad + Angle.degToRad(deg));
  mtext.info.lastRotate = deg;
};
