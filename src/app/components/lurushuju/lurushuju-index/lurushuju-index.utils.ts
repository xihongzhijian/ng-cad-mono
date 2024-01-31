import {CadListInput} from "@components/dialogs/cad-list/cad-list.types";
import {ObjectOf} from "@lucilor/utils";
import {InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {cadMatchRules, 算料数据} from "../xinghao-data";
import {MenjiaoData, OptionsAll, OptionsAll2, ShuruTableData, XuanxiangTableData} from "./lurushuju-index.types";

export const getCadSearch = (data: 算料数据, key1: string, key2: string, key3: string) => {
  const missingValues = [];
  const rule = cadMatchRules[key3];
  if (!rule) {
    throw new Error("没有对应的cad匹配规则");
  }
  const {分类, 选项} = rule;
  for (const name of 选项) {
    if (!data[name]) {
      missingValues.push(name);
    }
  }
  if (missingValues.length > 0) {
    throw new Error("请先选择" + missingValues.join("、"));
  }
  const formValues: ObjectOf<any> = {};
  for (const name of 选项) {
    const value = data[name];
    formValues[name] = value;
  }
  const [包边方向, 开启] = key1.split("+");
  const filter = `
    function fn() {
      if (!this.选项) {
        return false;
      }
      var 分类 = ${JSON.stringify(分类)};
      var 选项 = ${JSON.stringify(选项)};
      var form = ${JSON.stringify(formValues)};
      var 包边方向1 = ${JSON.stringify(包边方向)};
      var 开启1 = ${JSON.stringify(开启)};
      var 包边方向2 = this.选项.包边方向;
      var 开启2 = this.选项.开启;
      var matchOption = function (value1, value2, falseIfEmpty) {
        if (value2 === undefined || value2 === null || value2 === "") {
          return !falseIfEmpty;
        }
        if (value2 === "所有") {
          return true;
        }
        if (typeof value2 === "string") {
          value2 = value2.split(";");
        }
        if (!Array.isArray(value1)) {
          value1 = [value1];
        }
        for (var i = 0; i < value1.length; i++) {
          var v = value1[i];
          if (value2.indexOf(v) >= 0) {
            return true;
          }
        }
        return false;
      }
      var check = function () {
        if (包边方向1 === "包边在外") {
          return matchOption(包边方向1, 包边方向2) && matchOption(开启1, 开启2, true);
        } else if (包边方向1 === "包边在内") {
          if (matchOption("包边在内", 包边方向2, true) && matchOption(开启1, 开启2, true)) {
            return true;
          }
          if (开启1 === "外开") {
            return matchOption("包边在外", 包边方向2) && matchOption("内开", 开启2, true);
          } else if (开启1 === "内开") {
            return matchOption("包边在外", 包边方向2) && matchOption("外开", 开启2, true);
          }
        }
      }
      if (!check()) {
        return false;
      }
      if (分类.indexOf(this.分类) < 0) {
        return false;
      }
      for (var i = 0; i < 选项.length; i++) {
        var name = 选项[i];
        var value1 = form[name];
        var value2 = this.选项[name];
        if (!matchOption(value1, value2)) {
          return false;
        }
      }
      return true;
    }
    `;
  const search: ObjectOf<any> = {$where: filter};
  const addCadData: CadListInput["addCadData"] = {分类: key3, 选项: {开启}};
  return {search, addCadData};
};

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

export const getMenjiaoTable = (): TableRenderInfo<MenjiaoData> => {
  return {
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
          const strs = Object.entries(data).map(([k, v]) => `${k}${v}`);
          return strs.join(", ");
        }
      },
      {type: "boolean", field: "停用", width: "60px"},
      {type: "number", field: "排序", width: "60px"},
      {type: "boolean", field: "默认值", width: "60px"},
      {
        type: "button",
        field: "操作",
        width: "190px",
        buttons: [
          {event: "编辑", color: "primary"},
          {event: "复制", color: "primary"},
          {event: "删除", color: "primary"}
        ]
      }
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

export const getOptionInputInfo = (
  optionsAll: OptionsAll2 | undefined | null,
  key: keyof 算料数据,
  setter?: (info: InputInfoSelect) => void
): InputInfoSelect => {
  const optionsInfo = optionsAll?.[key];
  if (!optionsInfo) {
    return {type: "select", label: key, options: []};
  }
  const options = optionsInfo.options.map<InputInfoOption>((v) => {
    return {value: v.name, img: v.img};
  });
  const {disabled, multiple} = optionsInfo;
  const info: InputInfoSelect = {
    type: "select",
    label: key,
    options,
    disabled,
    multiple
  };
  if (typeof setter === "function") {
    setter(info);
  }
  return info;
};
