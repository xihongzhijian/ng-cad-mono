import {ValidationErrors, Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {getArray} from "@app/app.common";
import {CadEditType, Cad数据要求, setCadData} from "@app/cad/cad-shujuyaoqiu";
import {CadCollection} from "@app/cad/collections";
import {cadOptionOptions, cadOptions} from "@app/cad/options";
import {CustomValidators} from "@app/utils/input-validators";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {openKlkwpzDialog} from "@components/dialogs/klkwpz-dialog/klkwpz-dialog.component";
import {openSuanliaodanFlipDialog} from "@components/dialogs/suanliaodan-flip/suanliaodan-flip.component";
import {算料公式} from "@components/lurushuju/xinghao-data";
import {isSbjbCad} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.types";
import {environment} from "@env";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo, InputInfoPart} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {openCadDataAttrsDialog} from "../../dialogs/cad-data-attrs/cad-data-attrs.component";
import {openCadMenfengConfigDialog} from "../cad-menfeng-config/cad-menfeng-config.component";

export const cadFields = {
  id: "id",
  名字: "name",
  分类: "type",
  分类2: "type2",
  显示名字: "xianshimingzi",
  开孔对应名字: "开孔对应名字",
  切内空对应名字: "切内空对应名字",
  全部刨坑: "kailiaoshibaokeng",
  板材纹理方向: "bancaiwenlifangxiang",
  默认开料板材: "morenkailiaobancai",
  算料处理: "suanliaochuli",
  显示宽度标注: "showKuandubiaozhu",
  双向折弯: "shuangxiangzhewan",
  算料特殊要求: "算料特殊要求",
  算料单显示: "suanliaodanxianshi",
  装配位置: "装配位置",
  企料包边门框配合位增加值: "企料包边门框配合位增加值",
  对应门扇厚度: "对应门扇厚度",
  主CAD: "主CAD",
  固定开料板材: "gudingkailiaobancai",
  选项: "options",
  条件: "conditions",
  对应计算条数的配件: "对应计算条数的配件",
  指定板材分组: "指定板材分组",
  默认开料材料: "默认开料材料",
  默认开料板材厚度: "默认开料板材厚度",
  算料单显示放大倍数: "suanliaodanZoom",
  自动生成双折宽双折高公式: "自动生成双折宽双折高公式",
  开料时刨坑: "kailiaoshibaokeng",
  变形方式: "bianxingfangshi",
  开料排版方式: "kailiaopaibanfangshi",
  板材厚度方向: "bancaihoudufangxiang",
  型号花件: "xinghaohuajian",
  必须绑定花件: "needsHuajian",
  可独立板材: "kedulibancai",
  必须选择板材: "必须选择板材",
  企料前后宽同时改变: "企料前后宽同时改变",
  算料单展开显示位置: "算料单展开显示位置",
  属于门框门扇: "属于门框门扇",
  内开做分体: "内开做分体",
  板材绑定选项: "板材绑定选项",
  算料单线长显示的最小长度: "算料单线长显示的最小长度",
  检查企料厚度: "检查企料厚度",
  显示厚度: "显示厚度",
  跟随CAD开料板材: "跟随CAD开料板材",
  正面宽差值: "正面宽差值",
  墙厚差值: "墙厚差值",
  企料翻转: "企料翻转",
  企料门框配合位增加值: "企料包边门框配合位增加值",
  企料包边类型: "企料包边类型",
  指定封口厚度: "指定封口厚度",
  拼接料拼接时垂直翻转: "拼接料拼接时垂直翻转",
  拉码碰撞判断: "拉码碰撞判断",
  装配示意图自动拼接锁边铰边: "装配示意图自动拼接锁边铰边"
} as const;

export const getData = (data: CadData | (() => CadData)) => (typeof data === "function" ? data() : data);

