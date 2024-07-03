import {getFilepathUrl} from "@app/app.common";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {InputInfo, InputInfoNumber, InputInfoOption, InputInfoSelect} from "@app/modules/input/components/input.types";
import {selectFiles} from "@lucilor/utils";
import Color from "color";
import {DataType, Property} from "csstype";
import {getGroupStyle, getInputStyle, getNumberUnitInput, getUnifiedInputs} from "../../models/input-info-utils";
import {PageComponentForm} from "../../models/page-components/page-component-form";
import {PageComponentImage} from "../../models/page-components/page-component-image";
import {PageComponentTextBase} from "../../models/page-components/page-component-text-base";
import {trblItems} from "../../models/page.utils";
import {InputGroup} from "./page-component-config2.types";

export const mergeGroups = (groups1: InputGroup[], groups2: InputGroup[]) => {
  for (const group of groups2) {
    const group2 = groups1.find((g) => g.name === group.name);
    if (group2) {
      group2.infos.push(...group.infos);
    } else {
      groups1.push(group);
    }
  }
  return groups1;
};

export const getTextInputs = (component: PageComponentTextBase, onChange: () => void): InputGroup<PageComponentTextBase>[] => {
  const contentPositionOptions: InputInfoOption<Property.TextAlign>[] = [
    {label: "居左", value: "left"},
    {label: "居中", value: "center"},
    {label: "居右", value: "right"}
  ];
  return [
    {
      name: "",
      infos: [
        {
          type: "string",
          label: "字体",
          model: {data: component, key: "fontFamily"},
          onChange
        },
        {
          ...getNumberUnitInput(false, "字号", "px"),
          model: {data: component, key: "fontSize"},
          onChange
        },
        {
          type: "select",
          label: "字体对齐方式",
          options: contentPositionOptions,
          model: {data: component, key: "textAlign"},
          onChange,
          style: getInputStyle(false)
        },
        {
          type: "color",
          label: "字体颜色",
          value: new Color(component.color),
          onChange: (val) => {
            component.color = val.string();
            onChange();
          }
        }
      ]
    }
  ];
};

export const getImageInputs = (
  component: PageComponentImage,
  onChange: () => void,
  http: CadDataService
): InputGroup<PageComponentImage>[] => {
  return [
    {
      name: "",
      infos: [
        {
          type: "string",
          label: "图片链接",
          model: {data: component, key: "src"},
          onChange,
          suffixIcons: [
            {
              name: "upload_file",
              color: "primary",
              onClick: async () => {
                const files = await selectFiles({accept: "image/*"});
                const file = files?.[0];
                if (!file) {
                  return;
                }
                const result = await http.uploadImage(file);
                const src = result?.url;
                if (src) {
                  component.src = getFilepathUrl(src, {remote: true});
                  onChange();
                }
              }
            }
          ],
          style: getInputStyle(false)
        },
        {
          type: "group",
          label: "",
          groupStyle: getGroupStyle(),
          infos: [
            {
              type: "boolean",
              label: "保持比例",
              model: {data: component, key: "keepRatio"},
              onChange: () => {
                component.fitSize();
                onChange();
              },
              style: getInputStyle(true)
            },
            {
              type: "select",
              label: "适应方式",
              model: {data: component, key: "objectFit"},
              options: [
                {label: "contain", value: "contain"},
                {label: "cover", value: "cover"},
                {label: "fill", value: "fill"},
                {label: "none", value: "none"},
                {label: "scale-down", value: "scale-down"}
              ],
              onChange,
              style: getInputStyle(true)
            }
          ]
        }
      ]
    }
  ];
};

