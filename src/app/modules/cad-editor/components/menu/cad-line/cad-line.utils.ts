import {CadCollection} from "@app/cad/collections";
import {CustomValidators} from "@app/utils/input-validators";
import {算料公式} from "@components/lurushuju/xinghao-data";
import {CadData, CadLine, CadLineLike, cadLineOptions, CadViewer, setLinesLength} from "@lucilor/cad-viewer";
import {keysOf} from "@lucilor/utils";
import {InputInfo, InputInfoArray} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {getData} from "../cad-info/cad-info.utils";

export const cadLineFields = {
  名字: "mingzi",
  名字2: "mingzi2",
  公式: "gongshi",
  显示线长: "显示线长",
  关联变化公式: "guanlianbianhuagongshi",
  双向折弯附加值: "双向折弯附加值",
  线长字体大小: "lengthTextSize",
  企料位置识别: "企料位置识别",
  圆弧显示: "圆弧显示"
} as const;

export const getLine = (data: CadLineLike | (() => CadLineLike)) => (typeof data === "function" ? data() : data);

export const stringifyLineNames = (list: string[]) => {
  const mingzi = list[0]?.trim() ?? "";
  const mingzi2 = list.slice(1).join("*");
  return {mingzi, mingzi2};
};
export const parseLineNames = (mingzi: string, mingzi2: string) => {
  const names = [mingzi];
  if (mingzi2) {
    names.push(...mingzi2.split("*"));
  } else if (mingzi) {
    names.push("");
  }
  return names;
};

export const getCadLineInputs = (
  keys: string[],
  data: CadData | (() => CadData),
  line: CadLineLike | (() => CadLineLike),
  status: AppStatusService,
  gongshis: 算料公式[] | null | undefined
) => {
  const result: InputInfo<CadLineLike>[] = [];
  line = getLine(line);
  const isLine = line instanceof CadLine;
  const lineLength = Number(line.length.toFixed(2));
  const gongshiOptions = status.getGongshiOptions(gongshis);
  let hasMingzi = false;
  for (const key of keys) {
    if (result.some((v) => v.label === key)) {
      continue;
    }
    let info: InputInfo | undefined;
    const getter = new InputInfoWithDataGetter(line, {clearable: true});
    const getter2 = new InputInfoWithDataGetter(line.info, {clearable: true});
    switch (key) {
      case "名字":
      case "名字2":
        if (hasMingzi) {
          continue;
        } else {
          hasMingzi = true;
          info = {
            type: "array",
            label: "",
            valueLabel: (i) => (i === 0 ? "名字" : "名字2"),
            sortable: true,
            value: parseLineNames(line.mingzi, line.mingzi2),
            onChange: (val) => {
              const {mingzi, mingzi2} = stringifyLineNames(val);
              line.mingzi = mingzi;
              line.mingzi2 = mingzi2;
            }
          } satisfies InputInfoArray<unknown, string>;
        }
        break;
      case "显示线长":
      case "双向折弯附加值":
        info = getter.string(cadLineFields[key], {label: key});
        break;
      case "线长字体大小":
        info = getter.number(cadLineFields[key], {label: key});
        break;
      case "公式":
        info = getter.string(cadLineFields[key], {label: key, options: gongshiOptions, validators: CustomValidators.lineGongshi});
        break;
      case "关联变化公式":
        info = getter.string(cadLineFields[key], {label: key, validators: CustomValidators.lineGuanlianbianhuagongshi});
        break;
      case "线长":
        info = {type: "number", label: key, value: lineLength, readonly: !isLine};
        break;
      case "企料位置识别":
        info = getter.selectSingle(cadLineFields[key], cadLineOptions.企料位置识别.values.slice(), {label: key});
        break;
      case "圆弧显示":
        info = getter.selectSingle(cadLineFields[key], cadLineOptions[key].values.slice(), {label: key});
        break;
      case "可改名字":
        {
          const vars = getData(data).info.vars || {};
          let value: string | undefined;
          for (const k in vars) {
            if (vars[k] === line.id) {
              value = k;
              break;
            }
          }
          info = {
            type: "string",
            label: key,
            value,
            onChange: (val) => {
              const dataInfo = getData(data).info;
              if (val) {
                if (!dataInfo.vars) {
                  dataInfo.vars = {};
                }
                for (const infoKey in dataInfo.vars) {
                  if (dataInfo.vars[infoKey] === line.id) {
                    delete dataInfo.vars[infoKey];
                  }
                }
                dataInfo.vars[val] = line.id;
              }
            },
            validators: (control) => {
              const val = control.value;
              const infoVars = getData(data).info.vars || {};
              for (const varName in infoVars) {
                if (varName === val && infoVars[varName] !== line.id) {
                  return {名字已存在: true};
                }
              }
              return null;
            }
          };
        }
        break;
      case "门框分体模板跳过折弯线识别":
        info = getter2.boolean(key);
        break;
      default:
        info = {type: "string", label: key + "（未实现）", disabled: true};
    }
    if (info) {
      result.push(info);
    }
  }
  return result;
};

export const openCadLineForm = async (
  collection: CadCollection,
  status: AppStatusService,
  message: MessageService,
  cad: CadViewer,
  line: CadLineLike,
  gongshis: 算料公式[] | null | undefined
) => {
  const line2 = line.clone();
  const lineLength = Number(line.length.toFixed(2));
  const isLine = line instanceof CadLine;
  const data = cad.data;
  const yaoqiu = await status.fetchAndGetCadYaoqiu(data.type);
  const vars = cloneDeep(data.info.vars);
  const form = getCadLineInputs(yaoqiu?.线段弹窗修改属性 || [], data, line2, status, gongshis);
  if (collection === "kailiaocadmuban" && !form.some((v) => v.label === "关联变化公式")) {
    form.push({type: "string", label: "关联变化公式", model: {data: line, key: "guanlianbianhuagongshi"}});
  }
  let title = "编辑线";
  const name = line.mingzi || line.mingzi2;
  if (name) {
    title += `【${name}】`;
  }
  const result = await message.form(form, {title});
  if (result) {
    for (const key of keysOf(cadLineFields)) {
      const key2 = cadLineFields[key];
      (line as any)[key2] = line2[key2];
    }
    let toChange = [line];
    if (isLine && result.线长 !== lineLength) {
      toChange = cad.data.entities.line;
      if (cad === status.cad) {
        status.setLinesLength([line], result.线长);
      } else {
        setLinesLength(data, [line], result.线长);
      }
    }
    await cad.render(toChange);
  } else {
    data.info.vars = vars;
  }
  return result;
};
