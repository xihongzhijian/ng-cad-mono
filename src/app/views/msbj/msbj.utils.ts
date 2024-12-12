import {ZuoshujuData} from "@app/utils/table-data/zuoshuju-data";
import mokuaidaixiaoData from "@assets/json/mokuaidaxiao.json";
import {MsbjPeizhishuju, MsbjRectInfoRaw, 模块大小配置} from "@components/msbj-rects/msbj-rects.types";
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
      justify模块大小配置(peizhishuju.模块大小配置, nodeNames);
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

export const justify模块大小配置 = (mkdxpz: 模块大小配置, nodeNames: string[]) => {
  const formulas = mkdxpz.算料公式;
  mkdxpz.算料公式 = {};
  nodeNames.sort();
  for (const name of getNodeFormulasKeys(nodeNames)) {
    mkdxpz.算料公式[name] = formulas[name] || "";
  }
};
