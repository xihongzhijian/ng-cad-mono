import {Validators} from "@angular/forms";
import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {MenfengpeizhiItem} from "./menfeng-peizhi.types";

export const getMenfengPeizhiTableInfo = (items: MenfengpeizhiItem[]) => {
  const info: TableRenderInfo<MenfengpeizhiItem> = {
    data: items,
    editMode: true,
    rowSelection: {mode: "multiple"},
    filterable: {fields: ["menjiao", "suobian", "chanpinfenlei", "xinghaoyouxian"]},
    columns: [
      {type: "string", field: "menjiao", name: "门铰", width: "150px"},
      {type: "string", field: "suobian", name: "锁边", width: "150px"},
      {type: "string", field: "chanpinfenlei", name: "产品分类", width: "150px"},
      {type: "string", field: "xinghaoyouxian", name: "型号优先", width: "150px", editable: true},
      {type: "number", field: "suobianmenfeng", name: "锁边门缝", width: "100px", editable: true, validators: Validators.required},
      {type: "number", field: "jiaobianmenfeng", name: "铰边门缝", width: "100px", editable: true, validators: Validators.required},
      {type: "number", field: "dingbumenfeng", name: "顶部门缝", width: "100px", editable: true, validators: Validators.required},
      {type: "number", field: "dibumenfeng", name: "底部门缝", width: "100px", editable: true, validators: Validators.required},
      {
        type: "number",
        field: "vid",
        name: "总门缝",
        width: "100px",
        getString: (item) => {
          let n: number;
          const a = item.suobianmenfeng || 0;
          const b = item.jiaobianmenfeng || 0;
          switch (item.chanpinfenlei) {
            case "单门":
              n = a + b;
              break;
            case "子母对开":
            case "双开":
              n = a + b * 2;
              break;
            default:
              n = 0;
          }
          return n.toString();
        }
      }
    ]
  };
  return info;
};

export const getMenfengPeizhiBatchReplaceTableInfo = (item: Partial<MenfengpeizhiItem>) => {
  const info: TableRenderInfo<Partial<MenfengpeizhiItem>> = {
    data: [item],
    editMode: true,
    columns: [
      {type: "number", field: "suobianmenfeng", name: "锁边门缝", editable: true},
      {type: "number", field: "jiaobianmenfeng", name: "铰边门缝", editable: true},
      {type: "number", field: "dingbumenfeng", name: "顶部门缝", editable: true},
      {type: "number", field: "dibumenfeng", name: "底部门缝", editable: true}
    ]
  };
  return info;
};
