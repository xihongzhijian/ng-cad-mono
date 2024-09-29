import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {XhmrmsbjInfoMokuaiNode} from "@views/xhmrmsbj/xhmrmsbj.types";

export const getNodesTable = (nodes: XhmrmsbjInfoMokuaiNode[]) => {
  const info: TableRenderInfo<XhmrmsbjInfoMokuaiNode> = {
    title: "效果图图层排序",
    editMode: true,
    data: nodes,
    columns: [
      {type: "string", field: "层名字", name: "名字"},
      {type: "number", field: "排序", editable: true}
    ]
  };
  return info;
};
