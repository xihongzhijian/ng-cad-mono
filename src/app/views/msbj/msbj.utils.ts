import {Formulas} from "@app/utils/calc";
import {ResultWithErrors} from "@app/utils/error-message";
import {matchMongoData} from "@app/utils/mongo";
import {ZuoshujuData} from "@app/utils/table-data/zuoshuju-data";
import mokuaidaixiaoData from "@assets/json/mokuaidaxiao.json";
import {算料公式} from "@components/lurushuju/xinghao-data";
import {MsbjPeizhishuju, MsbjRectInfoRaw, 模块大小配置} from "@components/msbj-rects/msbj-rects.types";
import {isTypeOf} from "@lucilor/utils";
import {v4} from "uuid";
import {MsbjData, Node2rectData} from "./msbj.types";

export class MsbjInfo extends ZuoshujuData<MsbjData> {
  xiaoguotu?: string;
  peizhishuju: MsbjPeizhishuju;

  constructor(
    public raw: MsbjData,
    node2rectData?: Node2rectData
  ) {
    super(raw);
    this.xiaoguotu = raw.xiaoguotu;

    const peizhishuju = this.parseField<MsbjPeizhishuju>("peizhishuju", {模块节点: []});
    this.peizhishuju = peizhishuju;
    this.updateRectsInfo(node2rectData);
    if (!peizhishuju.模块大小关系) {
      peizhishuju.模块大小关系 = mokuaidaixiaoData;
    }
  }

  updateRectsInfo(data?: Node2rectData) {
    const peizhishuju = this.peizhishuju;
    const namesMap = new Map<number, string>();
    for (const node of peizhishuju.模块节点) {
      if (!node.选项名称) {
        continue;
      }
      namesMap.set(node.vid, node.选项名称);
    }
    let rectInfos1: MsbjRectInfoRaw[] | null = null;
    try {
      rectInfos1 = window.node2rect(JSON.parse(this.raw.node || ""), data);
    } catch {}
    if (rectInfos1) {
      for (const info of rectInfos1) {
        const name = namesMap.get(info.vid);
        if (name) {
          info.选项名称 = name;
        }
      }
    } else {
      rectInfos1 = [];
    }
    peizhishuju.模块节点 = rectInfos1;
  }

  justify() {
    const peizhishuju = this.peizhishuju;
    if (this.isVersion2024) {
      if (!peizhishuju.模块大小配置) {
        peizhishuju.模块大小配置 = getEmpty模块大小配置();
      }
      const nodeNames = peizhishuju.模块节点.filter((v) => v.isBuju && v.name).map((v) => v.name as string);
      justifyMkdxpz(peizhishuju.模块大小配置, nodeNames);
    }
  }
}

export const getEmpty模块大小配置 = (): 模块大小配置 => {
  return {算料公式: {}, 输入显示: []};
};

export const nodeFormulasKeysRaw = ["总宽", "总高"] as const;
export type NodeFormulasKeyRaw = (typeof nodeFormulasKeysRaw)[number];

export const getNodeFormulasKey = (nodeName: string, key: NodeFormulasKeyRaw) => `${nodeName}${key}`;
export const getNodeFormulasKeys = (nodeNames: string[]) => {
  const names: string[] = [];
  for (const name of nodeNames) {
    names.push(...nodeFormulasKeysRaw.map((v) => getNodeFormulasKey(name, v)));
  }
  return names;
};

/* eslint-disable @typescript-eslint/no-deprecated */
export const justifyMkdxpzSlgs = (slgs: 算料公式, nodeNames: string[]) => {
  const formulas = slgs.公式;
  slgs.公式 = {};
  nodeNames.sort();
  for (const name of getNodeFormulasKeys(nodeNames)) {
    slgs.公式[name] = formulas[name] || "";
  }
};
export const justifyMkdxpz = (dxpz: 模块大小配置, nodeNames: string[]) => {
  const getSlgs = (公式: Formulas) => ({_id: v4(), 名字: "默认公式", 条件: [], 选项: {}, 公式});
  if (!Array.isArray(dxpz.算料公式2)) {
    dxpz.算料公式2 = [];
  }
  if (dxpz.算料公式 && isTypeOf(dxpz.算料公式, "object")) {
    dxpz.算料公式2.push(getSlgs(dxpz.算料公式));
  } else if (dxpz.算料公式2.length < 1) {
    dxpz.算料公式2.push(getSlgs({}));
  }
  delete dxpz.算料公式;
  for (const slgs of dxpz.算料公式2) {
    justifyMkdxpzSlgs(slgs, nodeNames);
  }
};
export const getMkdxpzSlgs = (mkdxpz: 模块大小配置 | null | undefined, materialResult: Formulas) => {
  const result = new ResultWithErrors<算料公式 | null>(null);
  if (!mkdxpz) {
    return result;
  }
  if (Array.isArray(mkdxpz.算料公式2)) {
    const slgsList = matchMongoData(mkdxpz.算料公式2, materialResult);
    if (slgsList.length > 1) {
      result.addErrorStr("匹配到多个算料公式");
    } else if (slgsList.length > 0) {
      result.data = slgsList[0];
    }
  }
  return result;
};
export const getMkdxpzSlgsFormulas = (mkdxpz: 模块大小配置 | null | undefined, materialResult: Formulas) => {
  const result = new ResultWithErrors<Formulas>(mkdxpz?.算料公式 ?? {});
  const result2 = getMkdxpzSlgs(mkdxpz, materialResult);
  if (!result2.fulfilled) {
    return result.learnFrom(result2);
  }
  if (result2.data) {
    result.data = result2.data.公式;
  }
  return result;
};
export const getMkdxpzSlgsFormulasList = (mkdxpz: 模块大小配置 | null | undefined) => {
  const list: Formulas[] = [];
  if (!mkdxpz) {
    return list;
  }
  if (mkdxpz.算料公式) {
    list.push(mkdxpz.算料公式);
  }
  if (Array.isArray(mkdxpz.算料公式2)) {
    for (const slgs of mkdxpz.算料公式2) {
      list.push(slgs.公式);
    }
  }
  return list;
};
/* eslint-enable @typescript-eslint/no-deprecated */
