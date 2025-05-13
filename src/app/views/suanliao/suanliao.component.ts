import {Component, inject, OnDestroy, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {setGlobal, timer} from "@app/app.common";
import {Formulas} from "@app/utils/calc";
import {getIsVersion2024} from "@app/utils/table-data/zuoshuju-data";
import {CadEditorInput, openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {openDrawCadDialog} from "@components/dialogs/draw-cad/draw-cad.component";
import {
  Step1Data,
  ZixuanpeijianCadItem,
  ZixuanpeijianInfo,
  ZixuanpeijianMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {
  calcCadItemZhankai,
  calcZxpj,
  CalcZxpjOptions,
  getMokuaiInfoScbl,
  isMokuaiItemEqual,
  updateMokuaiItems
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf, WindowMessageManager} from "@lucilor/utils";
import {openSuanliaogongshiDialog} from "@modules/cad-editor/components/dialogs/suanliaogongshi-dialog/suanliaogongshi-dialog.component";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {MessageData} from "@modules/message/components/message/message.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {getMkdxpzSlgsFormulas, MsbjInfo} from "@views/msbj/msbj.utils";
import {XhmrmsbjDataMsbjInfos, XhmrmsbjTableData} from "@views/xhmrmsbj/xhmrmsbj.types";
import {getMokuaiFormulas, getMokuaiShuchuVars, XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {
  ResetInputsInput,
  ResetInputsOutput,
  SuanliaoInput,
  SuanliaoOutputData,
  根据输入值计算选中配件模块无依赖的公式结果输入,
  根据输入值计算选中配件模块无依赖的公式结果输出
} from "./suanliao.types";
import {resetInputs} from "./suanliao.utils";

@Component({
  selector: "app-suanliao",
  templateUrl: "./suanliao.component.html",
  styleUrls: ["./suanliao.component.scss"]
})
export class SuanliaoComponent implements OnInit, OnDestroy {
  private calc = inject(CalcService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  wmm = new WindowMessageManager("算料", this, window.parent);

  constructor() {
    setGlobal("suanliao", this);
  }

  ngOnInit() {
    this.wmm.postMessage("suanliaoReady");
    document.documentElement.classList.remove("dark");
  }

  ngOnDestroy() {
    this.wmm.destroy();
  }

  async suanliaoStart(params: SuanliaoInput): Promise<SuanliaoOutputData> {
    const {materialResult, gongshi, tongyongGongshi, inputResult, 型号选中门扇布局, 配件模块CAD, 门扇布局CAD} = params;
    const {bujuNames, varNames, step1Data, silent} = params;
    let timerName: string | null = null;
    if (!silent) {
      timerName = "算料";
      timer.start(timerName);
    }

    const result: SuanliaoOutputData = {
      action: "suanliaoEnd",
      data: {
        materialResult,
        配件模块CAD: [],
        门扇布局CAD: [],
        模块公式输入: {},
        输出变量公式计算结果: {},
        fulfilled: false
      }
    };
    const finish = () => {
      if (timerName) {
        timer.end(timerName, timerName);
      }
      return result;
    };

    const getCadItem = (data: any, info2?: Partial<ZixuanpeijianInfo>) => {
      const item: ZixuanpeijianCadItem = {
        data: new CadData(data),
        info: {
          ...info2,
          houtaiId: data.id,
          zhankai: [],
          calcZhankai: []
        }
      };
      calcCadItemZhankai(this.calc, materialResult, item);
      return item;
    };
    const mokuais: ZixuanpeijianMokuaiItem[] = [];
    const mokuaiVars: ObjectOf<Formulas> = {};
    const mokuaiGongshis: ObjectOf<Formulas> = {};
    for (const 门扇 of bujuNames) {
      if (!型号选中门扇布局[门扇]) {
        continue;
      }
      const msbjInfo = 型号选中门扇布局[门扇];
      const {选中布局数据, 模块节点, 模块大小输出} = msbjInfo;
      const {模块大小配置} = 选中布局数据 || {};
      if (模块大小配置) {
        mokuaiGongshis[门扇] = {...getMkdxpzSlgsFormulas(模块大小配置, materialResult).data};
      } else {
        mokuaiGongshis[门扇] = {};
      }
      mokuaiVars[门扇] = {...模块大小输出};
      if (Array.isArray(模块节点)) {
        for (const node of 模块节点) {
          const {选中模块, 层名字, 层id} = node;
          const mokuaisToUpdate = [...node.可选模块];
          if (选中模块) {
            const info: Partial<ZixuanpeijianInfo> = {门扇名字: 门扇, 门扇布局: 选中布局数据, 模块名字: 层名字, 层id};
            选中模块.info = info;
            mokuais.push(选中模块);
            mokuaisToUpdate.push(选中模块);
          }
        }
      }
    }

    const isVersion2024 = getIsVersion2024(materialResult.做数据版本);

    for (const mokuai of mokuais) {
      const {type1, type2} = mokuai;
      mokuai.shuruzongkuan = false;
      mokuai.shuruzonggao = false;
      mokuai.unique = false;
      mokuai.cads = [];
      const {门扇名字} = mokuai.info || {};
      if (配件模块CAD[type1] && 配件模块CAD[type1][type2]) {
        for (const v of 配件模块CAD[type1][type2]) {
          if (isVersion2024) {
            mokuai.cads.push(getCadItem(v, mokuai.info));
          } else {
            const types: string[] = v.type2 ? v.type2.split("*") : [];
            if (types.length < 1 || !门扇名字 || types.includes(门扇名字)) {
              mokuai.cads.push(getCadItem(v, mokuai.info));
            }
          }
        }
      }
    }

    const lingsans = [];
    for (const name of bujuNames) {
      const 选中布局数据 = 型号选中门扇布局[name].选中布局数据;
      for (const data of 门扇布局CAD) {
        const {布局id: 布局id2} = data.info;
        const type2 = data.type2;
        if (选中布局数据?.vid === 布局id2 && (!type2 || type2.split("*").includes(name))) {
          lingsans.push(getCadItem(data, {门扇名字: name, 门扇布局: 选中布局数据}));
        }
      }
    }

    const calcVars: NonNullable<CalcZxpjOptions["calcVars"]> = {keys: []};
    if (varNames && !isVersion2024) {
      calcVars.keys = varNames;
    }
    const msbjs = params.msbjs.map((v) => new MsbjInfo(v));
    const xhmrmsbj = new XhmrmsbjData(params.xhmrmsbj, bujuNames, step1Data?.typesInfo || {}, msbjs);
    xhmrmsbj.name = String(materialResult.型号);
    const calcZxpjResult = await calcZxpj(this.dialog, this.message, this.calc, this.status, materialResult, mokuais, lingsans, {
      changeLinesLength: false,
      calcVars,
      gongshi,
      tongyongGongshi,
      inputResult,
      mokuaiVars,
      mokuaiGongshis,
      isVersion2024,
      xhmrmsbj
    });
    if (!calcZxpjResult.fulfilled) {
      result.data.error = calcZxpjResult.error;
      return finish();
    }
    Object.assign(result.data, calcZxpjResult);
    for (const mokuai of mokuais) {
      if (mokuai.calcVars?.result) {
        mokuai.suanliaogongshi = mokuai.calcVars.result;
      }
      delete mokuai.calcVars;
    }
    const getCadItem2 = (data: ZixuanpeijianCadItem) => ({
      ...data,
      data: data.data.export()
    });
    result.data.配件模块CAD = mokuais.map((v) => ({...v, cads: v.cads.map(getCadItem2)})) as any;
    result.data.门扇布局CAD = lingsans.map(getCadItem2) as any;
    result.data.开料使用变量 = {};
    const 开料使用变量 = result.data.开料使用变量;
    const materialResult2 = result.data.materialResult;
    for (const name of bujuNames) {
      开料使用变量[name] = {};
      const vars = {...materialResult2};
      for (const node of 型号选中门扇布局[name].模块节点 || []) {
        开料使用变量[name][node.层名字] = {};
        const vars2 = {...vars};
        for (const mokuai of mokuais) {
          if (!mokuai.info) {
            continue;
          }
          const {门扇名字, 模块名字} = mokuai.info;
          if (门扇名字 === name && 模块名字 === node.层名字) {
            Object.assign(vars2, mokuai.suanliaogongshi);
          }
        }
        for (const key of node.选中模块?.kailiaoshiyongbianliang || []) {
          if (key in vars2) {
            开料使用变量[name][node.层名字][key] = vars2[key];
          }
        }
      }
    }
    result.data.输出变量公式计算结果 = {...tongyongGongshi, ...gongshi};
    for (const key in result.data.输出变量公式计算结果) {
      if (key in materialResult2) {
        result.data.输出变量公式计算结果[key] = materialResult2[key];
      }
    }
    for (const mokuai of mokuais) {
      for (const key of getMokuaiInfoScbl(xhmrmsbj.menshanbujuInfos, mokuai)) {
        result.data.输出变量公式计算结果[key] = materialResult2[key];
      }
    }
    result.data.fulfilled = true;
    return finish();
  }

  async drawCadsStart(data: {cads: any[]}) {
    await openDrawCadDialog(this.dialog, {data: {cads: data.cads.map((v) => new CadData(v)), collection: "cad"}});
    return {action: "drawCadsEnd", data: null};
  }

  async openCadEditorStart(data: {options: CadEditorInput}) {
    const cadDataRaw = data.options.data as any;
    const cadData = new CadData(cadDataRaw.json);
    data.options.data = cadData;
    const result = await openCadEditorDialog(this.dialog, {data: data.options});
    const resultData = {...cadDataRaw, ...getHoutaiCad(cadData), _id: cadDataRaw._id};
    return {action: "openCadEditorEnd", data: {...result, data: resultData}};
  }

  async openGongshiStart({info}: {info: SuanliaogongshiInfo}) {
    const result = await openSuanliaogongshiDialog(this.dialog, {data: {info}});
    return {action: "openGongshiEnd", data: result};
  }

  updateXhmrmsbjStart(data: {xhmrmsbj: XhmrmsbjDataMsbjInfos; step1Data: Step1Data}) {
    const typesInfo = data.step1Data.typesInfo;
    const xhmrmsbj = data.xhmrmsbj;
    for (const key of keysOf(xhmrmsbj)) {
      const msbjInfo = xhmrmsbj[key];
      if (!msbjInfo) {
        continue;
      }
      for (const node of msbjInfo.模块节点 || []) {
        updateMokuaiItems(node.可选模块, typesInfo);
        const mokuai = node.选中模块;
        if (mokuai) {
          const mokuai2 = node.可选模块.find((v) => isMokuaiItemEqual(v, mokuai));
          if (mokuai2) {
            node.选中模块 = mokuai2;
          } else {
            delete node.选中模块;
          }
        }
      }
    }
    return {action: "updateXhmrmsbjEnd", data: {xhmrmsbj}};
  }

  async 根据输入值计算选中配件模块无依赖的公式结果开始(data: 根据输入值计算选中配件模块无依赖的公式结果输入) {
    const {vars, 型号选中门扇布局, inputResult, materialResult} = data;
    const result: 根据输入值计算选中配件模块无依赖的公式结果输出 = {成功: {}, 失败: {}};
    for (const menshanKey in 型号选中门扇布局) {
      const msbjInfo = 型号选中门扇布局[menshanKey];
      for (const node of msbjInfo.模块节点 || []) {
        const {选中模块: mokuai} = node;
        if (!mokuai) {
          continue;
        }
        const {type2} = mokuai;
        const {formulas} = getMokuaiFormulas(msbjInfo, node, mokuai, inputResult, materialResult);
        if (getIsVersion2024(mokuai.zuoshujubanben)) {
          const shuchuVars = getMokuaiShuchuVars(msbjInfo, node, mokuai);
          for (const key of Object.keys(formulas)) {
            if (!shuchuVars.includes(key)) {
              delete formulas[key];
            }
          }
        }
        const calcResult = await this.calc.calcFormulas(formulas, vars);
        const title = [menshanKey, type2].join("-");
        if (calcResult) {
          const {succeedTrim, error} = calcResult;
          result.成功[title] = {...succeedTrim};
          result.失败[title] = {...error};
          for (const key of Object.keys(result.成功[title])) {
            const value = result.成功[title][key];
            if (typeof value === "string" && value.includes("#")) {
              delete result.成功[title][key];
              result.失败[title][key] = value;
            }
          }
        } else {
          result.成功[title] = {};
          result.失败[title] = {...formulas};
        }
      }
    }
    return {action: "根据输入值计算选中配件模块无依赖的公式结果结束", data: result};
  }

  async getXhmrmsbjRaw() {
    this.wmm.postMessage("getXhmrmsbjRawStart");
    const result = await this.wmm.waitForMessage<XhmrmsbjTableData>("getXhmrmsbjRawEnd");
    return result;
  }

  async resetInputsStart({data, mokuaiIds}: ResetInputsInput = {}) {
    const result = {action: "resetInputsEnd", data: null as ResetInputsOutput};
    if (!data) {
      return result;
    }
    const xhmrmsbjRaw = await this.getXhmrmsbjRaw();
    let dataOld: XhmrmsbjDataMsbjInfos | undefined;
    try {
      dataOld = JSON.parse(xhmrmsbjRaw.peizhishuju || "");
    } catch {}
    if (!dataOld) {
      return result;
    }
    resetInputs(data, dataOld, mokuaiIds);
    result.data = {data};
    return result;
  }

  async messageStart({type, args}: {type: MessageData["type"]; args: [any, ...any[]]}) {
    let result: any = null;
    try {
      result = await (this.message as any)[type](...args);
    } catch {}
    return {action: "messageEnd", data: result};
  }
}
