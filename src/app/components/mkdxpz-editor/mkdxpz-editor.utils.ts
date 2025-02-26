import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {XhmrmsbjInfoMokuaiNode} from "@views/xhmrmsbj/xhmrmsbj.types";

export const getNodesTable = (nodes: XhmrmsbjInfoMokuaiNode[]) => {
  const info: TableRenderInfo<XhmrmsbjInfoMokuaiNode> = {
    title: "模块效果图图层排序（排序小的在下面）",
    editMode: true,
    data: nodes,
    columns: [
      {type: "string", field: "层名字", name: "名字"},
      {type: "number", field: "排序", editable: true}
    ]
  };
  return info;
};

export const getVarNameGroupName = (menshanKey: string, nodeName: string) => `${menshanKey}${nodeName}可选模块`;
