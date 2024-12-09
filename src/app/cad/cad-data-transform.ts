import {CadBaseLine, CadData, CadDimension, CadJointPoint} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {AppConfig} from "@services/app-config.service";
import {CadCollection} from "./collections";
import {cadOptions} from "./options";
import {isShiyitu} from "./utils";

export const setCadData = (data: CadData, project: string, collection: CadCollection, config: AppConfig) => {
  if (data.baseLines.length < 1) {
    data.baseLines.push(new CadBaseLine());
  }
  if (data.jointPoints.length < 1) {
    data.jointPoints.push(new CadJointPoint());
  }
  if (data.算料单线长显示的最小长度 === null) {
    data.算料单线长显示的最小长度 = project === "yhmy" ? 5 : 6;
  }
  if (isShiyitu(data) || collection === "luomatoucad") {
    data.info.skipSuanliaodanZoom = true;
  } else {
    delete data.info.skipSuanliaodanZoom;
  }

  data.info.激光开料是否翻转 = !!data.info.激光开料是否翻转;
  if (!Array.isArray(data.info.激光开料标记线)) {
    data.info.激光开料标记线 = [];
  }

  const dataAny = data as ObjectOf<any>;
  for (const key in cadOptions) {
    if (!(key in dataAny)) {
      console.warn("Key error: " + key);
    }
    if (typeof dataAny[key] !== "string") {
      dataAny[key] = "";
    }
    const key2 = key as keyof typeof cadOptions;
    const values = cadOptions[key2].values.map((v) => (typeof v === "string" ? v : v.value));
    if (!values.includes(dataAny[key])) {
      dataAny[key] = cadOptions[key2].defaultValue;
    }
  }

  if (!config.testMode) {
    const layerInfos: ObjectOf<any> = {};
    for (const layer of data.layers) {
      layerInfos[layer.name] = {hidden: layer.hidden};
      layer.hidden = false;
    }
    data.info._layerInfos = layerInfos;
  }

  data.getAllEntities().forEach((e) => {
    if (e.layer === "分页线" || e instanceof CadDimension) {
      e.calcBoundingRect = false;
    }
    e.visible = true;
  });
  return data;
};

export const unsetCadData = (data: CadData) => {
  if (!data.info.激光开料是否翻转) {
    delete data.info.激光开料是否翻转;
  }
  if (data.info.激光开料标记线 && data.info.激光开料标记线.length < 1) {
    delete data.info.激光开料标记线;
  }

  if (data.info._layerInfos) {
    const layerInfos = data.info._layerInfos;
    delete data.info._layerInfos;
    for (const layer of data.layers) {
      const info = layerInfos[layer.name];
      if (info) {
        layer.hidden = info.hidden;
      }
    }
    delete data.info._layerInfos;
  }
};