export const getCadInfoInputs = (
  keys: string[],
  data: CadData | (() => CadData),
  dialog: MatDialog,
  status: AppStatusService,
  parseOptionString: boolean,
  gongshis?: 算料公式[] | null
) => {
  const result: InputInfo<CadData>[] = [];
  const getZhankai = () => {
    const data2 = getData(data);
    if (!data2.zhankai) {
      data2.zhankai = [];
    }
    if (!data2.zhankai[0]) {
      data2.zhankai[0] = new CadZhankai({name: data.name});
    }
    const zhankai = data2.zhankai.at(0);
    return zhankai;
  };
  const gongshiOptions = status.getGongshiOptions(gongshis);
  const getter = new InputInfoWithDataGetter(data, {clearable: true});
  const getter2 = new InputInfoWithDataGetter(() => getData(data).info, {clearable: true});
  const getDialogInput = (label: string, onClick: () => void, others?: InputInfoPart): InputInfo => {
    return {
      type: "string",
      label,
      selectOnly: true,
      suffixIcons: [{name: "list", isDefault: true, onClick}],
      ...others
    };
  };
  for (const key of keys) {
    if (result.some((v) => v.label === key)) {
      continue;
    }
    let info: InputInfo;
    switch (key) {
      case "id":
        info = getter.string(cadFields[key], {label: key, readonly: true, copyable: true});
        break;
      case "名字":
      case "分类":
      case "分类2":
      case "显示名字":
      case "开孔对应名字":
      case "切内空对应名字":
      case "板材绑定选项":
      case "显示厚度":
      case "跟随CAD开料板材":
      case "指定封口厚度":
        info = getter.string(cadFields[key], {label: key});
        break;
      case "算料特殊要求":
        info = getter.string(cadFields[key], {label: key, textarea: {autosize: {maxRows: 5}}});
        break;
      case "算料单显示放大倍数":
      case "算料单线长显示的最小长度":
        info = getter.number(cadFields[key], {label: key, min: 0});
        break;
      case "正面宽差值":
      case "墙厚差值":
      case "企料门框配合位增加值":
      case "对应门扇厚度":
        info = getter.number(cadFields[key], {label: key});
        break;
      case "开料时刨坑":
      case "显示宽度标注":
      case "必须绑定花件":
      case "可独立板材":
      case "必须选择板材":
      case "双向折弯":
      case "自动生成双折宽双折高公式":
      case "企料前后宽同时改变":
      case "主CAD":
      case "内开做分体":
      case "检查企料厚度":
      case "企料翻转":
      case "拼接料拼接时垂直翻转":
      case "拉码碰撞判断":
        info = getter.boolean(cadFields[key], {label: key});
        break;
      case "变形方式":
      case "板材纹理方向":
      case "开料排版方式":
      case "算料处理":
      case "板材厚度方向":
      case "算料单显示":
      case "算料单展开显示位置":
      case "属于门框门扇":
      case "企料包边类型":
      case "指定板材分组":
      case "装配示意图自动拼接锁边铰边":
        info = getter.selectSingle(cadFields[key], cadOptions[cadFields[key]].values.slice(), {label: key});
        break;
      case "选项":
      case "型号花件":
        info = getter.object(cadFields[key], {label: key, optionsDialog: {}, optionMultiple: true, parseString: parseOptionString});
        if (key === "选项") {
          info.optionType = "选项";
        }
        break;
      case "条件":
        info = getter.array(cadFields[key], {label: key});
        break;
      case "默认开料板材":
      case "固定开料板材":
        info = getter.string(cadFields[key], {label: key, optionMultiple: true, optionsDialog: {optionKey: "板材"}});
        break;
      case "默认开料材料":
        info = getter.string(cadFields[key], {label: key, optionMultiple: true, optionsDialog: {optionKey: "材料"}});
        break;
      case "默认开料板材厚度":
        info = getter.string(cadFields[key], {
          label: key,
          optionMultiple: true,
          optionsDialog: {optionKey: "板材厚度", optionField: "kailiaohoudu"}
        });
        break;
      case "唯一码":
        info = getter2.string(key, {readonly: true});
        break;
      case "激光开料是否翻转":
      case "激光开料打标":
      case "激光开料排版后只保留孔":
        info = getter2.boolean(key);
        break;
      case "指定下单板材":
      case "指定下单材料":
      case "指定下单厚度":
        info = getter2.string(key);
        break;
      case "激光开料折弯标记长直线":
      case "激光开料折弯标记短直线":
        info = getter2.numberWithUnit(key, "mm");
        break;
      case "自定义属性":
        info = getDialogInput(key, async () => {
          const data2 = getData(data);
          const result2 = await openCadDataAttrsDialog(dialog, {data: data2.attributes});
          if (result2) {
            data2.attributes = result2;
          }
        });
        break;
      case "正面线到见光线展开模板":
        info = getter2.string(key, {
          suffixIcons: [
            {
              name: "open_in_new",
              onClick: () => {
                status.openCadInNewTab(getData(data).info[key], "kailiaocadmuban");
              }
            },
            {
              name: "list",
              onClick: async () => {
                const checkedItems = [];
                const dataInfo = getData(data).info;
                if (dataInfo[key]) {
                  checkedItems.push(dataInfo[key]);
                }
                const result2 = await openCadListDialog(dialog, {
                  data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}
                });
                if (result2?.length) {
                  dataInfo[key] = result2[0].id;
                }
              }
            }
          ]
        });
        break;
      case "展开信息":
        {
          const style: InputInfo["style"] = {flex: "1 1 0", width: 0, margin: "2px"};
          info = {
            type: "group",
            label: key,
            groupStyle: {display: "flex"},
            infos: [
              {
                type: "string",
                label: "宽",
                style,
                options: gongshiOptions,
                model: {data: getZhankai, key: "zhankaikuan"},
                validators: Validators.required
              },
              {
                type: "string",
                label: "高",
                style,
                options: gongshiOptions,
                model: {data: getZhankai, key: "zhankaigao"},
                validators: Validators.required
              },
              {type: "string", label: "数量", style, model: {data: getZhankai, key: "shuliang"}, validators: Validators.required}
            ]
          };
        }
        break;
      case "激光开料CAD模板":
        {
          const style: InputInfo["style"] = {flex: "1 1 0", width: 0, margin: "2px"};
          info = {
            type: "group",
            label: key,
            groupStyle: {display: "flex"},
            infos: [
              {
                type: "string",
                label: key,
                style,
                selectOnly: true,
                model: {data: getZhankai(), key: "kailiaomuban"},
                suffixIcons: [
                  {
                    name: "open_in_new",
                    onClick: () => {
                      status.openCadInNewTab(getZhankai()?.kailiaomuban || "", "kailiaocadmuban");
                    }
                  },
                  {
                    name: "list",
                    isDefault: true,
                    onClick: async () => {
                      const zhankai = getZhankai();
                      if (!zhankai) {
                        return;
                      }
                      const kailiaomuban = zhankai.kailiaomuban;
                      const checkedItems: string[] = [];
                      if (kailiaomuban) {
                        checkedItems.push(kailiaomuban);
                      }
                      const result2 = await openCadListDialog(dialog, {
                        data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}
                      });
                      const id = result2?.[0]?.id;
                      if (id) {
                        zhankai.kailiaomuban = id;
                      }
                    }
                  }
                ]
              }
            ]
          };
        }
        break;
      case "上传dxf文件":
        info = {
          type: "file",
          label: key,
          accept: ".dxf",
          clearable: true,
          onChange: (files) => {
            const file = files?.[0];
            getData(data).info.uploadDxf = file;
          }
        };
        break;
      case "开料孔位配置":
        info = getDialogInput(key, async () => {
          const data2 = getData(data);
          const result2 = await openKlkwpzDialog(dialog, {data: {source: data2.info[key]}});
          if (result2) {
            data2.info[key] = result2;
          }
        });
        break;
      case "算料单翻转":
        info = getDialogInput(key, async () => {
          const data2 = getData(data);
          const result2 = await openSuanliaodanFlipDialog(dialog, {data: {items: data2.info[key]}});
          if (result2) {
            data2.info[key] = result2.items;
          }
        });
        break;
      case "门缝配置":
        {
          const data2 = getData(data);
          info = getDialogInput(
            key,
            async () => {
              const data3 = getData(data);
              const result2 = await openCadMenfengConfigDialog(dialog, {data: {type: data3.type, items: data3.info[key]}});
              if (result2) {
                data3.info[key] = result2.items;
              }
            },
            {value: Array.isArray(data2.info[key]) && data2.info[key].length > 0 ? "有数据" : ""}
          );
        }
        break;
      default:
        info = {type: "string", label: key + "（未实现）", disabled: true};
    }
    const requiredKeys = ["名字"];
    if (requiredKeys.includes(key)) {
      if (Array.isArray(info.validators)) {
        info.validators.push(Validators.required);
      } else if (info.validators) {
        info.validators = [info.validators, Validators.required];
      } else {
        info.validators = Validators.required;
      }
    }
    result.push(info);
  }
  return result;
};

