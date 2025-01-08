import {ResultWithErrors} from "@app/utils/error-message";
import {CadData, CadEntities, CadLine, CadLineLike, CadViewer} from "@lucilor/cad-viewer";

export interface CadFentiInfo {
  separators: CadLineLike[];
  rawEntities: CadEntities;
  fentiEntities: CadEntities;
}
export const getCadFentiInfo = (data: CadData): CadFentiInfo => {
  const separators: CadLineLike[] = [];
  const rawEntities = new CadEntities();
  const fentiEntities = new CadEntities();
  data.entities.forEach((e) => {
    if (e instanceof CadLineLike) {
      switch (e.线功能) {
        case "分体线":
          fentiEntities.add(e);
          break;
        case "CAD分体区分隔线":
          separators.push(e);
          break;
        default:
          rawEntities.add(e);
          break;
      }
    } else {
      rawEntities.add(e);
    }
  });
  return {separators, rawEntities, fentiEntities};
};

export const fentiSpace = 300;

export const addCadFentiSeparator = async (viewer: CadViewer, info?: CadFentiInfo) => {
  if (!info) {
    info = getCadFentiInfo(viewer.data);
  }
  const result = new ResultWithErrors(info);
  const {separators, rawEntities} = info;
  if (separators.length > 0) {
    return result.addWarningStr("已经存在分体区分隔线");
  }
  if (rawEntities.length < 1) {
    return result.addErrorStr("CAD为空");
  }
  const line = new CadLine();
  setCadFentiSeparator(line, info);
  await viewer.add(line);
  return result;
};
export const setCadFentiSeparator = (line: CadLineLike, info: CadFentiInfo) => {
  line.线功能 = "CAD分体区分隔线";
  line.layer = "不显示";
  line.setColor("lime");
  const rawRect = info.rawEntities.getBoundingRect();
  line.start.set(rawRect.right + fentiSpace, rawRect.bottom - 500);
  line.end.set(rawRect.right + fentiSpace, rawRect.top + 500);
};

export const removeCadFentiSeparator = async (viewer: CadViewer) => {
  const cadFentiInfo = getCadFentiInfo(viewer.data);
  const result = new ResultWithErrors(cadFentiInfo);
  const {separators, fentiEntities} = cadFentiInfo;
  if (separators.length < 1) {
    return result.addWarningStr("没有分体区分隔线");
  }
  if (fentiEntities.length > 0) {
    return result.addWarningStr("有分体线时不能删除分体区分隔线");
  }
  viewer.data.分体拼接位置 = [];
  viewer.data.分体对应线 = [];
  await viewer.remove(...separators);
  return result;
};

export const addCadFentiEntities = async (viewer: CadViewer, entities: CadEntities, emptyError: string) => {
  const addResult = await addCadFentiSeparator(viewer);
  if (addResult.hasError()) {
    return addResult;
  }
  const info = addResult.data;
  const result = new ResultWithErrors(info);
  const fentiEntities = new CadEntities();
  const skipXiangongnengs: CadLineLike["线功能"][] = ["分体线", "CAD分体区分隔线"];
  entities.forEach((e) => {
    if (e instanceof CadLineLike && !skipXiangongnengs.includes(e.线功能)) {
      fentiEntities.add(convertToCadFentiLine(e));
    }
  });
  if (fentiEntities.length < 1) {
    return result.addErrorStr(emptyError);
  }
  setCadFentiEntities(fentiEntities, info);
  await viewer.add(fentiEntities);
  return result;
};
export const setCadFentiEntities = (fentiEntities: CadEntities, info: CadFentiInfo) => {
  const fentiEntitiesIds = fentiEntities.toArray().map((e) => e.id);
  const fentiEntitiesPrev = info.fentiEntities.filter((e) => !fentiEntitiesIds.includes(e.id));
  const fentiRect = fentiEntities.getBoundingRect();
  const separator = info.separators[0];
  let dx = 0;
  let dy = 0;
  if (fentiEntitiesPrev.length > 0) {
    const fentiRectPrev = fentiEntitiesPrev.getBoundingRect();
    dx = fentiRectPrev.right - fentiRect.left + fentiSpace;
    dy = fentiRectPrev.y - fentiRect.y;
  } else if (separator) {
    dx = separator.maxX - fentiRect.left + fentiSpace;
    dy = separator.middle.y - fentiRect.y;
  }
  fentiEntities.transform({translate: [dx, dy]}, true);
};
export const convertToCadFentiLine = <T extends CadLineLike>(entity: T) => {
  const entity2 = entity.clone(true);
  entity2.线功能 = "分体线";
  return entity2 as T;
};

export const refreshCadFenti = async (viewer: CadViewer) => {
  const info = getCadFentiInfo(viewer.data);
  const {separators, fentiEntities} = info;
  if (fentiEntities.length < 1) {
    return;
  }
  if (separators.length > 0) {
    if (separators.length > 1) {
      await viewer.remove(...separators.slice(1));
    }
    setCadFentiSeparator(separators[0], info);
    await viewer.render(separators[0]);
  } else {
    await addCadFentiSeparator(viewer, info);
  }
  setCadFentiEntities(fentiEntities, info);
  await viewer.render(fentiEntities);
};
