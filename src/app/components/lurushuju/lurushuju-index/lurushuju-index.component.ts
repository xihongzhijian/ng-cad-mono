import {Component, HostBinding, OnInit, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTabChangeEvent, MatTabGroup, MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, getBooleanStr, getCopyName, getFilepathUrl, session, setGlobal} from "@app/app.common";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {environment} from "@env";
import {ObjectOf, queryString, WindowMessageManager} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MrbcjfzHuajian} from "@views/mrbcjfz/mrbcjfz.types";
import {cloneDeep, debounce, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {openMenjiaoDialog} from "../menjiao-dialog/menjiao-dialog.component";
import {MenjiaoInput} from "../menjiao-dialog/menjiao-dialog.types";
import {updateMenjiaoForm} from "../menjiao-dialog/menjiao-dialog.utils";
import {openSelectGongyiDialog} from "../select-gongyi-dialog/select-gongyi-dialog.component";
import {
  getGongyi,
  getXinghao,
  updateXinghaoFenleis,
  xiaoguotuKeys,
  Xinghao,
  XinghaoRaw,
  工艺做法,
  算料数据,
  算料数据2,
  输入,
  选项
} from "../xinghao-data";
import {
  LurushujuIndexStep,
  LurushujuIndexStepInfo,
  OptionsAll,
  OptionsAll2,
  ShuruTableData,
  XinghaoData,
  XuanxiangTableData
} from "./lurushuju-index.types";
import {getMenjiaoTable, getOptions, getShuruTable, getXuanxiangTable} from "./lurushuju-index.utils";

@Component({
  selector: "app-lurushuju-index",
  standalone: true,
  imports: [
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MrbcjfzComponent,
    NgScrollbarModule,
    TableComponent
  ],
  templateUrl: "./lurushuju-index.component.html",
  styleUrl: "./lurushuju-index.component.scss"
})
export class LurushujuIndexComponent implements OnInit {
  @HostBinding("class.ng-page") isPage = true;
  defaultFenleis = ["单门", "子母对开", "双开"];
  xinghaos: XinghaoData[] = [];
  xinghao: Xinghao | null = null;
  gongyi: 工艺做法 | null = null;
  xinghaoFilterStrKey = "lurushujuXinghaoFilterStr";
  xinghaoFilterStr = session.load<string>(this.xinghaoFilterStrKey) || "";
  tabs: {name: string; hidden?: boolean}[] = [{name: "算料数据"}, {name: "下单选项输入配置"}];
  tabNameKey = "lurushujuTabName";
  tabIndex = 0;
  tabIndexPrev = -1;
  filterInputInfo: InputInfo<this> = {
    type: "string",
    label: "搜索型号",
    clearable: true,
    model: {data: this, key: "xinghaoFilterStr"},
    onInput: debounce(() => {
      this.filterXinghaos();
      session.save(this.xinghaoFilterStrKey, this.xinghaoFilterStr);
    }, 500)
  };
  xinghaoOptionsAll: OptionsAll = {};
  gongyiOptionsAll: OptionsAll = {};
  menjiaoOptionsAll: OptionsAll2 = {};
  xinghaoInputInfos: InputInfo<Xinghao>[] = [];
  xuanxiangTable = getXuanxiangTable();
  shuruTable = getShuruTable();
  menjiaoTable = getMenjiaoTable();
  menshans: (TableDataBase & {zuchenghuajian?: string})[] = [];
  huajians: MrbcjfzHuajian[] = [];
  parentInfo = {isZhijianUser: false, isLurushujuEnter: false};
  varNames: FormulasEditorComponent["vars"];
  bancaiList?: BancaiListData;

  stepDataKey = "lurushujuIndexStepData";
  step: LurushujuIndexStep = 1;
  xinghaoName = "";
  fenleiName = "";
  gongyiName = "";
  production = environment.production;
  wmm = new WindowMessageManager("录入数据", this, window.parent);
  @ViewChild(MrbcjfzComponent) mrbcjfz?: MrbcjfzComponent;
  @ViewChild(MatTabGroup) tabGroup?: MatTabGroup;

  private _isDataFetched: ObjectOf<boolean> = {};

  constructor(
    private http: CadDataService,
    private message: MessageService,
    private dialog: MatDialog
  ) {
    setGlobal("lrsj", this, true);
  }

  async ngOnInit() {
    const stepData = session.load<[LurushujuIndexStep, LurushujuIndexStepInfo[LurushujuIndexStep]]>(this.stepDataKey);
    await this.updateParentInfo();
    if (stepData && !this.parentInfo.isLurushujuEnter) {
      await this.setStep(...stepData);
    } else {
      await this.setStep(1, {});
    }
  }

  async updateParentInfo() {
    this.wmm.postMessage("getParentInfoStart");
    this.parentInfo = await this.wmm.waitForMessage("getParentInfoEnd");
  }

  async getXinghaos() {
    const xinghaos = await this.http.getData<TableDataBase[]>("shuju/api/getXinghaos");
    if (xinghaos) {
      this.filterXinghaos(xinghaos);
      this.xinghaos = xinghaos;
    }
  }

  filterXinghaos(xinghaos = this.xinghaos) {
    const str = this.xinghaoFilterStr;
    for (const xinghao of xinghaos) {
      xinghao.hidden = !queryString(str, xinghao.mingzi);
    }
  }

  async getXinghao() {
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/getXinghao", {名字: this.xinghaoName});
    const xinghao = getXinghao(xinghaoRaw);
    this.xinghao = xinghao;
    await this.updateXinghao(xinghaoRaw?.产品分类);
  }

  async addXinghao() {
    const names = this.xinghaos.map((xinghao) => xinghao.mingzi);
    const 名字 = await this.message.prompt({
      type: "string",
      label: "型号名字",
      validators: (control) => {
        const value = control.value;
        if (!value) {
          return {名字不能为空: true};
        }
        if (names.includes(value)) {
          return {名字已存在: true};
        }
        return null;
      }
    });
    if (!名字) {
      return;
    }
    const xinghao = await this.http.getData<XinghaoData>("shuju/api/insertXinghao", {名字});
    if (xinghao) {
      this.getXinghaos();
    }
  }

  enterXinghao(xinghao: XinghaoData) {
    this.xinghao = null;
    this.setStep(2, {xinghaoName: xinghao.mingzi});
  }

  async editXinghao(xinghao: XinghaoData) {
    const data = cloneDeep(xinghao);
    const data2: XinghaoRaw = {名字: data.mingzi, 所属门窗: data.menchuang, 所属工艺: data.gongyi, 订单流程: data.dingdanliucheng};
    const mingziOld = data.mingzi;
    const form: InputInfo[] = [
      {type: "string", label: "名字", model: {data: data, key: "mingzi"}, validators: Validators.required},
      {
        type: "image",
        label: "图片",
        value: data.tupian,
        prefix: filePathUrl,
        onChange: async (val) => {
          const result = await this.http.uploadImage(val);
          if (result?.url) {
            form[1].value = result.url;
            data.tupian = result.url;
          }
        }
      },
      {
        type: "select",
        label: "门窗",
        model: {data: data2, key: "所属门窗"},
        options: this.getOptions("门窗")
      },
      {
        type: "select",
        label: "工艺",
        model: {data: data2, key: "所属工艺"},
        options: this.getOptions("工艺")
      },
      {
        type: "select",
        label: "订单流程",
        model: {data: data2, key: "订单流程"},
        options: this.getOptions("订单流程")
      },
      {type: "number", label: "排序", model: {data, key: "paixu"}},
      {type: "boolean", label: "停用", model: {data, key: "tingyong"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      data2.名字 = data.mingzi;
      const response = await this.http.post("shuju/api/editXinghao", {mingziOld, data: {...xinghao, ...data}});
      if (response?.code === 0) {
        const response2 = await this.setXinghao(data2, true, mingziOld);
        if (response2?.code === 0) {
          await this.getXinghaos();
        }
      }
    }
  }

  async copyXinghao(xinghao: XinghaoData) {
    const from = xinghao.mingzi;
    if (!(await this.message.confirm(`确定复制选中${from}吗？`))) {
      return;
    }
    const names = this.xinghaos.map((v) => v.mingzi);
    const to = getCopyName(names, from);
    const success = await this.http.getData<boolean>("shuju/api/copyXinghao", {from, to}, {spinner: false});
    if (success) {
      await this.getXinghaos();
    }
  }

  async removeXinghao(xinghao: XinghaoData) {
    const name = xinghao.mingzi;
    if (!(await this.message.confirm("删除不可恢复，请慎重操作"))) {
      return;
    }
    const success = await this.http.getData<boolean>("shuju/api/removeXinghao", {name});
    if (success) {
      await this.getXinghaos();
    }
  }

  refresh() {
    window.location.reload();
  }

  async back() {
    switch (this.step) {
      case 1:
        this.wmm.postMessage("back");
        break;
      case 2:
        this.setStep(1, {});
        break;
      case 3:
        if (!environment.production || (await this.message.confirm("确定返回吗？"))) {
          this.setStep(2, {xinghaoName: this.xinghaoName});
        }
        break;
    }
  }

  async setStep<T extends LurushujuIndexStep>(step: T, stepInfo: LurushujuIndexStepInfo[T]) {
    this.step = step;
    const stepInfo2: ObjectOf<any> = {...stepInfo};
    for (const key of ["xinghaoName", "fenleiName", "gongyiName"]) {
      if (!(key in stepInfo2)) {
        stepInfo2[key] = "";
      }
    }
    Object.assign(this, stepInfo2);
    session.save(this.stepDataKey, [step, stepInfo]);
    await this.setStep1();
    await this.setStep2();
    await this.setStep3();
  }

  async getDataIfNotFetched(key: string, fn: () => Promise<any>) {
    if (!this._isDataFetched[key]) {
      await fn();
      this._isDataFetched[key] = true;
    }
  }

  async getXinghaosIfNotFetched() {
    await this.getDataIfNotFetched("xinghaos", async () => {
      await this.getXinghaos();
    });
  }

  async getXinghaoOptionsAllIfNotFetched() {
    await this.getDataIfNotFetched("xinghaoOptionsAll", async () => {
      const optionsAll = await this.http.getData<OptionsAll>("shuju/api/getXinghaoOption");
      this.xinghaoOptionsAll = optionsAll || {};
    });
  }

  async getGongyiOptionsAllIfNotFetched() {
    await this.getDataIfNotFetched("gongyiOptionsAll", async () => {
      const optionsAll = await this.http.getData<OptionsAll>("shuju/api/getGongyizuofaOption");
      this.gongyiOptionsAll = optionsAll || {};
    });
  }

  async getMenjiaoOptionsAllIfNotFetched() {
    await this.getDataIfNotFetched("menjiaoOptionsAll", async () => {
      const optionsAll = await this.http.getData<OptionsAll2>("shuju/api/getMenjiaoOptions");
      this.menjiaoOptionsAll = optionsAll || {};
    });
  }

  async geVarNamesAllIfNotFetched() {
    await this.getDataIfNotFetched("varNames", async () => {
      const varNames = await this.http.getData<typeof this.varNames>("shuju/api/getVarNames");
      this.varNames = varNames || undefined;
    });
  }

  async getBancaiListIfNotFetched() {
    await this.getDataIfNotFetched("bancaiList", async () => {
      const bancaiList = await this.http.getBancaiList(6);
      this.bancaiList = bancaiList || undefined;
    });
  }

  async setStep1() {
    const step = 1;
    if (this.step !== step) {
      return;
    }
    await Promise.all([this.getXinghaosIfNotFetched(), this.getXinghaoOptionsAllIfNotFetched()]);
  }

  async setStep2() {
    const step = 2;
    if (this.step !== step) {
      this.xinghaoInputInfos = [];
      return;
    }
    this.xinghaoInputInfos = [];
    await Promise.all([this.getXinghaosIfNotFetched(), this.getXinghaoOptionsAllIfNotFetched()]);
    if (!this.xinghao) {
      await this.getXinghao();
    }
    if (!this.xinghao) {
      return;
    }
    const {xinghao} = this;
    const onChange = debounce(async (data: Partial<Xinghao>) => {
      await this.setXinghao(data);
    }, 500);
    this.xinghaoInputInfos = [
      {
        type: "select",
        label: "所属门窗",
        model: {data: xinghao, key: "所属门窗"},
        options: this.getOptions("门窗"),
        multiple: false,
        onChange: (val) => onChange({所属门窗: val}),
        style: {width: "150px"}
      },
      {
        type: "select",
        label: "所属工艺",
        model: {data: xinghao, key: "所属工艺"},
        options: this.getOptions("工艺"),
        multiple: false,
        onChange: (val) => onChange({所属工艺: val}),
        style: {width: "200px"}
      },
      {
        type: "select",
        label: "产品分类",
        model: {data: xinghao, key: "显示产品分类"},
        options: this.getOptions("产品分类"),
        multiple: true,
        onChange: (val) => {
          const data: Partial<Xinghao> = {显示产品分类: val};
          let updateFenlei = false;
          for (const name of val) {
            if (this.xinghao && !Array.isArray(this.xinghao.产品分类[name])) {
              this.xinghao.产品分类[name] = [];
              updateFenlei = true;
            }
          }
          if (updateFenlei) {
            data.产品分类 = this.xinghao?.产品分类;
          }
          onChange(data);
        },
        style: {width: "200px"}
      },
      {
        type: "select",
        label: "订单流程",
        model: {data: xinghao, key: "订单流程"},
        options: this.getOptions("订单流程"),
        multiple: false,
        onChange: (val) => onChange({订单流程: val})
      }
    ];
    await this.updateXinghao(xinghao?.产品分类);
  }

  async setStep3() {
    const step = 3;
    if (this.step !== step) {
      return;
    }
    if (!this.production) {
      const tabName = session.load<string>(this.tabNameKey);
      this.openTab(tabName || "");
    }
    await Promise.all([
      this.getXinghaosIfNotFetched(),
      this.getXinghaoOptionsAllIfNotFetched(),
      this.getGongyiOptionsAllIfNotFetched(),
      this.getMenjiaoOptionsAllIfNotFetched(),
      this.geVarNamesAllIfNotFetched(),
      this.getBancaiListIfNotFetched()
    ]);
    if (!this.xinghao) {
      await this.getXinghao();
    }
    if (!this.xinghao) {
      return;
    }
    this.menshans = await this.http.queryMySql<(typeof this.menshans)[number]>({
      table: "p_menshan",
      fields: ["vid", "mingzi", "zuchenghuajian"]
    });
    let gongyi = this.xinghao.产品分类[this.fenleiName].find((v) => v.名字 === this.gongyiName);
    if (!gongyi) {
      this.gongyi = null;
      return;
    }
    gongyi = getGongyi(gongyi);
    this.gongyi = gongyi;
    this.xuanxiangTable.data = [...gongyi.选项数据];
    this.shuruTable.data = [...gongyi.输入数据];
    this.menjiaoTable.data = gongyi.算料数据;

    await this.updateHuajians();
  }

  getOptions(key: string) {
    const {xinghaoOptionsAll} = this;
    return getOptions(xinghaoOptionsAll, key, (option) => {
      if (key === "产品分类") {
        option.disabled = this.defaultFenleis.includes(option.value);
      }
    });
  }

  openTab(name: string) {
    const tabs = this.tabGroup?._tabs.toArray();
    let tabIndex: number;
    if (tabs) {
      tabIndex = tabs.findIndex((v) => v.textLabel === name);
    } else {
      tabIndex = this.tabs.filter((v) => !v.hidden).findIndex((v) => v.name === name);
    }
    if (tabIndex >= 0) {
      this.tabIndex = tabIndex;
    } else if (name) {
      this.message.error("未找到对应的标签页：" + name);
    }
  }

  onSelectedTabChange({index, tab}: MatTabChangeEvent) {
    const tabName = tab.textLabel;
    if (tabName) {
      session.save(this.tabNameKey, tabName);
    }
    this.tabIndexPrev = index;
  }

  async setXinghao(data: Partial<Xinghao>, silent?: boolean, name = this.xinghao?.名字) {
    return await this.http.post("shuju/api/setXinghao", {名字: name, data, silent}, {spinner: false});
  }

  async updateXinghao(产品分类?: Xinghao["产品分类"]) {
    if (!this.xinghao) {
      return;
    }
    if (产品分类) {
      this.xinghao.产品分类 = 产品分类;
    }
    const fenleisBefore = cloneDeep(this.xinghao.产品分类);
    const allFenleis = this.xinghaoOptionsAll.产品分类.map((v) => v.name);
    updateXinghaoFenleis(this.xinghao, allFenleis, this.defaultFenleis);
    const fenleisAfter = this.xinghao.产品分类;
    if (!isEqual(fenleisBefore, fenleisAfter)) {
      await this.setXinghao({产品分类: fenleisAfter}, true);
    }
  }

  async addGongyi(产品分类: string) {
    if (!this.xinghao) {
      return;
    }
    const names = this.xinghao.产品分类[产品分类].map((gongyi) => gongyi.名字);
    const 名字 = await this.message.prompt({
      type: "string",
      label: "新建工艺做法",
      validators: (control) => {
        const value = control.value;
        if (!value) {
          return {名字不能为空: true};
        }
        if (names.includes(value)) {
          return {名字已存在: true};
        }
        return null;
      }
    });
    if (!名字) {
      return;
    }
    const 型号 = this.xinghao.名字;
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/addGongyi", {名字, 型号, 产品分类});
    await this.updateXinghao(xinghaoRaw?.产品分类);
  }

  async removeGongyi(产品分类: string, 名字: string) {
    if (!this.xinghao || !(await this.message.confirm("确定删除选中的工艺做法吗？"))) {
      return;
    }
    const 型号 = this.xinghao.名字;
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/removeGongyi", {名字, 型号, 产品分类});
    await this.updateXinghao(xinghaoRaw?.产品分类);
  }

  async copyGongyi(产品分类: string, 名字: string) {
    if (!this.xinghao) {
      return;
    }
    const names = this.xinghao.产品分类[产品分类].map((gongyi) => gongyi.名字);
    let 复制名字 = await this.message.prompt({
      type: "string",
      label: "复制工艺做法",
      hint: "若留空则自动生成名字",
      validators: (control) => {
        const value = control.value;
        if (names.includes(value)) {
          return {名字已存在: true};
        }
        if (value === 名字) {
          return {不能与原名字相同: true};
        }
        return null;
      }
    });
    if (复制名字 === null) {
      return;
    }
    if (!复制名字) {
      复制名字 = getCopyName(names, 名字);
    }
    const 型号 = this.xinghao.名字;
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/copyGongyi", {名字, 复制名字, 型号, 产品分类});
    await this.updateXinghao(xinghaoRaw?.产品分类);
  }

  async editGongyi(产品分类: string, 名字: string) {
    if (!this.xinghao) {
      return;
    }
    const data0 = this.xinghao.产品分类[产品分类].find((gongyi) => gongyi.名字 === 名字);
    if (!data0) {
      return;
    }
    const data = cloneDeep(data0);
    const form: InputInfo<Partial<工艺做法>>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "image",
        label: "图片",
        value: data.图片,
        prefix: filePathUrl,
        onChange: async (val) => {
          const result = await this.http.uploadImage(val);
          if (result?.url) {
            form[1].value = result.url;
            data.图片 = result.url;
          }
        }
      },
      {type: "boolean", label: "停用", model: {data, key: "停用"}},
      {type: "boolean", label: "录入完成", model: {data, key: "录入完成"}},
      {type: "boolean", label: "默认值", model: {data, key: "默认值"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      Object.assign(data0, result);
      const updateDatas: ObjectOf<typeof result> = {[名字]: result};
      if (result.默认值) {
        for (const gongyi of this.xinghao.产品分类[产品分类]) {
          if (gongyi.名字 !== 名字) {
            gongyi.默认值 = false;
            updateDatas[gongyi.名字] = {默认值: false};
          }
        }
      }
      const 型号 = this.xinghao.名字;
      await this.http.post("shuju/api/editGongyi", {型号, 产品分类, updateDatas});
    }
  }

  editGongyi2(fenleiName: string, gongyiName: string) {
    this.setStep(3, {xinghaoName: this.xinghaoName, fenleiName, gongyiName});
  }

  async copyGongyi2() {
    const {xinghao, xinghaos} = this;
    if (!xinghao) {
      return;
    }
    const result = await openSelectGongyiDialog(this.dialog, {
      data: {xinghaos, xinghaoOptions: this.xinghaoOptionsAll, excludeXinghaos: [xinghao.名字], multiple: true}
    });
    if (!result) {
      return;
    }
    const targetFenlei = await this.message.prompt<string>({
      type: "select",
      label: "复制到哪个分类",
      options: xinghao.显示产品分类,
      hint: "若留空则复制到对应分类"
    });
    if (targetFenlei === null) {
      return;
    }
    let successCount = 0;
    const 型号2 = xinghao.名字;
    const gongyiNames: ObjectOf<string[]> = {};
    for (const item of result.items) {
      const {型号, 产品分类, 名字} = item;
      const 产品分类2 = targetFenlei || 产品分类;
      if (!gongyiNames[产品分类2]) {
        gongyiNames[产品分类2] = xinghao.产品分类[产品分类2].map((v) => v.名字);
      }
      const 复制名字 = getCopyName(gongyiNames[产品分类2], item.名字);
      const success = await this.http.getData<boolean>("shuju/api/copyGongyi", {名字, 复制名字, 型号, 型号2, 产品分类, 产品分类2});
      if (success) {
        gongyiNames[产品分类2].push(复制名字);
        successCount++;
      }
    }
    if (successCount > 0) {
      await this.getXinghao();
    }
  }

  getFilepathUrl(url: string) {
    return getFilepathUrl(url);
  }

  getBooleanStr(value: boolean) {
    return getBooleanStr(value);
  }

  async submitGongyi(fields: (keyof 工艺做法)[]) {
    const {xinghaoName: 型号, fenleiName: 产品分类, gongyiName: 名字} = this;
    const data: Partial<工艺做法> = {};
    if (!this.gongyi || !Array.isArray(fields) || fields.length === 0) {
      return;
    }
    for (const field of fields) {
      data[field] = this.gongyi[field] as any;
    }
    const response = await this.http.post("shuju/api/editGongyi", {型号, 产品分类, updateDatas: {[名字]: data}}, {spinner: false});
    if (response?.code === 0 && this.xinghao) {
      const item = this.xinghao.产品分类[产品分类].find((v) => v.名字 === 名字);
      if (item) {
        Object.assign(item, data);
      }
    }
  }

  async getXuanxiangItem(data0?: 选项) {
    const data: 选项 = {名字: "", 可选项: [], ...data0};
    const names = this.xuanxiangTable.data.map((v) => v.名字);
    const form: InputInfo<typeof data>[] = [
      {
        type: "select",
        label: "名字",
        model: {data, key: "名字"},
        disabled: !!data0,
        options: Object.keys(this.gongyiOptionsAll).map<InputInfoOption>((v) => {
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
    const result = await this.message.form(form);
    return result ? data : null;
  }

  async onXuanxiangToolbar(event: ToolbarButtonEvent) {
    if (!this.gongyi) {
      return;
    }
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getXuanxiangItem();
          if (item) {
            this.gongyi.选项数据.push(item);
            this.xuanxiangTable.data = [...this.gongyi.选项数据];
            await this.submitGongyi(["选项数据"]);
          }
        }
        break;
    }
  }

  async onXuanxiangRow(event: RowButtonEvent<XuanxiangTableData>) {
    if (!this.gongyi) {
      return;
    }
    const {button, item, rowIdx} = event;
    switch (button.event) {
      case "编辑":
        {
          const item2 = this.gongyi.选项数据[rowIdx];
          const item3 = await this.getXuanxiangItem(item2);
          if (item3) {
            this.gongyi.选项数据[rowIdx] = item3;
            this.xuanxiangTable.data = [...this.gongyi.选项数据];
            await this.submitGongyi(["选项数据"]);
          }
        }
        break;
      case "清空数据":
        if (await this.message.confirm(`确定清空【${item.名字}】的数据吗？`)) {
          const item2 = this.gongyi.选项数据[rowIdx];
          item2.可选项 = [];
          this.xuanxiangTable.data = [...this.gongyi.选项数据];
          await this.submitGongyi(["选项数据"]);
        }
        break;
    }
  }

  async getShuruItem(data0?: 输入) {
    const data: 输入 = {名字: "", 默认值: "", 取值范围: "", 可以修改: true, ...data0};
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "名字"},
        validators: [
          Validators.required,
          (control) => {
            const value = control.value;
            if ((!data0 || data0.名字 !== value) && this.gongyi?.输入数据.some((v) => v.名字 === value)) {
              return {名字已存在: true};
            }
            return null;
          }
        ]
      },
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
      {type: "boolean", label: "可以修改", model: {data, key: "可以修改"}}
    ];
    return await this.message.form<typeof data>(form);
  }

  async onShuruToolbar(event: ToolbarButtonEvent) {
    if (!this.gongyi) {
      return;
    }
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getShuruItem();
          if (item) {
            this.gongyi.输入数据.push(item);
            this.shuruTable.data = [...this.gongyi.输入数据];
            await this.submitGongyi(["输入数据"]);
          }
        }
        break;
    }
  }

  async onShuruRow(event: RowButtonEvent<ShuruTableData>) {
    if (!this.gongyi) {
      return;
    }
    const {button, item, rowIdx} = event;
    switch (button.event) {
      case "编辑":
        {
          const item2 = this.gongyi.输入数据[rowIdx];
          const item3 = await this.getShuruItem(item2);
          if (item3) {
            this.gongyi.输入数据[rowIdx] = item3;
            this.shuruTable.data = [...this.gongyi.输入数据];
            await this.submitGongyi(["输入数据"]);
          }
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          this.gongyi.输入数据.splice(rowIdx, 1);
          this.shuruTable.data = [...this.gongyi.输入数据];
          await this.submitGongyi(["输入数据"]);
        }
        break;
    }
  }

  getMenjiaoId() {
    const numVids = this.gongyi?.算料数据.map((v) => Number(v.vid)).filter((v) => !isNaN(v)) || [];
    if (numVids.length > 0) {
      const numMax = Math.max(...numVids);
      return String(numMax + 1);
    } else {
      return "1";
    }
  }

  async getMenjiaoItem(onSubmit: NonNullable<MenjiaoInput["onSubmit"]>, data0?: 算料数据) {
    await openMenjiaoDialog(this.dialog, {
      data: {
        data: data0,
        component: this,
        onSubmit
      }
    });
  }

  async onMenjiaoToolbar(event: ToolbarButtonEvent) {
    const {gongyi, xinghaos} = this;
    if (!gongyi) {
      return;
    }
    switch (event.button.event) {
      case "添加":
        {
          await this.getMenjiaoItem(async (result) => {
            const item = result.data;
            if (item) {
              if (item.默认值) {
                for (const item2 of gongyi.算料数据) {
                  item2.默认值 = false;
                }
              }
              gongyi.算料数据.push(item);
              this.menjiaoTable.data = [...gongyi.算料数据];
              await this.submitGongyi(["算料数据"]);
            }
          });
        }
        break;
      case "从其它做法选择":
        {
          const result = await openSelectGongyiDialog(this.dialog, {
            data: {
              xinghaos,
              xinghaoOptions: this.xinghaoOptionsAll,
              menjiaoOptions: this.menjiaoOptionsAll,
              excludeXinghaos: [this.xinghaoName],
              excludeGongyis: [gongyi.名字],
              key: "算料数据",
              multiple: true,
              fenlei: this.fenleiName
            }
          });
          if (result && result.items.length > 0) {
            const names = gongyi.算料数据.map((v) => v.名字);
            for (const item of result.items) {
              const item2 = item.data as 算料数据;
              item2.vid = this.getMenjiaoId();
              item2.名字 = getCopyName(names, item2.名字);
              updateMenjiaoForm(item2);
              gongyi.算料数据.push(item2);
              names.push(item2.名字);
            }
            this.menjiaoTable.data = [...gongyi.算料数据];
            await this.submitGongyi(["算料数据"]);
          }
        }
        break;
    }
  }

  async onMenjiaoRow(event: RowButtonEvent<算料数据>) {
    if (!this.gongyi) {
      return;
    }
    const {button, item, rowIdx} = event;
    switch (button.event) {
      case "编辑":
        {
          const item2 = this.gongyi.算料数据[rowIdx];
          await this.getMenjiaoItem(async (result) => {
            const item3 = result.data;
            if (item3 && this.gongyi) {
              if (item3.默认值) {
                for (const [i, item4] of this.gongyi.算料数据.entries()) {
                  if (i !== rowIdx) {
                    item4.默认值 = false;
                  }
                }
              }
              this.gongyi.算料数据[rowIdx] = item3;
              this.menjiaoTable.data = [...this.gongyi.算料数据];
              await this.submitGongyi(["算料数据"]);
            }
          }, item2);
        }
        break;
      case "复制":
        if (await this.message.confirm(`确定复制【${item.名字}】吗？`)) {
          const item2 = cloneDeep(item);
          item2.vid = this.getMenjiaoId();
          const names = this.gongyi.算料数据.map((v) => v.名字);
          item2.名字 = getCopyName(names, item2.名字);
          updateMenjiaoForm(item2);
          this.gongyi.算料数据.push(item2);
          this.menjiaoTable.data = [...this.gongyi.算料数据];
          await this.submitGongyi(["算料数据"]);
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          this.gongyi.算料数据.splice(rowIdx, 1);
          this.menjiaoTable.data = [...this.gongyi.算料数据];
          await this.submitGongyi(["算料数据"]);
        }
        break;
    }
  }

  getHuajianIds(menshans: typeof this.menshans) {
    const huajianIds = new Set<number>();
    for (const optionRaw of menshans) {
      if (typeof optionRaw.zuchenghuajian === "string") {
        for (const v of optionRaw.zuchenghuajian.split("*")) {
          if (v) {
            huajianIds.add(Number(v));
          }
        }
      }
    }
    return huajianIds;
  }

  async updateHuajians() {
    const huajianIds = this.getHuajianIds(this.menshans);
    if (huajianIds.size > 0) {
      this.huajians = await this.http.queryMySql<MrbcjfzHuajian>({
        table: "p_huajian",
        fields: ["vid", "mingzi", "xiaotu"],
        filter: {where_in: {vid: Array.from(huajianIds)}}
      });
    } else {
      this.huajians = [];
    }
  }

  filterHuajians(data: 算料数据2) {
    const xiaoguotuValues = new Set<string>();
    for (const key of xiaoguotuKeys) {
      const value = data[key];
      if (typeof value === "string" && value) {
        xiaoguotuValues.add(value);
      }
    }
    const menshans = this.menshans.filter((v) => xiaoguotuValues.has(v.mingzi));
    const huajianIds = this.getHuajianIds(menshans);
    return this.huajians.filter((v) => huajianIds.has(v.vid));
  }

  async purgeXinghaos() {
    const data = {name: "", regex: true};
    const result = await this.message.form<typeof data>({
      title: "清除多余型号数据",
      inputs: [
        {
          type: "string",
          label: "型号名字",
          hint: "若留空则清除所有多余数据",
          model: {data, key: "name"}
        },
        {type: "boolean", label: "正则匹配", model: {data, key: "regex"}}
      ]
    });
    if (!result) {
      return;
    }
    const filter: ObjectOf<any> = {};
    if (data.regex) {
      filter.名字 = {$regex: data.name};
    } else {
      filter.名字 = data.name;
    }
    await this.http.post("shuju/api/purgeXinghaos", {filter});
  }
}
