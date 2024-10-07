import {Validators} from "@angular/forms";
import {getSortedItems} from "@app/utils/sort-items";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {ColumnInfo, TableRenderInfo} from "@modules/table/components/table/table.types";
import {OptionsService} from "@services/options.service";
import {cloneDeep} from "lodash";
import {
  XhmrmsbjSbjbItemOptionalKey,
  xhmrmsbjSbjbItemOptionalKeys,
  XhmrmsbjSbjbItemSbjb,
  XhmrmsbjSbjbItemSbjbItem,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";

export const getXhmrmsbjSbjbItemOptionalKeys = (fenlei: string): XhmrmsbjSbjbItemOptionalKey[] => {
  switch (fenlei) {
    case "子母对开":
      return ["铰框", "顶框", "插销边", "小扇铰边"];
    case "双开":
      return ["铰框", "顶框", "插销边"];
    default:
      return ["锁框", "铰框", "顶框"];
  }
};

export const getXhmrmsbjSbjbItemTableInfo = (data: XhmrmsbjSbjbItemSbjb[], fenlei: string, activeRowIndex: number) => {
  const optionalKeys = getXhmrmsbjSbjbItemOptionalKeys(fenlei);
  const optionalCols = xhmrmsbjSbjbItemOptionalKeys.map((key) => {
    const col: ColumnInfo<XhmrmsbjSbjbItemSbjbSorted> = {type: "string", field: key};
    if (!optionalKeys.includes(key)) {
      col.hidden = true;
    }
    return col;
  });
  const info: TableRenderInfo<XhmrmsbjSbjbItemSbjbSorted> = {
    data: getSortedItems(data, (v) => v.排序 ?? 0),
    rowSelection: {mode: "single", hideCheckBox: true, selectOnCellClick: true, initialSelected: [activeRowIndex]},
    columns: [
      {type: "string", field: "开启"},
      {type: "string", field: "门铰"},
      {type: "string", field: "门扇厚度"},
      {type: "string", field: "条件"},
      {type: "string", field: "包边方向"},
      {type: "string", field: "锁边", getString: (val) => val.锁边.名字},
      {type: "string", field: "铰边", getString: (val) => val.铰边.名字},
      ...optionalCols,
      {type: "boolean", field: "停用"},
      {type: "number", field: "排序"},
      {type: "boolean", field: "默认值"},
      {
        type: "button",
        field: "CAD数据",
        name: "操作",
        width: "160px",
        stickyEnd: true,
        buttons: [
          {event: "edit", title: "编辑", color: "primary"},
          {event: "delete", title: "删除", color: "primary"},
          {event: "copy", title: "复制", color: "primary"}
        ]
      }
    ]
  };
  return info;
};

export const getXhmrmsbjSbjbItemSbjb = (item?: Partial<XhmrmsbjSbjbItemSbjb>): XhmrmsbjSbjbItemSbjb => ({
  开启: [],
  门铰: [],
  门扇厚度: [],
  条件: "",
  包边方向: "",
  锁边: getXhmrmsbjSbjbItemSbjbItem(item?.锁边),
  铰边: getXhmrmsbjSbjbItemSbjbItem(item?.铰边),
  锁框: "",
  铰框: "",
  顶框: "",
  CAD数据: [],
  ...item
});
export const isXhmrmsbjSbjbItemSbjbHasSuokuang = (fenlei: string) => ["单门", "子母连开"].includes(fenlei);
export const getXhmrmsbjSbjbItemSbjbItem = (item?: Partial<XhmrmsbjSbjbItemSbjbItem>): XhmrmsbjSbjbItemSbjbItem => ({
  名字: "",
  默认正面宽: 0,
  默认背面宽: 0,
  虚拟企料: false,
  使用分体: false,
  ...item
});

export const getXhmrmsbjSbjbItemSbjbForm = async (message: MessageService, options: OptionsService, item?: XhmrmsbjSbjbItemSbjb) => {
  const data = getXhmrmsbjSbjbItemSbjb(cloneDeep(item));
  const getSelectInputInfo = async (key: keyof XhmrmsbjSbjbItemSbjb, multiple: boolean, required?: boolean) => {
    const info: InputInfo<typeof data> = {
      type: "select",
      label: key,
      model: {data, key},
      multiple,
      options: await options.fetchInputInfoOptions({name: key})
    };
    if (required) {
      info.validators = Validators.required;
    }
    return info;
  };
  const form: InputInfo[] = [
    await getSelectInputInfo("开启", true, true),
    await getSelectInputInfo("门铰", true, true),
    await getSelectInputInfo("门扇厚度", true, true),
    {type: "string", label: "条件", model: {data, key: "条件"}},
    await getSelectInputInfo("包边方向", false),
    {type: "boolean", label: "停用", model: {data, key: "停用"}},
    {type: "number", label: "排序", model: {data, key: "排序"}},
    {type: "boolean", label: "默认值", model: {data, key: "默认值"}}
  ];
  const result = await message.form(form);
  return result ? data : null;
};
export const getXhmrmsbjSbjbItemSbjbItemForm = async (message: MessageService, item?: XhmrmsbjSbjbItemSbjbItem) => {
  const data = getXhmrmsbjSbjbItemSbjbItem(cloneDeep(item));
  const form: InputInfo<typeof data>[] = [
    {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
    {type: "number", label: "默认正面宽", model: {data, key: "默认正面宽"}},
    {type: "number", label: "默认背面宽", model: {data, key: "默认背面宽"}},
    {type: "boolean", label: "虚拟企料", model: {data, key: "虚拟企料"}},
    {type: "boolean", label: "使用分体", model: {data, key: "使用分体"}}
  ];
  const result = await message.form(form);
  return result ? data : null;
};
