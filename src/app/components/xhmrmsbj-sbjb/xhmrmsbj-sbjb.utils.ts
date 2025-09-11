import {WritableSignal} from "@angular/core";
import {getValueString} from "@app/utils/get-value";
import {getSortedItems} from "@app/utils/sort-items";
import {OptionsAll2} from "@components/lurushuju/services/lrsj-status.types";
import {
  getOptionsAll2InputInfo,
  get双开门扇宽生成方式Inputs,
  show双开门扇宽生成方式,
  show锁扇铰扇蓝线宽固定差值
} from "@components/lurushuju/services/lrsj-status.utils";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf} from "@lucilor/utils";
import {InputInfo, InputInfoOption, InputInfoSelect, InputInfoString} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {ColumnInfo, TableRenderInfo, TableRenderInfoFilterable} from "@modules/table/components/table/table.types";
import {cloneDeep, sample, sampleSize} from "lodash";
import {
  SbjbItemCadKey1,
  SbjbItemCadKey2,
  SbjbItemCadKey3,
  sbjbItemCadKeys1,
  sbjbItemCadKeys2,
  sbjbItemCadKeys3,
  XhmrmsbjSbjbItem,
  XhmrmsbjSbjbItemSbjb,
  XhmrmsbjSbjbItemSbjbCad,
  XhmrmsbjSbjbItemSbjbItem,
  XhmrmsbjSbjbItemSbjbSorted
} from "./xhmrmsbj-sbjb.types";

export const sbjbItemCadKeysObj: ObjectOf<SbjbItemCadKey3[]> = {
  单门: ["锁框", "铰框", "顶框", "锁边", "铰边"],
  子母对开: ["铰框", "顶框", "插销边", "小扇铰边", "锁边", "铰边"],
  双开: ["铰框", "顶框", "插销边", "锁边", "铰边"],
  子母连开: ["铰框", "顶框", "小扇铰边", "插销边", "锁边", "铰边"],
  四扇平分: ["铰框", "顶框", "铰边", "中锁边", "中铰边", "插销边", "锁边"],
  四扇子母: ["铰框", "顶框", "铰边", "中锁边", "中铰边", "插销边", "锁边"],
  六扇平分: ["铰框", "顶框", "铰边", "中锁边", "中铰边", "插销边", "锁边"]
};

export const getSbjbItemCadKeys = (fenlei: string) => {
  return sbjbItemCadKeysObj[fenlei] ?? [];
};
export const getSbjbItemCadKeys1 = (fenlei: string) => {
  const keys: SbjbItemCadKey1[] = [];
  for (const key of getSbjbItemCadKeys(fenlei)) {
    if (isSbjbItemCadKeys1(key)) {
      keys.push(key);
    }
  }
  return keys;
};
export const getSbjbItemCadKeys2 = (fenlei: string) => {
  const keys: SbjbItemCadKey2[] = [];
  for (const key of getSbjbItemCadKeys(fenlei)) {
    if (isSbjbItemCadKeys2(key)) {
      keys.push(key);
    }
  }
  return keys;
};

export const isSbjbItemCadKeys1 = (key: string, keys: SbjbItemCadKey1[] = sbjbItemCadKeys1.slice()): key is SbjbItemCadKey1 => {
  return keys.includes(key as SbjbItemCadKey1);
};
export const isSbjbItemCadKeys2 = (key: string, keys: SbjbItemCadKey2[] = sbjbItemCadKeys2.slice()): key is SbjbItemCadKey2 => {
  return keys.includes(key as SbjbItemCadKey2);
};
export const isSbjbItemOptionalKeys3 = (key: string): key is SbjbItemCadKey3 => {
  return sbjbItemCadKeys3.includes(key as SbjbItemCadKey3);
};

export const getSbjbCadName = (title: SbjbItemCadKey3) => (title === "小扇铰边" ? "铰边" : title);

export const getXhmrmsbjSbjbItemSbjbCad = (title: SbjbItemCadKey3, cadId?: string) => {
  const result: XhmrmsbjSbjbItemSbjbCad = {name: getSbjbCadName(title), title};
  if (cadId) {
    result.cadId = cadId;
  }
  return result;
};

