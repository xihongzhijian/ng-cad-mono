import {Component, HostBinding, OnInit, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTabChangeEvent, MatTabGroup, MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, getBooleanStr, getCopyName, getFilepathUrl, session, setGlobal} from "@app/app.common";
import {CadListInput} from "@components/dialogs/cad-list/cad-list.types";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {environment} from "@env";
import {CadData, CadViewerConfig} from "@lucilor/cad-viewer";
import {ObjectOf, queryString, RequiredKeys, WindowMessageManager} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiListData, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoGroup, InputInfoOption, InputInfoOptions, InputInfoSelect} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MrbcjfzHuajian} from "@views/mrbcjfz/mrbcjfz.types";
import csstype from "csstype";
import {cloneDeep, debounce, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {openSelectGongyiDialog} from "../select-gongyi-dialog/select-gongyi-dialog.component";
import {openSuanliaoDataDialog} from "../suanliao-data-dialog/suanliao-data-dialog.component";
import {SuanliaoDataInput} from "../suanliao-data-dialog/suanliao-data-dialog.type";
import {
  getGongyi,
  getXinghao,
  get门铰锁边铰边2,
  menjiaoCadTypes,
  updateXinghaoFenleis,
  xiaoguotuKeys,
  Xinghao,
  XinghaoRaw,
  企料组合,
  工艺做法,
  输入,
  选项,
  配合框组合,
  门缝配置,
  门缝配置输入,
  门铰锁边铰边,
  门铰锁边铰边2,
  门铰锁边铰边2Keys
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
import {
  autoFillMenjiao,
  getCadSearch,
  getMenjiaoCadInfos,
  getMenjiaoTable,
  getOptionInputInfo,
  getOptions,
  getShuruTable,
  getXuanxiangTable,
  updateMenjiaoForm
} from "./lurushuju-index.utils";

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
  tabs: {name: string; hidden?: boolean}[] = [{name: "门铰锁边铰边"}, {name: "下单选项输入配置"}];
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
  cadViewerConfig: Partial<CadViewerConfig> = {width: 200, height: 100, lineGongshi: 20};
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
      this.enterXinghao(xinghao);
      this.getXinghaos();
    }
  }

  enterXinghao(xinghao: XinghaoData) {
    this.xinghao = null;
    this.setStep(2, {xinghaoName: xinghao.mingzi});
  }

  async editXinghao(xinghao: XinghaoData) {
    const data = cloneDeep(xinghao);
    const form: InputInfo<Partial<XinghaoData>>[] = [
      {type: "string", label: "名字", model: {data, key: "mingzi"}, validators: Validators.required},
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
      {type: "number", label: "排序", model: {data, key: "paixu"}},
      {type: "boolean", label: "停用", model: {data, key: "tingyong"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      const response = await this.http.post("shuju/api/editXinghao", {data: {...xinghao, ...data}});
      if (response?.code === 0) {
        await this.getXinghaos();
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
        if ((await this.checkBcfz()) && (await this.message.confirm("确定返回吗？"))) {
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
    await this.getXinghaosIfNotFetched();
  }

  async setStep2() {
    const step = 2;
    if (this.step !== step) {
      this.xinghaoInputInfos = [];
      return;
    }
    this.xinghaoInputInfos = [];
    if (!this.xinghao) {
      await this.getXinghao();
    }
    if (!this.xinghao) {
      return;
    }
    await Promise.all([this.getXinghaosIfNotFetched(), this.getXinghaoOptionsAllIfNotFetched()]);
    const {xinghao, xinghaoOptionsAll} = this;
    const getOptions2 = (key: string) => {
      return getOptions(xinghaoOptionsAll, key, (option) => {
        if (key === "产品分类") {
          option.disabled = this.defaultFenleis.includes(option.value);
        }
      });
    };
    const onChange = debounce(async (data: Partial<Xinghao>) => {
      await this.setXinghao(data);
    }, 500);
    this.xinghaoInputInfos = [
      {
        type: "select",
        label: "所属门窗",
        model: {data: xinghao, key: "所属门窗"},
        options: getOptions2("门窗"),
        multiple: false,
        onChange: (val) => onChange({所属门窗: val}),
        style: {width: "150px"}
      },
      {
        type: "select",
        label: "所属工艺",
        model: {data: xinghao, key: "所属工艺"},
        options: getOptions2("工艺"),
        multiple: true,
        onChange: (val) => onChange({所属工艺: val}),
        style: {width: "200px"}
      },
      {
        type: "select",
        label: "产品分类",
        model: {data: xinghao, key: "显示产品分类"},
        options: getOptions2("产品分类"),
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
    if (!this.xinghao) {
      await this.getXinghao();
    }
    if (!this.xinghao) {
      return;
    }
    await Promise.all([
      this.getXinghaosIfNotFetched(),
      this.getXinghaoOptionsAllIfNotFetched(),
      this.getGongyiOptionsAllIfNotFetched(),
      this.getMenjiaoOptionsAllIfNotFetched(),
      this.geVarNamesAllIfNotFetched(),
      this.getBancaiListIfNotFetched()
    ]);
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
    this.menjiaoTable.data = gongyi.门铰锁边铰边;

    await this.updateHuajians();
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

  async checkBcfz() {
    // const {mrbcjfz, gongyi} = this;
    // if (mrbcjfz && gongyi) {
    //   const errorMsg = mrbcjfz.checkSubmit() || [];
    //   if (errorMsg.length > 0) {
    //     this.openTab("板材分组");
    //     await this.message.error(errorMsg.join("\n"));
    //     return false;
    //   }
    //   const 板材分组 = this.getBcfzSubmitData(mrbcjfz.xinghao);
    //   if (!isEqual(板材分组, gongyi.板材分组)) {
    //     const yes = await this.message.confirm("板材分组已修改，是否提交？");
    //     if (yes) {
    //       mrbcjfz.submit();
    //     }
    //   }
    // }
    return true;
  }

  onSelectedTabChange({index, tab}: MatTabChangeEvent) {
    const tabName = tab.textLabel;
    if (tabName) {
      session.save(this.tabNameKey, tabName);
    }
    this.tabIndexPrev = index;
  }

  async setXinghao(data: Partial<Xinghao>, silent?: boolean) {
    const name = this.xinghao?.名字;
    await this.http.post("shuju/api/setXinghao", {名字: name, data, silent}, {spinner: false});
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
    if (result) {
      let successCount = 0;
      const 型号2 = xinghao.名字;
      const gongyiNames: ObjectOf<string[]> = {};
      for (const item of result.items) {
        const {型号, 产品分类, 名字} = item;
        if (!gongyiNames[产品分类]) {
          gongyiNames[产品分类] = xinghao.产品分类[产品分类].map((v) => v.名字);
        }
        const 复制名字 = getCopyName(gongyiNames[产品分类], item.名字);
        const success = await this.http.getData<boolean>("shuju/api/copyGongyi", {名字, 复制名字, 型号, 型号2, 产品分类});
        if (success) {
          gongyiNames[产品分类].push(复制名字);
          successCount++;
        }
      }
      if (successCount > 0) {
        await this.getXinghao();
      }
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
        options: Object.keys(this.gongyiOptionsAll).map<InputInfoOption>((v) => {
          return {value: v, disabled: names.includes(v)};
        }),
        validators: Validators.required,
        onChange: () => {
          if (Array.isArray(form[1].value)) {
            form[1].value.length = 0;
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
    return await this.message.form(form);
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
    return await this.message.form(form);
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
    const numVids = this.gongyi?.门铰锁边铰边.map((v) => Number(v.vid)).filter((v) => !isNaN(v)) || [];
    if (numVids.length > 0) {
      const numMax = Math.max(...numVids);
      return String(numMax + 1);
    } else {
      return "1";
    }
  }

  async getMenjiaoItem(data0?: 门铰锁边铰边) {
    const 产品分类 = data0 ? data0.产品分类 : this.fenleiName;
    const data: 门铰锁边铰边 = {
      vid: "",
      停用: false,
      排序: 0,
      默认值: false,
      名字: "",
      名字2: "",
      产品分类,
      开启: [],
      门铰: [],
      门扇厚度: [],
      锁边: "",
      铰边: "",
      选项默认值: {},
      "包边在外+外开": get门铰锁边铰边2(),
      "包边在外+内开": get门铰锁边铰边2(),
      "包边在内+外开": get门铰锁边铰边2(),
      "包边在内+内开": get门铰锁边铰边2(),
      门缝配置: {},
      关闭碰撞检查: false,
      双开门扇宽生成方式: "",
      ...data0
    };
    if (!data.vid) {
      data.vid = this.getMenjiaoId();
    }
    for (const value of 门缝配置输入) {
      if (typeof value.defaultValue === "number") {
        data.门缝配置[value.name] = 0;
      }
    }
    for (const key1 of menjiaoCadTypes) {
      if (!data[key1]) {
        data[key1] = get门铰锁边铰边2();
      }
      for (const key2 of 门铰锁边铰边2Keys) {
        if (!data[key1][key2]) {
          data[key1][key2] = {};
        }
        for (const name of 配合框组合) {
          if (!data[key1].配合框CAD[name]) {
            data[key1].配合框CAD[name] = {};
          }
        }
        for (const name of 企料组合[产品分类] || []) {
          if (!data[key1].企料CAD[name]) {
            data[key1].企料CAD[name] = {};
          }
        }
      }
    }
    updateMenjiaoForm(data);
    const getGroupStyle = (style?: csstype.Properties): csstype.Properties => {
      return {display: "flex", flexWrap: "wrap", marginBottom: "10px", ...style};
    };
    const getInfoStyle = (n: number, style?: csstype.Properties): csstype.Properties => {
      const percent = 100 / n;
      const margin = 5;
      return {width: `calc(${percent}% - ${margin * 2}px)`, margin: `${margin}px`, ...style};
    };
    const getOptionInputInfo2 = (key: keyof 门铰锁边铰边, n: number): InputInfoSelect => {
      return getOptionInputInfo(this.menjiaoOptionsAll, key, (info) => {
        info.model = {data, key};
        info.validators = Validators.required;
        info.onChange = () => {
          updateMenjiaoForm(data);
        };
        info.style = getInfoStyle(n);
        const dialogKeys: (keyof 门铰锁边铰边)[] = ["锁边", "铰边"];
        if (dialogKeys.includes(key)) {
          info.optionsDialog = {
            noImage: true,
            defaultValue: {value: data.选项默认值[key] || ""},
            onChange(val) {
              if (info.multiple) {
                data.选项默认值[key] = val.defaultValue || "";
              }
            }
          };
        }
      });
    };
    const getMenfengInputInfo = (value: (typeof 门缝配置输入)[number]): InputInfo => {
      return {
        type: "number",
        label: value.name,
        model: {data: data.门缝配置, key: value.name},
        validators: Validators.required,
        style: getInfoStyle(4)
      };
    };
    const optionKeys: (keyof 门铰锁边铰边)[] = ["产品分类", "开启", "门铰", "门扇厚度", "锁边", "铰边"];
    const 使用双开门扇宽生成方式 = () => this.fenleiName === "双开";
    const 使用锁扇铰扇蓝线宽固定差值 = () => data.双开门扇宽生成方式 === "按锁扇铰扇蓝线宽固定差值等生成";
    const form1Group2: InputInfo[] = [];
    const form1Group: InputInfo[] = [
      {
        type: "group",
        label: "",
        style: getInfoStyle(2),
        groupStyle: getGroupStyle({flexDirection: "column", height: "100%"}),
        infos: [
          {
            type: "group",
            label: "选项",
            infos: optionKeys.map((v) => getOptionInputInfo2(v, 2)),
            style: {flex: "1 1 0"},
            groupStyle: getGroupStyle()
          }
        ]
      },
      {
        type: "group",
        label: "",
        infos: form1Group2,
        style: getInfoStyle(2),
        groupStyle: getGroupStyle({flexDirection: "column", marginBottom: "0"})
      }
    ];
    const form1: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "名字"},
        validators: Validators.required,
        placeholder: "下单显示，请输入有意义的名字"
      },
      {
        type: "group",
        label: "",
        infos: form1Group,
        groupStyle: getGroupStyle()
      }
    ];
    const form2: InputInfo<门缝配置>[] = [
      {
        type: "group",
        label: "门缝配置",
        infos: 门缝配置输入.map(getMenfengInputInfo),
        style: {marginBottom: "5px"},
        groupStyle: getGroupStyle({marginBottom: "0"})
      }
    ];
    const form3 = [
      {
        type: "group",
        label: "其他",
        infos: [
          {
            type: "boolean",
            label: "关闭碰撞检查",
            model: {data, key: "关闭碰撞检查"},
            style: getInfoStyle(4),
            validators: Validators.required
          },
          {
            ...getOptionInputInfo2("双开门扇宽生成方式", 4),
            onChange: () => {
              if (使用锁扇铰扇蓝线宽固定差值()) {
                form3[0].infos[2].hidden = false;
                if (!data.锁扇铰扇蓝线宽固定差值) {
                  data.锁扇铰扇蓝线宽固定差值 = 0;
                }
              } else {
                form3[0].infos[2].hidden = true;
                delete data.锁扇铰扇蓝线宽固定差值;
              }
            }
          },
          {
            type: "number",
            label: "锁扇铰扇蓝线宽固定差值",
            model: {data, key: "锁扇铰扇蓝线宽固定差值"},
            style: getInfoStyle(4)
          },
          {type: "boolean", label: "停用", model: {data, key: "停用"}, style: getInfoStyle(4)},
          {type: "number", label: "排序", model: {data, key: "排序"}, style: getInfoStyle(4)},
          {
            type: "boolean",
            label: "默认值",
            model: {data, key: "默认值"},
            style: getInfoStyle(4)
          }
        ],
        groupStyle: getGroupStyle({marginBottom: "0"})
      } as InputInfoGroup<typeof data> & RequiredKeys<InputInfoGroup, "infos">
    ] as const;
    if (!使用双开门扇宽生成方式()) {
      form3[0].infos[1].hidden = true;
      data.双开门扇宽生成方式 = "";
      form3[0].infos[2].hidden = true;
      delete data.锁扇铰扇蓝线宽固定差值;
    } else if (!使用锁扇铰扇蓝线宽固定差值()) {
      form3[0].infos[2].hidden = true;
      delete data.锁扇铰扇蓝线宽固定差值;
    }
    form1Group2.push(...form2, ...form3);
    const form4: InputInfo[] = [
      {
        type: "group",
        label: "",
        infos: menjiaoCadTypes.map<InputInfo>((key1) => {
          const infos = 门铰锁边铰边2Keys.map<InputInfo>((key2, i) => {
            const groupStyle: csstype.Properties = {};
            if (i === 门铰锁边铰边2Keys.length - 1) {
              groupStyle.marginBottom = "0";
            }
            return {
              type: "group",
              label: "",
              infos: Object.keys(data[key1][key2]).map<InputInfo>((key3) => {
                const {search, addCadData} = getCadSearch(data, key1, key2, key3);
                return {
                  type: "cad",
                  label: key3,
                  model: {data: data[key1][key2][key3], key: "cad"},
                  clearable: true,
                  openable: true,
                  config: this.cadViewerConfig,
                  params: () => ({
                    selectMode: "single",
                    collection: "cad",
                    standaloneSearch: true,
                    raw: true,
                    search,
                    addCadData
                  }),
                  style: {margin: "0 5px"}
                };
              }),
              groupStyle: getGroupStyle({...groupStyle, margin: "2px 0"})
            };
          });

          const shiyituKeys: (keyof 门铰锁边铰边2["示意图CAD"])[] = ["算料单示意图"];
          infos.push({
            type: "group",
            label: "",
            infos: shiyituKeys.map<InputInfo>((key) => {
              const params: CadListInput = {selectMode: key === "算料单示意图" ? "multiple" : "single", collection: "cad", raw: true};
              const search: ObjectOf<any> = {};
              if (key.includes("装配示意图")) {
                search.分类 = "装配示意图";
              } else {
                search.分类 = "算料单示意图";
              }
              params.search = search;
              return {
                type: "cad",
                label: key,
                params,
                model: {data: data[key1].示意图CAD, key},
                config: this.cadViewerConfig,
                clearable: true,
                openable: true,
                style: {margin: "2px 0"}
              };
            }),
            groupStyle: getGroupStyle()
          });

          if (this.parentInfo.isZhijianUser) {
            const options: InputInfoOptions = this.menshans.map((v) => v.mingzi);
            infos.push({
              type: "group",
              label: "",
              infos: xiaoguotuKeys.map<InputInfo>((key) => {
                return {
                  type: "select",
                  label: key,
                  options,
                  clearable: true,
                  model: {data: data[key1], key},
                  style: getInfoStyle(6)
                };
              }),
              groupStyle: getGroupStyle()
            });
          }

          infos.push({
            type: "button",
            label: "",
            class: "toolbar",
            buttons: [
              {
                name: "板材分组",
                color: "primary",
                onClick: async () => {
                  const morenbancai = cloneDeep(data[key1].板材分组);
                  const cads = data[key1].算料CAD.map((v) => new CadData(v.json));
                  const huajians = this.filterHuajians(data[key1]);
                  const result = await openMrbcjfzDialog(this.dialog, {
                    data: {
                      id: -1,
                      table: "",
                      inputData: {
                        xinghao: this.xinghaoName,
                        morenbancai,
                        cads,
                        huajians,
                        bancaiList: this.bancaiList,
                        isLocal: true
                      }
                    }
                  });
                  if (result) {
                    data[key1].板材分组 = result.默认板材;
                  }
                }
              },
              {
                name: "算料公式CAD配置",
                color: "primary",
                onClick: async () => {
                  const suanliaoData: SuanliaoDataInput["data"] = {
                    算料公式: data[key1].算料公式,
                    测试用例: data[key1].测试用例,
                    算料CAD: data[key1].算料CAD
                  };
                  const result = await openSuanliaoDataDialog(this.dialog, {
                    data: {
                      data: suanliaoData,
                      varNames: this.varNames,
                      copySuanliaoCadsInput: {
                        xinghaos: this.xinghaos,
                        xinghaoOptions: this.xinghaoOptionsAll,
                        excludeXinghaos: [this.xinghaoName],
                        excludeGongyis: this.gongyi?.名字 ? [this.gongyi.名字] : [],
                        key: "算料CAD",
                        fenlei: this.fenleiName
                      }
                    }
                  });
                  if (result) {
                    Object.assign(data[key1], result.data);
                  }
                }
              }
            ]
          });
          return {
            type: "group",
            label: key1,
            infos,
            validators: () => {
              const menjiaoCadInfos = getMenjiaoCadInfos(data);
              const value = data[key1];
              if (menjiaoCadInfos[key1].isEmpty) {
                const type = key1.split("+")[0];
                if (type === "包边在内") {
                  return null;
                } else {
                  for (const key11 of menjiaoCadTypes) {
                    if (key11 === key1 || !key11.startsWith(type)) {
                      continue;
                    }
                    if (!menjiaoCadInfos[key11].isEmpty) {
                      return null;
                    }
                  }
                }
              }
              const missingValues = [];
              for (const key2 of 门铰锁边铰边2Keys) {
                for (const key3 in value[key2]) {
                  if (!value[key2][key3].cad) {
                    missingValues.push(key3);
                  }
                }
              }
              if (missingValues.length > 0) {
                const error = "请选择" + missingValues.join("、");
                return {[error]: true};
              } else {
                return null;
              }
            },
            style: {margin: "5px"},
            groupStyle: getGroupStyle({flexDirection: "column"})
          };
        }),
        groupStyle: getGroupStyle({flexDirection: "column"})
      }
    ];
    const result = await this.message.form<ObjectOf<any>>(
      {
        inputs: [...form1, ...form4],
        autoFill: this.production ? undefined : () => autoFillMenjiao(data, this.menjiaoOptionsAll)
      },
      {width: "100%", height: "100%"}
    );
    if (result) {
      return data;
    }
    return null;
  }

  async onMenjiaoToolbar(event: ToolbarButtonEvent) {
    const {gongyi, xinghaos} = this;
    if (!gongyi) {
      return;
    }
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getMenjiaoItem();
          if (item) {
            if (item.默认值) {
              for (const item2 of gongyi.门铰锁边铰边) {
                item2.默认值 = false;
              }
            }
            gongyi.门铰锁边铰边.push(item);
            this.menjiaoTable.data = [...gongyi.门铰锁边铰边];
            await this.submitGongyi(["门铰锁边铰边"]);
          }
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
              key: "门铰锁边铰边",
              multiple: true,
              fenlei: this.fenleiName
            }
          });
          if (result && result.items.length > 0) {
            const names = gongyi.门铰锁边铰边.map((v) => v.名字);
            for (const item of result.items) {
              const item2 = item.data as 门铰锁边铰边;
              item2.vid = this.getMenjiaoId();
              item2.名字 = getCopyName(names, item2.名字);
              updateMenjiaoForm(item2);
              gongyi.门铰锁边铰边.push(item2);
              names.push(item2.名字);
            }
            this.menjiaoTable.data = [...gongyi.门铰锁边铰边];
            await this.submitGongyi(["门铰锁边铰边"]);
          }
        }
        break;
    }
  }

  async onMenjiaoRow(event: RowButtonEvent<门铰锁边铰边>) {
    if (!this.gongyi) {
      return;
    }
    const {button, item, rowIdx} = event;
    switch (button.event) {
      case "编辑":
        {
          const item2 = this.gongyi.门铰锁边铰边[rowIdx];
          const item3 = await this.getMenjiaoItem(item2);
          if (item3) {
            if (item3.默认值) {
              for (const [i, item4] of this.gongyi.门铰锁边铰边.entries()) {
                if (i !== rowIdx) {
                  item4.默认值 = false;
                }
              }
            }
            this.gongyi.门铰锁边铰边[rowIdx] = item3;
            this.menjiaoTable.data = [...this.gongyi.门铰锁边铰边];
            await this.submitGongyi(["门铰锁边铰边"]);
          }
        }
        break;
      case "复制":
        if (await this.message.confirm(`确定复制【${item.名字}】吗？`)) {
          const item2 = cloneDeep(item);
          item2.vid = this.getMenjiaoId();
          const names = this.gongyi.门铰锁边铰边.map((v) => v.名字);
          item2.名字 = getCopyName(names, item2.名字);
          updateMenjiaoForm(item2);
          this.gongyi.门铰锁边铰边.push(item2);
          this.menjiaoTable.data = [...this.gongyi.门铰锁边铰边];
          await this.submitGongyi(["门铰锁边铰边"]);
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          this.gongyi.门铰锁边铰边.splice(rowIdx, 1);
          this.menjiaoTable.data = [...this.gongyi.门铰锁边铰边];
          await this.submitGongyi(["门铰锁边铰边"]);
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

  filterHuajians(data: 门铰锁边铰边2) {
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
}
