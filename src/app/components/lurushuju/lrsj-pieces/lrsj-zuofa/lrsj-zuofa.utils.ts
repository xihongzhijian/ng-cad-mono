import {Validators} from "@angular/forms";
import {getArrayString} from "@app/app.common";
import {OptionsAll} from "@components/lurushuju/services/lrsj-status.types";
import {输入, 输入下单用途, 选项} from "@components/lurushuju/xinghao-data";
import {ObjectOf} from "@lucilor/utils";
import {InputInfo, InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {MenjiaoData, ShuruTableData, XuanxiangTableData} from "./lrsj-zuofa.types";

export const getXuanxiangTable = (data: XuanxiangTableData[]): TableRenderInfo<XuanxiangTableData> => {
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
    data,
    toolbarButtons: {extra: [], inlineTitle: true}
  };
};
export const getXuanxiangItem = async (message: MessageService, options: OptionsAll, list: 选项[], data0?: 选项) => {
  const data: 选项 = {名字: "", 可选项: [], ...data0};
  const names = list.map((v) => v.名字);
  const form: InputInfo<typeof data>[] = [
    {
      type: "select",
      label: "名字",
      model: {data, key: "名字"},
      disabled: !!data0,
      options: Object.keys(options).map<InputInfoOption>((v) => {
        return {value: v, disabled: names.includes(v)};
      }),
      validators: Validators.required,
      onChange: () => {
        const info = form[1] as InputInfoSelect;
        if (Array.isArray(info.value)) {
          info.value.length = 0;
        }
        if (info.optionsDialog) {
          info.optionsDialog.optionKey = data.名字;
        }
      }
    },
    {
      type: "select",
      label: "可选项",
      value: data.可选项.map((v) => v.mingzi),
      options: [],
      multiple: true,
      validators: Validators.required,
      optionsDialog: {
        optionKey: data.名字,
        openInNewTab: true,
        defaultValue: {value: data.可选项.find((v) => v.morenzhi)?.mingzi, required: true},
        onChange: (val) => {
          data.可选项 = val.options.map((v) => {
            const item: 选项["可选项"][number] = {...v};
            if (item.mingzi === val.defaultValue) {
              item.morenzhi = true;
            }
            return item;
          });
        }
      }
    }
  ];
  const result = await message.form(form);
  return result ? data : null;
};

export const getShuruTable = (data: ShuruTableData[]): TableRenderInfo<ShuruTableData> => {
  return {
    title: "输入显示",
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字"},
      {type: "string", field: "下单用途", getString: (value) => `${value.下单用途 || ""}<br><br>${value.可以修改 ? "可改" : "不可改"}`},
      {type: "string", field: "默认值"},
      {type: "string", field: "取值范围"},
      {type: "string", field: "生效条件"},
      {
        type: "button",
        field: "操作",
        buttons: [
          {event: "编辑", color: "primary"},
          {event: "删除", color: "primary"}
        ]
      }
    ],
    data,
    toolbarButtons: {extra: [{event: "添加", color: "primary"}], inlineTitle: true}
  };
};
export const getShuruItem = async (message: MessageService, list: 输入[], data0?: 输入) => {
  const data: 输入 = {名字: "", 默认值: "", 取值范围: "", 可以修改: true, ...data0};
  if (!输入下单用途.includes(data.下单用途 as any)) {
    data.下单用途 = "输入";
  }
  const form: InputInfo<typeof data>[] = [
    {
      type: "string",
      label: "名字",
      model: {data, key: "名字"},
      validators: [
        Validators.required,
        (control) => {
          const value = control.value;
          if ((!data0 || data0.名字 !== value) && list.some((v) => v.名字 === value)) {
            return {名字已存在: true};
          }
          return null;
        }
      ]
    },
    {type: "select", label: "下单用途", model: {data, key: "下单用途"}, options: 输入下单用途.slice()},
    {type: "boolean", label: "可以修改", model: {data, key: "可以修改"}},
    {
      type: "string",
      label: "默认值",
      model: {data, key: "默认值"},
      validators: Validators.required
    },
    {
      type: "string",
      label: "取值范围",
      model: {data, key: "取值范围"},
      validators: [
        Validators.required,
        (control) => {
          const value = control.value;
          if (!/^\d+(.\d+)?-\d+(.\d+)?$/.test(value)) {
            return {取值范围不符合格式: true};
          }
          return null;
        }
      ]
    },
    {type: "string", label: "生效条件", model: {data, key: "生效条件"}},
    {type: "number", label: "排序", model: {data, key: "排序"}}
  ];
  return await message.form<typeof data, typeof data>(form);
};

export const getMenjiaoTable = (data: MenjiaoData[]): TableRenderInfo<MenjiaoData> => {
  return {
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字", width: "180px", name: "门铰锁边铰边"},
      {type: "string", field: "开启", width: "100px"},
      {type: "string", field: "门铰", width: "100px", getString: (value) => getArrayString(value.门铰, "，")},
      {type: "string", field: "门扇厚度", width: "80px", getString: (value) => getArrayString(value.门扇厚度, "，")},
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
          return strs.join("，");
        }
      },
      {type: "boolean", field: "停用", width: "60px"},
      {type: "number", field: "排序", width: "60px"},
      {type: "boolean", field: "默认值", width: "60px"},
      {
        type: "button",
        field: "操作",
        width: "150px",
        stickyEnd: true,
        buttons: [
          {event: "编辑", color: "primary"},
          {event: "编辑排序", color: "primary"},
          {event: "复制", color: "primary"},
          {event: "删除", color: "primary"}
        ]
      }
    ],
    data,
    toolbarButtons: {
      extra: [
        {event: "添加", color: "primary"},
        {event: "从其他做法选择", title: "从其他做法选择门铰锁边铰边", color: "primary"}
      ],
      inlineTitle: true
    }
  };
};