export const convertXhmrmsbjSbjbItem = (formType: string, toType: string, item: XhmrmsbjSbjbItemSbjb) => {
  const result = cloneDeep(item);
  const keysFrom = getSbjbItemCadKeys(formType);
  const keysTo = getSbjbItemCadKeys(toType);
  for (const key of keysFrom) {
    if (!keysTo.includes(key)) {
      delete result[key];
    }
  }
  for (const key of keysTo) {
    if (!keysFrom.includes(key)) {
      if (isSbjbItemCadKeys1(key)) {
        result[key] = "";
      } else if (isSbjbItemCadKeys2(key)) {
        result[key] = getSbjbItemSbjbItem();
      }
    }
  }
  const CAD数据 = result.CAD数据 || [];
  result.CAD数据 = [];
  const usedCadIndexs = new Set<number>();
  for (const key of getSbjbItemCadKeys(toType)) {
    const index = CAD数据.findIndex((v, i) => key === v.title && !usedCadIndexs.has(i));
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
  type T = XhmrmsbjSbjbItemSbjbSorted;
  const cadCols1 = getSbjbItemCadKeys1(fenlei).map((key) => {
    const col: ColumnInfo<T> = {type: "string", field: key, style: {flex: "1 0 100px"}};
    return col;
  });
  const cadCols2 = getSbjbItemCadKeys2(fenlei).map((key) => {
    const col: ColumnInfo<T> = {
      type: "string",
      field: key,
      getString: (val) => val[key]?.名字 || "",
      style: {flex: "1 0 100px"}
    };
    return col;
  });
  const filterableCadKeys: SbjbItemCadKey2[] = ["锁边", "铰边"];
  const filterableFields: TableRenderInfoFilterable<T>["fields"] = ["开启", "门铰", "门扇厚度"];
  for (const key of filterableCadKeys) {
    filterableFields.push({field: key, valueGetter: (item) => item[key]?.名字 || ""});
  }
  const info: TableRenderInfo<T> = {
    data: getSortedItems(data, (v) => v.排序 ?? 0),
    rowSelection: {mode: "multiple", noActive: true},
    filterable: {
      fields: filterableFields
    },
    columns: [
      {type: "string", field: "开启", width: "60px"},
      {type: "string", field: "门铰", width: "80px"},
      {type: "string", field: "门扇厚度", width: "80px"},
      {type: "string", field: "包边方向", width: "80px"},
      {type: "string", field: "条件", style: {flex: "1 0 180px"}},
      ...cadCols1,
      ...cadCols2,
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
          {event: "edit", title: "编辑"},
          {event: "delete", title: "删除"},
          {event: "copy", title: "复制"}
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
  正面宽显示: true,
  背面宽可改: true,
  背面宽显示: true,
  正背面同时改变: true,
  使用正面分体: false,
  使用背面分体: false,
  ...item
});

export const getXhmrmsbjSbjbItemSbjbForm = (options: OptionsAll2, fenlei: string, item?: XhmrmsbjSbjbItemSbjb) => {
  const data = getXhmrmsbjSbjbItemSbjb(cloneDeep(item));
  const getSelectInputInfo = (key: keyof XhmrmsbjSbjbItemSbjb, setter?: (info: InputInfoSelect | InputInfoString) => void) => {
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
  return {form, data};
};
export const getXhmrmsbjSbjbItemSbjbFormResult = async (
  message: MessageService,
  options: OptionsAll2,
  fenlei: string,
  item?: XhmrmsbjSbjbItemSbjb
) => {
  const {form, data} = getXhmrmsbjSbjbItemSbjbForm(options, fenlei, item);
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
export const getXhmrmsbjSbjbItemSbjbItemForm = (cadData: CadData | null | undefined, item?: XhmrmsbjSbjbItemSbjbItem) => {
  const data = getSbjbItemSbjbItem(cloneDeep(item));
  if (typeof data.正面宽可改 !== "boolean") {
    data.正面宽可改 = true;
  }
  if (typeof data.正面宽显示 !== "boolean") {
    data.正面宽显示 = true;
  }
  if (typeof data.背面宽可改 !== "boolean") {
    data.背面宽可改 = true;
  }
  if (typeof data.背面宽显示 !== "boolean") {
    data.背面宽显示 = true;
  }
  if (typeof data.正背面同时改变 !== "boolean") {
    data.正背面同时改变 = true;
  }
  const getter = new InputInfoWithDataGetter(data, {clearable: true});
  const type = cadData?.type || "";
  const form: InputInfo<XhmrmsbjSbjbItemSbjbItem>[] = [
    getInputInfoGroup([getter.string("正面宽", {label: type + "正面宽"}), getter.boolean("正面宽可改"), getter.boolean("正面宽显示")]),
    getInputInfoGroup([getter.string("背面宽", {label: type + "背面宽"}), getter.boolean("背面宽可改"), getter.boolean("背面宽显示")]),
    getter.boolean("正背面同时改变"),
    getter.boolean("使用正面分体"),
    getter.boolean("使用背面分体")
  ];
  return {form, data};
};

export const getXhmrmsbjSbjbItemOptions = (items: XhmrmsbjSbjbItem[]) =>
  items.map<InputInfoOption<XhmrmsbjSbjbItem>>((item) => {
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
    正面宽显示: true,
    背面宽: "",
    背面宽可改: false,
    背面宽显示: true,
    正背面同时改变: false,
    使用正面分体: false,
    使用背面分体: false
  };
  const sbjbItemSbjbItemKeys = keysOf(emptySbjbItemSbjbItem);
  const sbjbItemOptionalKeys1Local = getSbjbItemCadKeys1(fenlei);
  const sbjbItemOptionalKeys2Local = getSbjbItemCadKeys2(fenlei);
  const header = [
    "开启",
    "门铰",
    "门扇厚度",
    "条件",
    "包边方向",
    ...sbjbItemOptionalKeys2Local.map((key) => sbjbItemSbjbItemKeys.map((key2) => key + key2)).flat(),
    ...sbjbItemOptionalKeys1Local,
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
      ...sbjbItemOptionalKeys2Local.map((key) => sbjbItemSbjbItemKeys.map((key2) => item[key]?.[key2])).flat(),
      ...sbjbItemOptionalKeys1Local.map((key) => item[key]),
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
      for (const optionalKeys2 of sbjbItemCadKeys2) {
        if (key.startsWith(optionalKeys2)) {
          key2 = key.slice(optionalKeys2.length) as keyof XhmrmsbjSbjbItemSbjbItem;
          key = optionalKeys2;
          break;
        }
      }
      const sbjbItemOptionalKeys01 = getSbjbItemCadKeys1(fenlei);
      const sbjbItemOptionalKeys02 = getSbjbItemCadKeys2(fenlei);
      if (isSbjbItemCadKeys1(key, sbjbItemOptionalKeys01)) {
        item[key] = value;
      } else if (isSbjbItemCadKeys2(key, sbjbItemOptionalKeys02) && key2) {
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
          case "正面宽显示":
          case "背面宽可改":
          case "背面宽显示":
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
