import {Validators} from "@angular/forms";
import {getSortedItems} from "@app/utils/sort-items";
import {OptionsAll2} from "@components/lurushuju/services/lrsj-status.types";
import {getOptionsAll2InputInfo} from "@components/lurushuju/services/lrsj-status.utils";
import {InputInfo, InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {ColumnInfo, TableRenderInfo} from "@modules/table/components/table/table.types";
import {cloneDeep} from "lodash";
import {
  XhmrmsbjSbjbItem,
  XhmrmsbjSbjbItemOptionalKey1,
  XhmrmsbjSbjbItemOptionalKey2,
  XhmrmsbjSbjbItemOptionalKey3,
  xhmrmsbjSbjbItemOptionalKeys1,
  xhmrmsbjSbjbItemOptionalKeys2,
  xhmrmsbjSbjbItemOptionalKeys3,
  XhmrmsbjSbjbItemSbjb,
  XhmrmsbjSbjbItemSbjbItem,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";

export const getXhmrmsbjSbjbItemOptionalKeys = (fenlei: string): XhmrmsbjSbjbItemOptionalKey3[] => {
  switch (fenlei) {
    case "子母对开":
      return ["锁边", "铰边", "铰框", "顶框", "插销边", "小扇铰边"];
    case "双开":
      return ["锁边", "铰边", "铰框", "顶框", "插销边"];
    default:
      return ["锁边", "铰边", "锁框", "铰框", "顶框"];
  }
};

export const isXhmrmsbjSbjbItemOptionalKeys1 = (key: string): key is XhmrmsbjSbjbItemOptionalKey1 => {
  return xhmrmsbjSbjbItemOptionalKeys1.includes(key as XhmrmsbjSbjbItemOptionalKey1);
};
export const isXhmrmsbjSbjbItemOptionalKeys2 = (key: string): key is XhmrmsbjSbjbItemOptionalKey2 => {
  return xhmrmsbjSbjbItemOptionalKeys2.includes(key as XhmrmsbjSbjbItemOptionalKey2);
};
export const isXhmrmsbjSbjbItemOptionalKeys3 = (key: string): key is XhmrmsbjSbjbItemOptionalKey3 => {
  return xhmrmsbjSbjbItemOptionalKeys3.includes(key as XhmrmsbjSbjbItemOptionalKey3);
};

export const getXhmrmsbjSbjbItemTableInfo = (data: XhmrmsbjSbjbItemSbjb[], fenlei: string, activeRowIndex: number) => {
  const optionalKeys = getXhmrmsbjSbjbItemOptionalKeys(fenlei);
  const optionalCols1 = xhmrmsbjSbjbItemOptionalKeys1.map((key) => {
    const col: ColumnInfo<XhmrmsbjSbjbItemSbjbSorted> = {type: "string", field: key};
    if (!optionalKeys.includes(key)) {
      col.hidden = true;
    }
    return col;
  });
  const optionalCols2 = xhmrmsbjSbjbItemOptionalKeys2.map((key) => {
    const col: ColumnInfo<XhmrmsbjSbjbItemSbjbSorted> = {type: "string", field: key, getString: (val) => val[key]?.名字 || ""};
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
      {type: "string", field: "包边方向"},
      {type: "string", field: "条件"},
      ...optionalCols2,
      ...optionalCols1,
      {type: "string", field: "限定可选锁体"},
      {type: "string", field: "双开门扇宽生成方式", hidden: fenlei !== "双开"},
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

export const getXhmrmsbjSbjbItemSbjb = (item?: Partial<XhmrmsbjSbjbItemSbjb>) => {
  const result: XhmrmsbjSbjbItemSbjb = {
    开启: "",
    门铰: [],
    门扇厚度: [],
    限定可选锁体: [],
    条件: "",
    包边方向: "",
    CAD数据: [],
    ...item
  };
  return result;
};
export const isXhmrmsbjSbjbItemSbjbHasSuokuang = (fenlei: string) => ["单门", "子母连开"].includes(fenlei);
export const getXhmrmsbjSbjbItemSbjbItem = (item?: Partial<XhmrmsbjSbjbItemSbjbItem>): XhmrmsbjSbjbItemSbjbItem => ({
  名字: "",
  默认正面宽: 0,
  默认背面宽: 0,
  虚拟企料: false,
  使用分体: false,
  ...item
});

export const getXhmrmsbjSbjbItemSbjbForm = async (
  message: MessageService,
  options: OptionsAll2,
  fenlei: string,
  item?: XhmrmsbjSbjbItemSbjb
) => {
  const data = getXhmrmsbjSbjbItemSbjb(cloneDeep(item));
  const getSelectInputInfo = (key: keyof XhmrmsbjSbjbItemSbjb, setter?: (info: InputInfoSelect) => void) => {
    const info = getOptionsAll2InputInfo(options, key, setter);
    info.model = {data, key};
    return info;
  };
  const form: InputInfo[] = [
    getSelectInputInfo("开启"),
    getSelectInputInfo("门铰"),
    getSelectInputInfo("门扇厚度"),
    getSelectInputInfo("限定可选锁体"),
    getSelectInputInfo("双开门扇宽生成方式", (info) => (info.hidden = fenlei !== "双开")),
    {type: "string", label: "条件", model: {data, key: "条件"}},
    getSelectInputInfo("包边方向"),
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

export const getXhmrmsbjSbjbItemOptions = (items: XhmrmsbjSbjbItem[]) =>
  items.map<InputInfoOption>((item) => {
    let label = item.产品分类;
    let disabled = false;
    if (!item.锁边铰边数据 || item.锁边铰边数据.length < 1) {
      label += "（没有数据）";
      disabled = true;
    }
    return {label, value: item, disabled};
  });