export const getCadInfoInputs2 = async (
  yaoqiu: Cad数据要求 | null | undefined,
  type: CadEditType,
  collection: CadCollection,
  data: CadData | (() => CadData),
  http: CadDataService,
  dialog: MatDialog,
  status: AppStatusService,
  parseOptionString: boolean,
  gongshis?: 算料公式[] | null
) => {
  if (!yaoqiu) {
    return [];
  }
  const items = type === "add" ? yaoqiu.新建CAD要求 : yaoqiu.CAD弹窗修改属性;
  const items2 = yaoqiu.选中CAD要求 || [];
  const result: InputInfo[] = [];
  const cad = getData(data);
  const isSbjb = isSbjbCad(collection, cad);
  const requiredOptionItems = items2.filter((v) => v.key === "选项" && v.key2 && v.required);
  for (const {key, value, cadKey, key2, readonly, required} of items) {
    let info: InputInfo;
    if (key === "选项" && key2) {
      info = {
        type: "select",
        label: key2,
        model: {data: () => getData(data).options, key: key2},
        options: []
      };
      if (key2 in cadOptionOptions) {
        info.options = cadOptionOptions[key2].values.slice();
      } else {
        info.optionsDialog = {optionKey: key2, openInNewTab: true};
      }
    } else {
      info = getCadInfoInputs([key], data, dialog, status, parseOptionString, gongshis)[0];
      if (key === "选项" && info.type === "object") {
        const requiredKeys: string[] = [];
        for (const {key2: optionKey} of requiredOptionItems || []) {
          if (optionKey) {
            requiredKeys.push(optionKey);
          }
        }
        info.requiredKeys = requiredKeys;
      }
    }
    if (!info) {
      info = {type: "string", label: key + "（未实现）", disabled: true};
    } else {
      if (readonly) {
        if (environment.production) {
          info.hidden = true;
        } else {
          info.readonly = true;
        }
      }
      const setInfo = (info2: InputInfo) => {
        if (info2.type === "group") {
          for (const info3 of info2.infos || []) {
            setInfo(info3);
          }
        } else {
          if (required) {
            info2.validators = Validators.required;
          } else {
            delete info2.validators;
          }
        }
      };
      setInfo(info);
      if (value && cadKey) {
        if (key2) {
          (data as any)[cadKey][key2] = value;
        } else {
          (data as any)[cadKey] = value;
        }
      }
    }
    if (isSbjb) {
      if (cadKey === "name") {
        const items3 = await http.queryMySql({table: cad.type, fields: ["mingzi"], filter: {where: {shujufenlei: cadKey}}});
        let itemNames = items3.map((v) => v.mingzi);
        if (type === "set") {
          itemNames = itemNames.filter((v) => v !== cad.name);
        }
        info.validators = [Validators.required, CustomValidators.duplicate(itemNames)];
      }
    }
    result.push(info);
  }
  return result;
};

