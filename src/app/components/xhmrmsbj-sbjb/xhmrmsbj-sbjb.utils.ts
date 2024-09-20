import {Validators} from "@angular/forms";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {OptionsService} from "@services/options.service";
import {cloneDeep} from "lodash";
import {XhmrmsbjSbjbItemSbjb, XhmrmsbjSbjbItemSbjbItem} from "./xhmrmsbj-sbjb.types";

export const getXhmrmsbjSbjbItemTableInfo = (data: XhmrmsbjSbjbItemSbjb[], fenlei: string): TableRenderInfo<XhmrmsbjSbjbItemSbjb> => {
  return {
    data,
    noCheckBox: true,
    columns: [
      {type: "string", field: "开启"},
      {type: "string", field: "门铰"},
      {type: "string", field: "门扇厚度"},
      {type: "string", field: "条件"},
      {type: "string", field: "包边方向"},
      {type: "string", field: "锁边", getString: (val) => val.锁边.名字},
      {type: "string", field: "铰边", getString: (val) => val.铰边.名字},
      {type: "string", field: "锁框", hidden: !isXhmrmsbjSbjbItemSbjbHasSuokuang(fenlei)},
      {type: "string", field: "铰框"},
      {type: "string", field: "顶框"},
      {
        type: "button",
        field: "CAD数据",
        name: "操作",
        width: "160px",
        buttons: [
          {event: "edit", title: "编辑", color: "primary"},
          {event: "delete", title: "删除", color: "primary"},
          {event: "copy", title: "复制", color: "primary"}
        ]
      }
    ]
  };
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

export const getXhmrmsbjSbjbItemSbjbForm = async (
  message: MessageService,
  options: OptionsService,
  fenlei: string,
  item?: XhmrmsbjSbjbItemSbjb
) => {
  const data = getXhmrmsbjSbjbItemSbjb(cloneDeep(item));
  const getSelectInputInfo = async (key: keyof XhmrmsbjSbjbItemSbjb, multiple: boolean) =>
    ({
      type: "select",
      label: key,
      model: {data, key},
      multiple,
      options: await options.fetchInputInfoOptions({name: key})
    }) satisfies InputInfo<typeof data>;
  const getStringInputInfo = (key: keyof XhmrmsbjSbjbItemSbjb) =>
    ({type: "string", label: key, model: {data, key}}) satisfies InputInfo<typeof data>;
  const getSbjbItemInfo = (key: "锁边" | "铰边") =>
    ({
      type: "string",
      label: key,
      model: {data: data[key], key: "名字"},
      readonly: true,
      suffixIcons: [
        {
          name: "edit",
          isDefault: true,
          onClick: async () => {
            const sbjbItem = await getXhmrmsbjSbjbItemSbjbItemForm(message, data[key]);
            if (sbjbItem) {
              Object.assign(data[key], sbjbItem);
              return {isValueChanged: true};
            }
            return null;
          }
        }
      ],
      validators: () => {
        if (!data[key].名字) {
          return {[`${key}名字不能为空`]: true};
        }
        return null;
      }
    }) satisfies InputInfo<XhmrmsbjSbjbItemSbjbItem>;
  const form: InputInfo[] = [
    await getSelectInputInfo("开启", true),
    await getSelectInputInfo("门铰", true),
    await getSelectInputInfo("门扇厚度", true),
    getStringInputInfo("条件"),
    await getSelectInputInfo("包边方向", false),
    getSbjbItemInfo("锁边"),
    getSbjbItemInfo("铰边"),
    {...(await getSelectInputInfo("锁框", false)), hidden: !isXhmrmsbjSbjbItemSbjbHasSuokuang(fenlei)},
    await getSelectInputInfo("铰框", false),
    getStringInputInfo("顶框")
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