export const getFormInputs = (component: PageComponentForm, onChange: () => void): InputGroup[] => {
  return mergeGroups(getTextInputs(component, onChange), [
    {
      name: "",
      infos: [
        {
          type: "group",
          label: "",
          groupStyle: getGroupStyle(),
          infos: [
            {type: "number", label: "行数", model: {data: component, key: "rows"}, onChange, style: getInputStyle(true)},
            {type: "number", label: "列数", model: {data: component, key: "cols"}, onChange, style: getInputStyle(true)}
          ]
        },
        {
          type: "group",
          label: "",
          groupStyle: getGroupStyle(),
          infos: [
            {type: "number", label: "标题宽", model: {data: component, key: "labelWidth"}, onChange, style: getInputStyle(true)},
            {type: "number", label: "内容宽", model: {data: component, key: "valueWidth"}, onChange, style: getInputStyle(true)}
          ]
        },
        {
          type: "group",
          label: "",
          groupStyle: getGroupStyle(),
          infos: [
            {
              type: "boolean",
              label: "标题换行",
              disabled: true,
              hint: "未实现",
              model: {data: component, key: "labelWrap"},
              onChange,
              style: getInputStyle(true)
            },
            {
              type: "boolean",
              label: "内容换行",
              disabled: true,
              hint: "未实现",
              model: {data: component, key: "valueWrap"},
              onChange,
              style: getInputStyle(true)
            }
          ]
        },
        {
          type: "group",
          label: "",
          groupStyle: getGroupStyle(),
          infos: [
            {type: "boolean", label: "标题分隔线", model: {data: component, key: "labelSeparator"}, onChange, style: getInputStyle(true)},
            {type: "number", label: "行高", model: {data: component, key: "rowHeight"}, onChange, style: getInputStyle(true)}
          ]
        }
      ]
    },
    {
      name: "表格边距",
      infos: [
        {
          type: "group",
          label: "标题边距",
          groupStyle: getGroupStyle(),
          infos: getUnifiedInputs(
            "表格标题边距",
            trblItems.map(({name, index}) => ({
              ...getNumberUnitInput(true, name, "px", {flex: "0 0 50%"}),
              model: {data: component.labelPadding, key: index},
              onChange
            })),
            component.labelPadding,
            onChange
          )
        },
        {
          type: "group",
          label: "内容边距",
          groupStyle: getGroupStyle(),
          infos: getUnifiedInputs(
            "表格内容边距",
            trblItems.map(({name, index}) => ({
              ...getNumberUnitInput(true, name, "px", {flex: "0 0 50%"}),
              model: {data: component.valuePadding, key: index},
              onChange
            })),
            component.valuePadding,
            onChange
          )
        }
      ]
    }
  ]);
};

export const getCommonInputs = (
  component: any,
  onChange: () => void,
  onComponentSizeChange: (component: any, axis: "x" | "y") => void
): InputGroup[] => {
  const {resizable = {}} = ({} as any)[component.type] || {};
  const widthInput: InputInfoNumber<typeof component.size> = {
    ...getNumberUnitInput(true, "宽", "px"),
    model: {data: component.size, key: "x"},
    readonly: !resizable.x,
    onChange: () => {
      onComponentSizeChange(component, "x");
      onChange();
    }
  };
  if (!resizable.x) {
    widthInput.readonly = true;
    widthInput.hint = "宽度自动调整";
  }
  const heightInput: InputInfoNumber<typeof component.size> = {
    ...getNumberUnitInput(true, "高", "px"),
    model: {data: component.size, key: "y"},
    readonly: !resizable.y,
    onChange: () => {
      onComponentSizeChange(component, "y");
      onChange();
    }
  };
  if (!resizable.y) {
    heightInput.readonly = true;
    heightInput.hint = "高度自动调整";
  }

  const xInput: InputInfoNumber<typeof component.position> = {
    ...getNumberUnitInput(true, "X", "px"),
    model: {data: component.position, key: "x"},
    onChange
  };
  const yInput: InputInfoNumber<typeof component.position> = {
    ...getNumberUnitInput(true, "Y", "px"),
    model: {data: component.position, key: "y"},
    onChange
  };

  const borderStyleInput: InputInfoSelect<any, DataType.LineStyle> = {
    type: "select",
    label: "边框样式",
    options: [
      {label: "无", value: "none"},
      {label: "实线", value: "solid"},
      {label: "虚线", value: "dashed"},
      {label: "点线", value: "dotted"}
    ],
    model: {data: component, key: "borderStyle"},
    onChange: (val) => {
      if (val !== "none" && !(component.borderWidth > 0)) {
        component.borderWidth = 1;
      }
      onChange();
    },
    style: getInputStyle(false)
  };
  const borderInputs: InputInfo<any>[] = [
    borderStyleInput,
    {
      type: "color",
      label: "边框颜色",
      value: new Color(component.borderColor),
      onChange: (val) => {
        component.borderColor = val.string();
        onChange();
      }
    },
    getNumberUnitInput(true, "边框宽度", "px", {}, {model: {data: component, key: "borderWidth"}, onChange}),
    {
      type: "group",
      label: "框线显示",
      groupStyle: getGroupStyle(),
      infos: getUnifiedInputs(
        "框线显示",
        trblItems.map(({name, index}) => ({
          type: "boolean",
          label: name,
          model: {data: component.borderShow, key: index},
          style: getInputStyle(true, {flex: "0 0 50%"})
        })),
        component.borderShow,
        onChange
      )
    }
  ];

  return [
    {
      name: "",
      infos: [
        {
          type: "color",
          label: "背景颜色",
          value: new Color(component.background),
          onChange: (val) => {
            component.background = val.string();
            onChange();
          }
        }
      ]
    },
    {name: "边框", infos: borderInputs},
    {
      name: "尺寸与位置",
      infos: [
        {type: "group", label: "尺寸", groupStyle: getGroupStyle(), infos: [widthInput, heightInput]},
        {type: "group", label: "位置", groupStyle: getGroupStyle(), infos: [xInput, yInput]},
        {...getNumberUnitInput(true, "旋转", "°"), model: {data: component.rotation, key: "deg"}, onChange}
      ]
    }
  ];
};
