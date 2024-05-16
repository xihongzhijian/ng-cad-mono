import {CadCollection} from "@app/cad/collections";
import {InputInfo} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {AppStatusService} from "@app/services/app-status.service";
import {CadLine, CadLineLike, CadViewer, setLinesLength} from "@lucilor/cad-viewer";
import {keysOf} from "@lucilor/utils";

export const cadLineFields = {
  名字: "mingzi",
  名字2: "mingzi2",
  公式: "gongshi",
  显示线长: "显示线长",
  关联变化公式: "guanlianbianhuagongshi",
  双向折弯附加值: "双向折弯附加值"
} as const;

export const getCadInfoInputs = (keys: string[], data: CadLineLike | (() => CadLineLike)) => {
  const result: InputInfo<CadLineLike>[] = [];
  const lineLength = Number(data.length.toFixed(2));
  const isLine = data instanceof CadLine;
  for (const key of keys) {
    let info: InputInfo;
    switch (key) {
      case "名字":
      case "名字2":
      case "公式":
      case "显示线长":
      case "关联变化公式":
      case "双向折弯附加值":
        info = {type: "string", label: key, model: {data, key: cadLineFields[key]}};
        break;
      case "线长":
        info = {type: "number", label: key, value: lineLength, readonly: !isLine};
        break;
      default:
        info = {type: "string", label: key + "（未实现）", disabled: true};
    }
    info.clearable = true;
    result.push(info);
  }
  return result;
};

export const openCadLineForm = async (
  collection: CadCollection,
  status: AppStatusService,
  message: MessageService,
  cad: CadViewer,
  line: CadLineLike
) => {
  const line2 = line.clone();
  const lineLength = Number(line.length.toFixed(2));
  const isLine = line instanceof CadLine;
  await status.fetchCad数据要求List();
  const yaoqiu = status.getCad数据要求(cad.data.type);
  const form = getCadInfoInputs(yaoqiu?.线段弹窗修改属性 || [], line2);
  if (collection === "kailiaocadmuban" && !form.some((v) => v.label === "关联变化公式")) {
    form.push({type: "string", label: "关联变化公式", model: {data: line, key: "guanlianbianhuagongshi"}});
  }
  let title = "编辑线";
  const name = line.mingzi || line.mingzi2;
  if (name) {
    title += `【${name}】`;
  }
  const result = await message.form({title, form});
  if (result) {
    for (const key of keysOf(cadLineFields)) {
      const key2 = cadLineFields[key];
      line[key2] = line2[key2] as any;
    }
    let toChange = [line];
    if (isLine && result.线长 !== lineLength) {
      toChange = cad.data.entities.line;
      setLinesLength(cad.data, [line], result.线长);
    }
    await cad.render(toChange);
  }
  return result;
};
