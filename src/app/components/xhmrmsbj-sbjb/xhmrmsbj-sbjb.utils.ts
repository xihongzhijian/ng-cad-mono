import {WritableSignal} from "@angular/core";
import {getValueString} from "@app/app.common";
import {getSortedItems} from "@app/utils/sort-items";
import {OptionsAll2} from "@components/lurushuju/services/lrsj-status.types";
import {
  getOptionsAll2InputInfo,
  get双开门扇宽生成方式Inputs,
  show双开门扇宽生成方式,
  show锁扇铰扇蓝线宽固定差值
} from "@components/lurushuju/services/lrsj-status.utils";
import {environment} from "@env";
import {keysOf} from "@lucilor/utils";
import {InputInfo, InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {getGroupStyle, getInputStyle, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {ColumnInfo, TableRenderInfo} from "@modules/table/components/table/table.types";
import {cloneDeep, intersection, sample, sampleSize} from "lodash";
import {
  SbjbItemOptionalKey1,
  SbjbItemOptionalKey2,
  SbjbItemOptionalKey3,
  sbjbItemOptionalKeys1,
  sbjbItemOptionalKeys2,
  sbjbItemOptionalKeys3,
  XhmrmsbjSbjbItem,
  XhmrmsbjSbjbItemSbjb,
  XhmrmsbjSbjbItemSbjbCad,
  XhmrmsbjSbjbItemSbjbItem,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";

export const getXhmrmsbjSbjbItemOptionalKeys = (fenlei: string): SbjbItemOptionalKey3[] => {
  switch (fenlei) {
    case "单门":
      return ["锁边", "铰边", "锁框", "铰框", "顶框"];
    case "子母对开":
      return ["锁边", "铰边", "铰框", "顶框", "插销边", "小扇铰边"];
    case "双开":
      return ["锁边", "铰边", "铰框", "顶框", "插销边"];
    default:
      return [];
  }
};
export const getSbjbItemOptionalKeys1 = (fenlei: string) => {
  const keys: SbjbItemOptionalKey1[] = [];
  for (const key of getXhmrmsbjSbjbItemOptionalKeys(fenlei)) {
    if (isSbjbItemOptionalKeys1(key)) {
      keys.push(key);
    }
  }
  return keys;
};
export const getSbjbItemOptionalKeys2 = (fenlei: string) => {
  const keys: SbjbItemOptionalKey2[] = [];
  for (const key of getXhmrmsbjSbjbItemOptionalKeys(fenlei)) {
    if (isSbjbItemOptionalKeys2(key)) {
      keys.push(key);
    }
  }
  return keys;
};

export const getXhmrmsbjSbjbItemCadKeys = (fenlei: string): SbjbItemOptionalKey3[] => {
  switch (fenlei) {
    case "单门":
      return ["铰框", "铰边", "锁边", "锁框", "顶框"];
    case "子母对开":
      return ["铰框", "小扇铰边", "插销边", "锁边", "铰边", "铰框", "顶框"];
    case "双开":
      return ["铰框", "铰边", "插销边", "锁边", "铰边", "铰框", "顶框"];
    default:
      return [];
  }
};

export const isSbjbItemOptionalKeys1 = (
  key: string,
  keys: SbjbItemOptionalKey1[] = sbjbItemOptionalKeys1.slice()
): key is SbjbItemOptionalKey1 => {
  return keys.includes(key as SbjbItemOptionalKey1);
};
export const isSbjbItemOptionalKeys2 = (
  key: string,
  keys: SbjbItemOptionalKey2[] = sbjbItemOptionalKeys2.slice()
): key is SbjbItemOptionalKey2 => {
  return keys.includes(key as SbjbItemOptionalKey2);
};
export const isSbjbItemOptionalKeys3 = (key: string): key is SbjbItemOptionalKey3 => {
  return sbjbItemOptionalKeys3.includes(key as SbjbItemOptionalKey3);
};

export const getXhmrmsbjSbjbItemSbjbCadName = (title: SbjbItemOptionalKey3) => (title === "小扇铰边" ? "铰边" : title);

export const getXhmrmsbjSbjbItemSbjbCad = (title: SbjbItemOptionalKey3, cadId?: string) => {
  const result: XhmrmsbjSbjbItemSbjbCad = {name: getXhmrmsbjSbjbItemSbjbCadName(title), title};
  if (cadId) {
    result.cadId = cadId;
  }
  return result;
};

export const convertXhmrmsbjSbjbItem = (formType: string, toType: string, item: XhmrmsbjSbjbItemSbjb) => {
  const result = cloneDeep(item);
  const keysFrom = getXhmrmsbjSbjbItemOptionalKeys(formType);
  const keysTo = getXhmrmsbjSbjbItemOptionalKeys(toType);
  for (const key of keysFrom) {
    if (!keysTo.includes(key)) {
      delete result[key];
    }
  }
  for (const key of keysTo) {
    if (!keysFrom.includes(key)) {
      if (isSbjbItemOptionalKeys1(key)) {
        result[key] = "";
      } else if (isSbjbItemOptionalKeys2(key)) {
        result[key] = getSbjbItemSbjbItem();
      }
    }
  }
  const CAD数据 = result.CAD数据 || [];
  result.CAD数据 = [];
  const usedCadIndexs = new Set<number>();
  for (const key of getXhmrmsbjSbjbItemCadKeys(toType)) {
    const keys: string[] = [getXhmrmsbjSbjbItemSbjbCadName(key), key];
    const index = CAD数据.findIndex((v, i) => intersection(keys, [v.name, v.title]).length > 0 && !usedCadIndexs.has(i));
    if (index >= 0) {
      usedCadIndexs.add(index);
      CAD数据[index].title = key;
      result.CAD数据.push(CAD数据[index]);
    } else {
      result.CAD数据.push(getXhmrmsbjSbjbItemSbjbCad(key));
    }
  }
  return result;
};

export const getXhmrmsbjSbjbItemTableInfo = (data: XhmrmsbjSbjbItemSbjb[], fenlei: string, activeSbjbItemIndex: WritableSignal<number>) => {
  const optionalKeys = getXhmrmsbjSbjbItemOptionalKeys(fenlei);
  const optionalCols1 = sbjbItemOptionalKeys1.map((key) => {
    const col: ColumnInfo<XhmrmsbjSbjbItemSbjbSorted> = {type: "string", field: key, style: {flex: "1 0 100px"}};
    if (!optionalKeys.includes(key)) {
      col.hidden = true;
    }
    return col;
  });
  const optionalCols2 = sbjbItemOptionalKeys2.map((key) => {
    const col: ColumnInfo<XhmrmsbjSbjbItemSbjbSorted> = {
      type: "string",
      field: key,
      getString: (val) => val[key]?.名字 || "",
      style: {flex: "1 0 100px"}
    };
    if (!optionalKeys.includes(key)) {
      col.hidden = true;
    }
    return col;
  });
  const info: TableRenderInfo<XhmrmsbjSbjbItemSbjbSorted> = {
    data: getSortedItems(data, (v) => v.排序 ?? 0),
    rowSelection: {mode: "multiple", noActive: true},
    filterable: {
      fields: ["开启", "门铰", "门扇厚度", "锁边", "铰边"]
    },
    columns: [
      {type: "string", field: "开启", width: "60px"},
      {type: "string", field: "门铰", width: "80px"},
      {type: "string", field: "门扇厚度", width: "80px"},
      {type: "string", field: "包边方向", width: "80px"},
      {type: "string", field: "条件", width: "80px"},
      ...optionalCols2,
      ...optionalCols1,
      {type: "string", field: "双开门扇宽生成方式", hidden: !show双开门扇宽生成方式(fenlei), width: "110px"},
      {
        type: "number",
        field: "锁扇铰扇蓝线宽固定差值",
        hidden: !data.some((v) => show锁扇铰扇蓝线宽固定差值(fenlei, v.双开门扇宽生成方式)),
        width: "110px"
      },
      {type: "boolean", field: "停用", width: "60px"},
      {type: "number", field: "排序", width: "60px"},
      {type: "boolean", field: "默认值", width: "70px"},
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
    ],
    getCellClass: ({item}) => (item.originalIndex === activeSbjbItemIndex() ? "active" : "")
  };
  return info;
};

export const getXhmrmsbjSbjbItemSbjb = (item?: Partial<XhmrmsbjSbjbItemSbjb>) => {
  const result: XhmrmsbjSbjbItemSbjb = {
    开启: "",
    门铰: [],
    门扇厚度: [],
    条件: "",
    包边方向: "",
    CAD数据: [],
    ...item
  };
  return result;
};
export const isXhmrmsbjSbjbItemSbjbHasSuokuang = (fenlei: string) => ["单门", "子母连开"].includes(fenlei);
export const getSbjbItemSbjbItem = (item?: Partial<XhmrmsbjSbjbItemSbjbItem>): XhmrmsbjSbjbItemSbjbItem => ({
  名字: "",
  正面宽可改: true,
  背面宽可改: true,
  正背面同时改变: true,
  使用正面分体: false,
  使用背面分体: false,
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
    ...get双开门扇宽生成方式Inputs(fenlei, options, data),
    {type: "string", label: "条件", model: {data, key: "条件"}},
    getSelectInputInfo("包边方向"),
    {type: "boolean", label: "停用", model: {data, key: "停用"}},
    {type: "number", label: "排序", model: {data, key: "排序"}},
    {type: "boolean", label: "默认值", model: {data, key: "默认值"}}
  ];
  const result = await message.form(form, {
    autoFill: environment.production
      ? undefined
      : () => {
          const rand = (key: keyof XhmrmsbjSbjbItemSbjb) => sample(options[key].options)?.name || "";
          const rand2 = (key: keyof XhmrmsbjSbjbItemSbjb) => sampleSize(options[key].options).map((v) => v.name);
          data.开启 = rand("开启");
          data.门铰 = rand2("门铰");
          data.门扇厚度 = rand2("门扇厚度");
        }
  });
  return result ? data : null;
};
export const getXhmrmsbjSbjbItemSbjbItemForm = async (item?: XhmrmsbjSbjbItemSbjbItem) => {
  const data = getSbjbItemSbjbItem(cloneDeep(item));
  if (typeof data.正面宽可改 !== "boolean") {
    data.正面宽可改 = true;
  }
  if (typeof data.背面宽可改 !== "boolean") {
    data.背面宽可改 = true;
  }
  if (typeof data.正背面同时改变 !== "boolean") {
    data.正背面同时改变 = true;
  }
  const getter = new InputInfoWithDataGetter(data, {clearable: true});
  const form: InputInfo<XhmrmsbjSbjbItemSbjbItem>[] = [
    {
      type: "group",
      label: "",
      groupStyle: getGroupStyle(),
      infos: [getter.string("正面宽", {style: getInputStyle(true)}), getter.boolean("正面宽可改", {style: getInputStyle(true)})]
    },
    {
      type: "group",
      label: "",
      groupStyle: getGroupStyle(),
      infos: [getter.string("背面宽", {style: getInputStyle(true)}), getter.boolean("背面宽可改", {style: getInputStyle(true)})]
    },
    getter.boolean("正背面同时改变"),
    getter.boolean("使用正面分体"),
    getter.boolean("使用背面分体")
  ];
  return {form, data};
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

export const exportXhmrmsbjSbjbItemSbjbs = (fenlei: string, items: XhmrmsbjSbjbItemSbjb[]) => {
  const show双开门扇宽生成方式Val = show双开门扇宽生成方式(fenlei);
  const emptySbjbItemSbjbItem: Required<XhmrmsbjSbjbItemSbjbItem> = {
    名字: "",
    正面宽: "",
    正面宽可改: false,
    背面宽: "",
    背面宽可改: false,
    正背面同时改变: false,
    使用正面分体: false,
    使用背面分体: false
  };
  const sbjbItemSbjbItemKeys = keysOf(emptySbjbItemSbjbItem);
  const sbjbItemOptionalKeys1 = getSbjbItemOptionalKeys1(fenlei);
  const sbjbItemOptionalKeys2 = getSbjbItemOptionalKeys2(fenlei);
  const header = [
    "开启",
    "门铰",
    "门扇厚度",
    "条件",
    "包边方向",
    ...sbjbItemOptionalKeys2.map((key) => sbjbItemSbjbItemKeys.map((key2) => key + key2)).flat(),
    ...sbjbItemOptionalKeys1,
    ...(show双开门扇宽生成方式Val ? ["双开门扇宽生成方式", "锁扇铰扇蓝线宽固定差值"] : []),
    "停用",
    "排序",
    "默认值"
  ];
  const rows: string[][] = [];
  for (const item of getSortedItems(items, (v) => v.排序 ?? 0)) {
    const row = [
      item.开启,
      item.门铰,
      item.门扇厚度,
      item.条件,
      item.包边方向,
      ...sbjbItemOptionalKeys2.map((key) => sbjbItemSbjbItemKeys.map((key2) => item[key]?.[key2])).flat(),
      ...sbjbItemOptionalKeys1.map((key) => item[key]),
      ...(show双开门扇宽生成方式Val ? [item.双开门扇宽生成方式, item.锁扇铰扇蓝线宽固定差值] : []),
      item.停用,
      item.排序,
      item.默认值
    ];
    rows.push(row.map((v) => getValueString(v)));
  }
  return [header, ...rows];
};
export const importXhmrmsbjSbjbItemSbjbs = (fenlei: string, dataArray: string[][]) => {
  const header = dataArray[0];
  const rows = dataArray.slice(1);
  const items: XhmrmsbjSbjbItemSbjb[] = [];
  for (const row of rows) {
    const item = getXhmrmsbjSbjbItemSbjb();
    items.push(item);
    for (const [i, value] of row.entries()) {
      let key = header[i];
      if (!key || !value) {
        continue;
      }
      let key2: keyof XhmrmsbjSbjbItemSbjbItem | null = null;
      for (const optionalKeys2 of sbjbItemOptionalKeys2) {
        if (key.startsWith(optionalKeys2)) {
          key2 = key.slice(optionalKeys2.length) as keyof XhmrmsbjSbjbItemSbjbItem;
          key = optionalKeys2;
          break;
        }
      }
      const sbjbItemOptionalKeys01 = getSbjbItemOptionalKeys1(fenlei);
      const sbjbItemOptionalKeys02 = getSbjbItemOptionalKeys2(fenlei);
      if (isSbjbItemOptionalKeys1(key, sbjbItemOptionalKeys01)) {
        item[key] = value;
      } else if (isSbjbItemOptionalKeys2(key, sbjbItemOptionalKeys02) && key2) {
        let item2 = item[key];
        if (!item2) {
          item2 = getSbjbItemSbjbItem();
          item[key] = item2;
        }
        switch (key2) {
          case "名字":
          case "正面宽":
          case "背面宽":
            item2[key2] = value;
            break;
          case "正面宽可改":
          case "背面宽可改":
          case "正背面同时改变":
          case "使用正面分体":
          case "使用背面分体":
            item2[key2] = value === "是";
            break;
          default:
            console.error("unknown XhmrmsbjSbjbItemSbjbItem key", key2);
        }
      } else {
        switch (key) {
          case "开启":
          case "条件":
          case "包边方向":
          case "双开门扇宽生成方式":
            item[key] = value;
            break;
          case "门铰":
          case "门扇厚度":
            item[key] = value.split(",").map((v) => v.trim());
            break;
          case "锁扇铰扇蓝线宽固定差值":
          case "排序":
            item[key] = parseFloat(value);
            break;
          case "停用":
          case "默认值":
            item[key] = value === "是";
            break;
          default:
            console.error("unknown XhmrmsbjSbjbItem key", key);
        }
      }
    }
  }
  return items;
};
