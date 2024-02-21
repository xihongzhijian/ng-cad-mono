import {environment} from "@env";
import {ObjectOf} from "@lucilor/utils";
import {OptionsDataData} from "@modules/http/services/cad-data.service.types";
import {InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {ColumnInfo, TableRenderInfo} from "@modules/table/components/table/table.types";
import {算料数据} from "../xinghao-data";
import {MenjiaoData, OptionsAll, OptionsAll2, ShuruTableData, XuanxiangTableData} from "./lurushuju-index.types";

export const getXuanxiangTable = (): TableRenderInfo<XuanxiangTableData> => {
  return {
    title: "选项数据",
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字"},
      {
        type: "string",
        field: "可选项",
        getString: (item) => {
          return item.可选项.map((v) => v.mingzi).join("*");
        }
      },
      {
        type: "button",
        field: "操作",
        buttons: [
          {event: "编辑", color: "primary"},
          {event: "清空数据", color: "primary"}
        ]
      }
    ],
    data: [],
    toolbarButtons: {extra: [{event: "添加", color: "primary"}], inlineTitle: true}
  };
};

export const getShuruTable = (): TableRenderInfo<ShuruTableData> => {
  return {
    title: "输入数据",
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字"},
      {type: "string", field: "默认值"},
      {type: "string", field: "取值范围"},
      {type: "boolean", field: "可以修改"},
      {
        type: "button",
        field: "操作",
        buttons: [
          {event: "编辑", color: "primary"},
          {event: "删除", color: "primary"}
        ]
      }
    ],
    data: [],
    toolbarButtons: {extra: [{event: "添加", color: "primary"}], inlineTitle: true}
  };
};

export const getMenjiaoTable = () => {
  const btnsCol: ColumnInfo<MenjiaoData> = {
    type: "button",
    field: "操作",
    width: "190px",
    buttons: [
      {event: "编辑", color: "primary"},
      {event: "复制", color: "primary"},
      {event: "删除", color: "primary"}
    ]
  };
  const reuslt: TableRenderInfo<MenjiaoData> = {
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字", width: "180px"},
      {type: "string", field: "产品分类", width: "100px"},
      {type: "string", field: "开启", width: "100px"},
      {type: "string", field: "门铰", width: "100px"},
      {type: "string", field: "门扇厚度", width: "80px"},
      {type: "string", field: "锁边", width: "120px"},
      {type: "string", field: "铰边", width: "120px"},
      {
        type: "string",
        field: "门缝配置",
        width: "250px",
        getString: (value) => {
          const data = value.门缝配置;
          if (!data) {
            return "";
          }
          const map: ObjectOf<string> = {
            锁边门缝: "锁边",
            铰边门缝: "铰边",
            顶部门缝: "上",
            底部门缝: "下"
          };
          const strs = Object.entries(data)
            .map(([k, v]) => {
              if (k.includes("内间隙") && v === 0) {
                return "";
              }
              return `${map[k] || k}${v}`;
            })
            .filter((v) => v);
          return strs.join(", ");
        }
      },
      {type: "boolean", field: "停用", width: "60px"},
      {type: "number", field: "排序", width: "60px"},
      {type: "boolean", field: "默认值", width: "60px"}
    ],
    data: [],
    toolbarButtons: {
      extra: [
        {event: "添加", color: "primary"},
        {event: "从其它做法选择", color: "primary"}
      ],
      inlineTitle: true
    }
  };
  if (environment.production) {
    reuslt.columns.push(btnsCol);
  } else {
    reuslt.columns.splice(1, 0, btnsCol);
  }
  return reuslt;
};

export const getOptions = (optionsAll: OptionsAll | undefined | null, key: string, setter?: (option: InputInfoOption) => void) => {
  const options = optionsAll?.[key];
  if (!options) {
    return [];
  }
  return options.map(({name}) => {
    const option: InputInfoOption = {value: name};
    if (typeof setter === "function") {
      setter(option);
    }
    return option;
  });
};

export const getOptions2 = (options: OptionsDataData[]) => {
  return options.map<InputInfoOption>((v) => {
    return {value: v.name, img: v.img};
  });
};

export const getOptionInputInfo = (
  optionsAll: OptionsAll2 | undefined | null,
  key: keyof 算料数据,
  setter?: (info: InputInfoSelect) => void
): InputInfoSelect => {
  const optionsInfo = optionsAll?.[key];
  if (!optionsInfo) {
    return {type: "select", label: key, options: []};
  }
  const {disabled, multiple} = optionsInfo;
  const info: InputInfoSelect = {
    type: "select",
    label: key,
    options: getOptions2(optionsInfo.options),
    disabled,
    multiple
  };
  if (typeof setter === "function") {
    setter(info);
  }

  return info;
};
