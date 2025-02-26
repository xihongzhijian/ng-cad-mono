import {Validators} from "@angular/forms";
import {Calc} from "@app/utils/calc";
import {getArrayString} from "@app/utils/get-value";
import {CustomValidators} from "@app/utils/input-validators";
import {getSortedItems} from "@app/utils/sort-items";
import {OptionsAll} from "@components/lurushuju/services/lrsj-status.types";
import {输入, 选项} from "@components/lurushuju/xinghao-data";
import {environment} from "@env";
import {ObjectOf} from "@lucilor/utils";
import {InputInfo, InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {convertOptions, getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {MenjiaoData, ShuruTableData, ShuruTableDataSorted, XuanxiangTableData} from "./lrsj-zuofa.types";

export const getXuanxiangTable = (
  data: XuanxiangTableData[],
  others?: Partial<TableRenderInfo<XuanxiangTableData>>,
  opts?: {use输出变量?: boolean; use条件?: boolean}
): TableRenderInfo<XuanxiangTableData> => {
  const {use输出变量, use条件} = opts ?? {};
  return {
    title: "选项数据",
    inlineTitle: true,
    columns: [
      {type: "string", field: "名字", style: {flex: "1 1 130px"}},
      {
        type: "string",
        field: "可选项",
        style: {flex: "1 1 200px"},
        getString: (item) => {
          return item.可选项.map((v) => v.mingzi).join(";");
        }
      },
      {type: "boolean", field: "输出变量", style: {flex: "1 1 80px"}, hidden: !use输出变量},
      {type: "string", field: "条件", style: {flex: "1 1 200px"}, hidden: !use条件},
      {
        type: "button",
        field: "操作",
        style: {flex: "1 1 150px"},
        buttons: [{event: "编辑"}, {event: "清空数据"}]
      }
    ],
    data,
    toolbarButtons: {extra: []},
    ...others
  };
};
export const getXuanxiangItem = async (
  message: MessageService,
  options: OptionsAll,
  list: 选项[],
  data0?: 选项,
  opts?: {use输出变量?: boolean; use条件?: boolean}
) => {
  const data: 选项 = {名字: "", 可选项: [], ...data0};
  const names = list.map((v) => v.名字);
  const {use输出变量, use条件} = opts ?? {};
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
        if (info.type === "select") {
          info.options = convertOptions(options[data.名字]);
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
    },
    {
      type: "string",
      label: "条件",
      model: {data, key: "条件"},
      hidden: !use条件,
      validators: (control) => {
        const result = Calc.validateExpression(control.value);
        return result.valid ? null : {语法错误: true};
      }
    },
    {type: "boolean", label: "输出变量", model: {data, key: "输出变量"}, hidden: !use输出变量}
  ];
  const result = await message.form(form);
  return result ? data : null;
};
export const emptyXuanxiangItem = async (message: MessageService, item: 选项) => {
  if (!(await message.confirm(`确定清空【${item.名字}】的数据吗？`))) {
    return false;
  }
  item.可选项 = [];
  return true;
};

export const getShuruTable = (
  data: ShuruTableData[],
  others?: Partial<TableRenderInfo<ShuruTableDataSorted>>
): TableRenderInfo<ShuruTableDataSorted> => {
  return {
    title: "输入显示",
    inlineTitle: true,
    columns: [
      {type: "string", field: "名字"},
      {
        type: "string",
        field: "可以修改",
        name: "下单要求",
        getString: (value) => {
          let str = "";
          if (value.可以修改) {
            if (value.下单显示请输入) {
              str += "可改<br>必须输入";
            } else {
              str += "可改";
            }
          } else {
            str += "不可改";
          }
          return str;
        }
      },
      {type: "string", field: "默认值"},
      {type: "string", field: "取值范围"},
      {type: "string", field: "生效条件"},
      {
        type: "button",
        field: "操作",
        buttons: [{event: "编辑"}, {event: "删除"}]
      }
    ],
    data: getSortedItems(data, (v) => v.排序 ?? 0),
    toolbarButtons: {extra: [{event: "添加"}]},
    ...others
  };
};
export const getShuruItem = async (message: MessageService, list: 输入[], data0?: 输入) => {
  const data: 输入 = {名字: "", 默认值: "", 取值范围: "", 可以修改: true, ...data0};
  const getter = new InputInfoWithDataGetter(data, {clearable: true});
  const 下单显示请输入 = getter.boolean("下单显示请输入");
  const form: InputInfo[] = [
    getter.string("名字", {
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
    }),
    getInputInfoGroup([
      getter.boolean("可以修改", {
        label: "可以输入",
        onChange: (val) => {
          下单显示请输入.hidden = !val;
          if (!val) {
            delete data.下单显示请输入;
          }
        }
      }),
      下单显示请输入
    ]),
    getter.string("默认值", {validators: Validators.required}),
    getter.string("取值范围", {validators: [Validators.required, CustomValidators.numberRangeStr]}),
    getter.string("生效条件"),
    getter.number("排序")
  ];
  const result = await message.form(form, {
    autoFill: environment.production
      ? undefined
      : () => {
          data.名字 = "test";
          data.默认值 = "1";
          data.取值范围 = "1-10";
        }
  });
  return result ? data : null;
};

export const getMenjiaoTable = (data: MenjiaoData[]): TableRenderInfo<MenjiaoData> => {
  return {
    inlineTitle: true,
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
          const data2 = value.门缝配置;
          if (!data2) {
            return "";
          }
          const map: ObjectOf<string> = {
            锁边门缝: "锁边",
            铰边门缝: "铰边",
            顶部门缝: "上",
            底部门缝: "下"
          };
          const strs = Object.entries(data2)
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
        buttons: [{event: "编辑"}, {event: "编辑排序"}, {event: "复制"}, {event: "删除"}]
      }
    ],
    data,
    toolbarButtons: {
      extra: [{event: "添加"}, {event: "从其他做法选择", title: "从其他做法选择门铰锁边铰边"}]
    }
  };
};