export interface CadFormValidators {
  name?: (data: CadData) => ValidationErrors | null;
}
export const openCadForm = async (
  yaoqiu: Cad数据要求 | null | undefined,
  collection: CadCollection,
  data: CadData | null | undefined,
  http: CadDataService,
  dialog: MatDialog,
  status: AppStatusService,
  message: MessageService,
  parseOptionString: boolean,
  opts?: {
    gongshis?: 算料公式[] | null;
    validators?: CadFormValidators;
    noFixedType?: boolean;
    formMessageData?: Parameters<typeof message.form>[1];
    formMessageOthers?: Parameters<typeof message.form>[2];
  }
) => {
  const {gongshis, validators, noFixedType} = opts || {};
  const data2 = data?.clone() || new CadData();
  const type: CadEditType = data ? "set" : "add";
  const form = await getCadInfoInputs2(yaoqiu, type, collection, data2, http, dialog, status, parseOptionString, gongshis);
  if (validators?.name) {
    const nameValidator = validators.name;
    const nameInput = form.find((v) => v.label === "名字");
    if (nameInput) {
      nameInput.validators = [...getArray(nameInput.validators), () => nameValidator(data2)];
    }
  }
  let title = (data ? "编辑" : "新建") + "CAD";
  const name = data2.name;
  if (name) {
    title += `【${name}】`;
  }
  const {formMessageData, formMessageOthers} = opts || {};
  const result = await message.form(form, {title, ...formMessageData}, formMessageOthers);
  if (result) {
    if (yaoqiu && !noFixedType) {
      data2.type = yaoqiu.CAD分类;
    }
    if (type === "add") {
      setCadData(data2, yaoqiu, type);
    }
    return data2;
  }
  return null;
};
