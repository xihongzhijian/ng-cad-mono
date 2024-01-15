import {CommonModule} from "@angular/common";
import {Component, ElementRef, HostBinding, OnInit, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTabChangeEvent, MatTabGroup, MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, getBooleanStr, getCopyName, getFilepathUrl, session, setGlobal} from "@app/app.common";
import {CadEditorInput, openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadListInput} from "@components/dialogs/cad-list/cad-list.types";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {environment} from "@env";
import {CadData, CadLineLike, CadMtext, CadViewer} from "@lucilor/cad-viewer";
import {downloadByString, keysOf, ObjectOf, queryString, RequiredKeys, selectFiles, timeout, WindowMessageManager} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad, HoutaiCad, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoGroup, InputInfoOption, InputInfoOptions, InputInfoSelect} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MrbcjfzHuajian, MrbcjfzInputData, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import csstype from "csstype";
import {cloneDeep, debounce, isEmpty, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {v4} from "uuid";
import {
  getGongyi,
  getXinghao,
  menjiaoCadTypes,
  updateXinghaoFenleis,
  Xinghao,
  XinghaoRaw,
  企料组合,
  工艺做法,
  测试用例,
  算料公式,
  输入,
  选项,
  配合框组合,
  门缝配置,
  门缝配置输入,
  门铰锁边铰边
} from "../xinghao-data";
import {
  LurushujuIndexStep,
  LurushujuIndexStepInfo,
  OptionsAll,
  OptionsAll2,
  ShuruTableData,
  XinghaoData,
  XuanxiangFormData,
  XuanxiangTableData
} from "./lurushuju-index.types";
import {
  autoFillMenjiao,
  getCadSearch,
  getMenjiaoCadInfos,
  getMenjiaoTable,
  getShuruTable,
  getXuanxiangTable,
  updateMenjiaoForm
} from "./lurushuju-index.utils";

@Component({
  selector: "app-lurushuju-index",
  standalone: true,
  imports: [
    MrbcjfzComponent,
    CommonModule,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
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
  tabs: {name: string; hidden?: boolean}[] = [
    {name: "下单选项输入配置"},
    {name: "门铰锁边铰边"},
    {name: "算料公式CAD配置"},
    {name: "示意图CAD"},
    {name: "效果图"},
    {name: "板材分组"}
  ];
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
  shiyituInputInfos: InputInfo[] = [];
  xiaoguotuInputInfos: InputInfo[] = [];
  bcfzInputData: MrbcjfzInputData = {xinghao: "", morenbancai: {}};
  xiaoguotuKeys: (keyof 工艺做法)[] = ["锁扇正面", "锁扇背面", "小扇正面", "小扇背面", "铰扇正面", "铰扇背面"];
  menshans: (TableDataBase & {zuchenghuajian?: string})[] = [];
  huajians: MrbcjfzHuajian[] = [];
  parentInfo = {isZhijianUser: false};

  stepDataKey = "lurushujuIndexStepData";
  step: LurushujuIndexStep = 1;
  xinghaoName = "";
  fenleiName = "";
  gongyiName = "";
  production = environment.production;
  wmm = new WindowMessageManager("录入数据", this, window.parent);
  suanliaoCadViewers: CadViewer[] = [];
  @ViewChild(MrbcjfzComponent) mrbcjfz?: MrbcjfzComponent;
  @ViewChild(MatTabGroup) tabGroup?: MatTabGroup;
  @ViewChildren("suanliaoCadEl") suanliaoCadEls?: QueryList<ElementRef<HTMLDivElement>>;

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
    if (stepData) {
      await this.setStep(...stepData);
    } else {
      await this.setStep(1, {});
    }
  }

  returnZero() {
    return 0;
  }

  async updateParentInfo() {
    this.wmm.postMessage("getParentInfoStart");
    this.parentInfo = await this.wmm.waitForMessage("getParentInfoEnd");
    if (!this.parentInfo.isZhijianUser) {
      for (const tab of this.tabs) {
        if (tab.name === "效果图") {
          tab.hidden = true;
        }
      }
    }
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
    const optionsAll = await this.http.getData<OptionsAll>("shuju/api/getXinghaoOption");
    this.xinghaoOptionsAll = optionsAll || {};
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
      this.editXinghao(xinghao);
    }
  }

  editXinghao(xinghao: XinghaoData) {
    this.setStep(2, {xinghaoName: xinghao.mingzi});
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

  async setStep1() {
    if (this.step !== 1) {
      return;
    }
    await this.getXinghaos();
  }

  async setStep2() {
    if (this.step !== 2) {
      this.xinghaoInputInfos = [];
      return;
    }
    await this.getXinghao();
    const {xinghao, xinghaoOptionsAll} = this;
    const getOptions = (key: string) => {
      const options = xinghaoOptionsAll?.[key];
      if (!options) {
        return [];
      }
      return options.map(({name}) => {
        const option: InputInfoOption = {value: name};
        if (key === "产品分类") {
          option.disabled = this.defaultFenleis.includes(name);
        }
        return option;
      });
    };
    const onChange = debounce(async (data: Partial<Xinghao>) => {
      await this.setXinghao(data);
    }, 500);
    if (xinghao) {
      this.xinghaoInputInfos = [
        {
          type: "select",
          label: "所属门窗",
          model: {data: xinghao, key: "所属门窗"},
          options: getOptions("门窗"),
          multiple: false,
          onChange: (val) => onChange({所属门窗: val})
        },
        {
          type: "select",
          label: "所属工艺",
          model: {data: xinghao, key: "所属工艺"},
          options: getOptions("工艺"),
          multiple: true,
          onChange: (val) => onChange({所属工艺: val})
        },
        {
          type: "select",
          label: "产品分类",
          model: {data: xinghao, key: "显示产品分类"},
          options: getOptions("产品分类"),
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
          }
        }
      ];
    } else {
      this.xinghaoInputInfos = [];
    }
    await this.updateXinghao(xinghao?.产品分类);
  }

  async setStep3() {
    if (this.step !== 3) {
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
    let gongyi = this.xinghao.产品分类[this.fenleiName].find((v) => v.名字 === this.gongyiName);
    if (!gongyi) {
      this.gongyi = null;
      return;
    }
    gongyi = getGongyi(gongyi);
    this.gongyi = gongyi;
    const gongyiOptionsAll = await this.http.getData<OptionsAll>("shuju/api/getGongyizuofaOption");
    const menjiaoOptionsAll = await this.http.getData<OptionsAll2>("shuju/api/getMenjiaoOptions");
    this.gongyiOptionsAll = gongyiOptionsAll || {};
    this.menjiaoOptionsAll = menjiaoOptionsAll || {};
    this.xuanxiangTable.data = [...gongyi.选项数据];
    this.shuruTable.data = [...gongyi.输入数据];
    this.menjiaoTable.data = gongyi.门铰锁边铰边;
    this.shiyituInputInfos = [];
    const shiyituKeys: (keyof 工艺做法["示意图CAD"])[] = ["算料单示意图"];
    for (const key of shiyituKeys) {
      const params: CadListInput = {selectMode: key === "算料单示意图" ? "multiple" : "single", collection: "cad", raw: true};
      const search: ObjectOf<any> = {};
      if (key.includes("装配示意图")) {
        search.分类 = "装配示意图";
      } else {
        search.分类 = "算料单示意图";
      }
      params.search = search;
      this.shiyituInputInfos.push({
        type: "cad",
        label: key,
        params,
        model: {data: gongyi.示意图CAD, key},
        onChange: () => {
          this.submitGongyi(["示意图CAD"]);
        }
      });
    }

    this.xiaoguotuInputInfos = [];
    this.menshans = await this.http.queryMySql<(typeof this.menshans)[number]>({
      table: "p_menshan",
      fields: ["vid", "mingzi", "zuchenghuajian"]
    });
    const options: InputInfoOptions = this.menshans.map((v) => v.mingzi);
    for (const key of this.xiaoguotuKeys) {
      this.xiaoguotuInputInfos.push({
        type: "select",
        label: key,
        options,
        model: {data: gongyi, key},
        onChange: async () => {
          await this.updateHuajians();
          this.updateBcfzInputData();
          this.submitGongyi([key]);
        }
      });
    }
    await this.updateSuanliaoCads();
    await this.updateHuajians();
    this.updateBcfzInputData();
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
    const {mrbcjfz, gongyi} = this;
    if (mrbcjfz && gongyi) {
      const errorMsg = mrbcjfz.checkSubmit() || [];
      if (errorMsg.length > 0) {
        this.openTab("板材分组");
        await this.message.error(errorMsg.join("\n"));
        return false;
      }
      const 板材分组 = this.getBcfzSubmitData(mrbcjfz.xinghao);
      if (!isEqual(板材分组, gongyi.板材分组)) {
        const yes = await this.message.confirm("板材分组已修改，是否提交？");
        if (yes) {
          mrbcjfz.submit();
        }
      }
    }
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

  getGongyiImageUrl(url: string) {
    if (!url) {
      return "";
    }
    return getFilepathUrl(url);
  }

  getBooleanStr(value: boolean) {
    return getBooleanStr(value);
  }

  async submitGongyi(fields: (keyof 工艺做法)[], silent = false) {
    const {xinghaoName: 型号, fenleiName: 产品分类, gongyiName: 名字} = this;
    const data: Partial<工艺做法> = {};
    if (!this.gongyi || !Array.isArray(fields) || fields.length === 0) {
      return;
    }
    for (const field of fields) {
      data[field] = this.gongyi[field] as any;
    }
    await this.http.post("shuju/api/editGongyi", {型号, 产品分类, updateDatas: {[名字]: data}}, {silent});
  }

  async getXuanxiangItem(data0?: 选项) {
    const data: XuanxiangFormData = {名字: data0?.名字 || "", 可选项: [], 默认值: ""};
    const get可选项Options = (): InputInfoOptions<any> => {
      type K = InputInfoOption<XuanxiangFormData["可选项"][number]>;
      return (this.gongyiOptionsAll[data.名字] || []).map<K>((v) => {
        return {label: v.name, value: {vid: v.vid, mingzi: v.name}};
      });
    };
    const get默认值Options = (): InputInfoOptions<string> => {
      return data.可选项.map<InputInfoOption>((v) => {
        return {value: v.mingzi};
      });
    };
    const 可选项Options = get可选项Options();
    if (data0) {
      data.可选项 = 可选项Options.filter((v) => data0.可选项.some((v2) => v2.vid === v.value.vid)).map((v) => v.value);
      data.默认值 = data0.可选项.find((v) => v.morenzhi)?.mingzi || "";
    }
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
          type K = InputInfoOption<XuanxiangFormData["可选项"][number]>;
          const info = form[1] as unknown as InputInfoSelect<any, K>;
          info.options = get可选项Options();
          if (Array.isArray(info.value)) {
            info.value.length = 0;
          }
        }
      },
      {
        type: "select",
        label: "可选项",
        model: {data, key: "可选项"},
        options: 可选项Options,
        multiple: true,
        validators: Validators.required,
        onChange: () => {
          const info = form[2] as InputInfoSelect;
          const options = get默认值Options();
          info.options = options;
          if (
            !options.some((v) => {
              const value = typeof v === "string" ? v : v.value;
              return data.默认值 === value;
            })
          ) {
            info.value = "";
          }
        }
      },
      {
        type: "select",
        label: "默认值",
        model: {data, key: "默认值"},
        options: get默认值Options(),
        validators: Validators.required
      }
    ];
    const result = await this.message.form(form);
    if (result) {
      const item: 选项 = {
        名字: data.名字,
        可选项: data.可选项.map((v) => {
          const v2: 选项["可选项"][number] = {...v};
          if (v2.mingzi === data.默认值) {
            v2.morenzhi = true;
          }
          return v2;
        })
      };
      return item;
    }
    return null;
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

  async getMenjiaoItem(data0?: 门铰锁边铰边) {
    const 产品分类 = data0 ? data0.产品分类 : this.fenleiName;
    const data: 门铰锁边铰边 = {
      vid: "",
      停用: false,
      排序: 0,
      默认值: false,
      名字: "",
      产品分类,
      开启: [],
      门铰: [],
      门扇厚度: [],
      锁边: "",
      铰边: "",
      选项默认值: {},
      "包边在外+外开": {配合框CAD: {}, 企料CAD: {}},
      "包边在外+内开": {配合框CAD: {}, 企料CAD: {}},
      "包边在内+外开": {配合框CAD: {}, 企料CAD: {}},
      "包边在内+内开": {配合框CAD: {}, 企料CAD: {}},
      门缝配置: {},
      关闭碰撞检查: false,
      双开门扇宽生成方式: "",
      ...data0
    };
    if (!data.vid) {
      const numVids = this.gongyi?.门铰锁边铰边.map((v) => Number(v.vid)).filter((v) => !isNaN(v)) || [];
      if (numVids.length > 0) {
        const numMax = Math.max(...numVids);
        data.vid = String(numMax + 1);
      } else {
        data.vid = "1";
      }
    }
    for (const value of 门缝配置输入) {
      if (typeof value.defaultValue === "number") {
        data.门缝配置[value.name] = 0;
      }
    }
    for (const key1 of menjiaoCadTypes) {
      if (!data[key1]) {
        data[key1] = {配合框CAD: {}, 企料CAD: {}};
      }
      for (const key2 of keysOf(data[key1])) {
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
    const getGroupStyles = (styles?: csstype.Properties): csstype.Properties => {
      return {display: "flex", flexWrap: "wrap", marginBottom: "10px", ...styles};
    };
    const getInfoStyles = (n: number): csstype.Properties => {
      const percent = 100 / n;
      const margin = 5;
      return {width: `calc(${percent}% - ${margin * 2}px)`, margin: `${margin}px`};
    };
    const getOptionInputInfo = (key: keyof 门铰锁边铰边, n: number): InputInfoSelect => {
      const optionsInfo = this.menjiaoOptionsAll[key];
      if (!optionsInfo) {
        return {type: "select", label: key, options: []};
      }
      const options = optionsInfo.options.map<InputInfoOption>((v) => {
        return {value: v.name, img: v.img};
      });
      const {disabled, multiple} = optionsInfo;
      return {
        type: "select",
        label: key,
        model: {data, key},
        options,
        disabled,
        multiple,
        optionsDialog: {
          defaultValue: data.选项默认值[key] || "",
          onChange(val) {
            if (multiple) {
              data.选项默认值[key] = val.defaultValue || "";
            }
          }
        },
        validators: Validators.required,
        onChange: () => {
          updateMenjiaoForm(data);
        },
        styles: getInfoStyles(n)
      };
    };
    const getMenfengInputInfo = (value: (typeof 门缝配置输入)[number]): InputInfo => {
      return {
        type: "number",
        label: value.name,
        model: {data: data.门缝配置, key: value.name},
        validators: Validators.required,
        styles: getInfoStyles(4)
      };
    };
    const optionKeys: (keyof 门铰锁边铰边)[] = ["产品分类", "开启", "门铰", "门扇厚度", "锁边", "铰边"];
    const 使用双开门扇宽生成方式 = () => this.fenleiName === "双开";
    const 使用锁扇铰扇蓝线宽固定差值 = () => data.双开门扇宽生成方式 === "按锁扇铰扇蓝线宽固定差值等生成";
    const form1: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "名字"},
        readonly: true
      },
      {
        type: "group",
        label: "选项",
        styles: getGroupStyles(),
        infos: optionKeys.map((v) => getOptionInputInfo(v, 2))
      }
    ];
    const form2: InputInfo<门缝配置>[] = [
      {
        type: "group",
        label: "门缝配置",
        styles: getGroupStyles(),
        infos: 门缝配置输入.map(getMenfengInputInfo)
      }
    ];
    const form3 = [
      {
        type: "group",
        label: "其他",
        styles: getGroupStyles(),
        infos: [
          {
            type: "boolean",
            label: "关闭碰撞检查",
            model: {data, key: "关闭碰撞检查"},
            styles: getInfoStyles(3),
            validators: Validators.required
          },
          {
            ...getOptionInputInfo("双开门扇宽生成方式", 3),
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
            styles: getInfoStyles(3)
          },
          {type: "boolean", label: "停用", model: {data, key: "停用"}, styles: getInfoStyles(3)},
          {type: "number", label: "排序", model: {data, key: "排序"}, styles: getInfoStyles(3)},
          {
            type: "boolean",
            label: "默认值",
            model: {data, key: "默认值"},
            styles: getInfoStyles(3)
          }
        ]
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
    const form4: InputInfo[] = [
      {
        type: "group",
        label: " ",
        infos: menjiaoCadTypes.map((key1) => {
          const keys1 = keysOf(data[key1]);
          const infos = keys1.map<InputInfo>((key2, i) => {
            const styles: csstype.Properties = {};
            if (i === keys1.length - 1) {
              styles.marginBottom = "0";
            }
            return {
              type: "group",
              label: "",
              infos: Object.keys(data[key1][key2]).map<InputInfo>((key3) => {
                return {
                  type: "cad",
                  label: key3,
                  model: {data: data[key1][key2][key3], key: "cad"},
                  clearable: true,
                  params: () => ({
                    selectMode: "single",
                    collection: "cad",
                    standaloneSearch: true,
                    raw: true,
                    search: getCadSearch(data, key1, key2, key3)
                  }),
                  styles: {margin: "0 5px"}
                };
              }),
              styles: getGroupStyles(styles)
            };
          });
          return {
            type: "group",
            label: key1,
            infos,
            styles: getGroupStyles({width: "100%"}),
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
              for (const key2 of keysOf(value)) {
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
            }
          };
        }),
        styles: getGroupStyles({flexDirection: "column"})
      }
    ];
    const result = await this.message.form<ObjectOf<any>>(
      {
        inputs: [...form1, ...form2, ...form3, ...form4],
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
    if (!this.gongyi) {
      return;
    }
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getMenjiaoItem();
          if (item) {
            if (item.默认值) {
              for (const item2 of this.gongyi.门铰锁边铰边) {
                item2.默认值 = false;
              }
            }
            this.gongyi.门铰锁边铰边.push(item);
            this.menjiaoTable.data = [...this.gongyi.门铰锁边铰边];
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

  getGongshiExtraData() {
    return {
      选项: {
        型号: this.xinghaoName,
        产品分类: this.fenleiName,
        工艺做法: this.gongyiName
      }
    };
  }

  async getGongshiItem(data0?: 算料公式) {
    let data: 算料公式;
    if (data0) {
      data = cloneDeep(data0);
    } else {
      data = {_id: v4(), 名字: "", 条件: [], 选项: {}, 公式: {}};
    }
    const form: InputInfo<Partial<算料公式>>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "formulas",
        label: "公式",
        model: {data, key: "公式"},
        validators: () => {
          if (isEmpty(data.公式)) {
            return {公式不能为空: true};
          }
          return null;
        }
      }
    ];
    const result = await this.message.form(form);
    return result ? data : null;
  }

  async addGongshi() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const item = await this.getGongshiItem();
    if (item) {
      gongyi.算料公式.push(item);
      await this.submitGongyi(["算料公式"]);
    }
  }

  async editGongshi(index: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const item = await this.getGongshiItem(gongyi.算料公式[index]);
    if (item) {
      gongyi.算料公式[index] = item;
      await this.submitGongyi(["算料公式"]);
    }
  }

  async copyGongshi(index: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    if (!(await this.message.confirm(`确定复制【${gongyi.算料公式[index].名字}】吗？`))) {
      return;
    }
    const item = cloneDeep(gongyi.算料公式[index]);
    item._id = v4();
    const names = gongyi.算料公式.map((v) => v.名字);
    item.名字 = getCopyName(names, item.名字);
    gongyi.算料公式.push(item);
    this.submitGongyi(["算料公式"]);
  }

  async removeGongshi(index: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    if (!(await this.message.confirm(`确定删除【${gongyi.算料公式[index].名字}】吗？`))) {
      return;
    }
    gongyi.算料公式.splice(index, 1);
    this.submitGongyi(["算料公式"]);
  }

  async importGonshis() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    if (!(await this.message.confirm("导入算料公式会覆盖原有数据，确定导入吗？"))) {
      return;
    }
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      let data: any;
      try {
        data = JSON.parse(reader.result as string);
      } catch (e) {}
      if (Array.isArray(data)) {
        gongyi.算料公式 = data;
        this.submitGongyi(["算料公式"]);
      } else {
        this.message.error("算料公式数据有误");
      }
    });
    reader.readAsText(file);
  }

  exportGongshis() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    downloadByString(JSON.stringify(gongyi.算料公式), {filename: "算料公式.json"});
  }

  getTimeStr(time: number) {
    return new Date(time).toLocaleString();
  }

  async getTestCaseItem(data0?: 测试用例) {
    const data: 测试用例 = {名字: "", 时间: 0, 测试数据: {}, 测试正确: false, ...data0};
    const form: InputInfo<typeof data>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "formulas",
        label: "测试数据",
        model: {data, key: "测试数据"},
        validators: (control) => {
          if (isEmpty(control.value)) {
            return {测试数据不能为空: true};
          }
          return null;
        }
      },
      {type: "boolean", label: "测试正确", model: {data, key: "测试正确"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      result.时间 = Date.now();
    }
    return result;
  }

  async addTestCase() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const result = await this.getTestCaseItem();
    if (result) {
      gongyi.测试用例.push(result);
      await this.submitGongyi(["测试用例"]);
    }
  }

  async editTestCase(index: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const result = await this.getTestCaseItem(gongyi.测试用例[index]);
    if (result) {
      gongyi.测试用例[index] = result;
      await this.submitGongyi(["测试用例"]);
    }
  }

  async copyTestCase(index: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    if (!(await this.message.confirm(`确定复制【${gongyi.测试用例[index].名字}】吗？`))) {
      return;
    }
    const item = cloneDeep(gongyi.测试用例[index]);
    const names = gongyi.测试用例.map((v) => v.名字);
    item.名字 = getCopyName(names, item.名字);
    item.时间 = Date.now();
    gongyi.测试用例.push(item);
    await this.submitGongyi(["测试用例"]);
  }

  async removeTestCase(index: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    if (!(await this.message.confirm(`确定删除【${gongyi.测试用例[index].名字}】吗？`))) {
      return;
    }
    gongyi.测试用例.splice(index, 1);
    await this.submitGongyi(["测试用例"]);
  }

  async importTestCases() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    if (!(await this.message.confirm("导入测试用例会覆盖原有数据，确定导入吗？"))) {
      return;
    }
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      let data: any;
      try {
        data = JSON.parse(reader.result as string);
      } catch (e) {}
      if (Array.isArray(data)) {
        gongyi.测试用例 = data;
        this.submitGongyi(["测试用例"]);
      } else {
        this.message.error("测试用例数据有误");
      }
    });
    reader.readAsText(file);
  }

  exportTestCases() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    downloadByString(JSON.stringify(gongyi.测试用例), {filename: "测试用例.json"});
  }

  async selectSuanliaoCads() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const data: ZixuanpeijianInput = {
      data: {
        零散: gongyi.算料CAD.map((v) => {
          return {data: new CadData(v.json), info: {houtaiId: v._id, zhankai: [], calcZhankai: []}};
        })
      },
      step: 3,
      stepFixed: true,
      noValidateCads: true
    };
    const result = await openZixuanpeijianDialog(this.dialog, {data});
    if (!result) {
      return;
    }
    const ids = result.零散.map((v) => v.info.houtaiId);
    if (ids.length > 0) {
      const result2 = await this.http.queryMongodb<HoutaiCad>({collection: "cad", fields: {json: false}, where: {_id: {$in: ids}}});
      const result3: HoutaiCad[] = [];
      for (const v of result.零散) {
        const cad = cloneDeep(result2.find((v2) => v2._id === v.info.houtaiId));
        if (cad) {
          cad.json = v.data.export();
          result3.push(cad);
        } else {
          const cad2 = gongyi.算料CAD.find((v2) => v2.json.id === v.data.id);
          if (cad2) {
            result3.push(cad2);
          }
        }
      }
      gongyi.算料CAD = result3;
    } else {
      gongyi.算料CAD = [];
    }
    await this.updateSuanliaoCads(true);
    this.updateBcfzInputData();
  }

  suanliao() {
    this.message.alert("未实现");
  }

  async updateHuajians() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const xiaoguotuValues = new Set<string>();
    for (const key of this.xiaoguotuKeys) {
      const value = gongyi[key];
      if (typeof value === "string" && value) {
        xiaoguotuValues.add(value);
      }
    }
    const huajianIds = new Set<string>();
    for (const optionRaw of this.menshans) {
      if (xiaoguotuValues.has(optionRaw.mingzi) && typeof optionRaw.zuchenghuajian === "string") {
        for (const v of optionRaw.zuchenghuajian.split("*")) {
          if (v) {
            huajianIds.add(v);
          }
        }
      }
    }
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

  async updateSuanliaoCads(submit?: boolean) {
    await timeout(0);
    const {suanliaoCadEls, suanliaoCadViewers} = this;
    for (const viewer of suanliaoCadViewers) {
      viewer.destroy();
    }
    suanliaoCadViewers.length = 0;
    if (suanliaoCadEls) {
      suanliaoCadEls.forEach((el, i) => {
        const cadContainer = el.nativeElement.querySelector<HTMLDivElement>(".cad-container");
        if (!cadContainer) {
          return;
        }
        cadContainer.innerHTML = "";
        const cad = this.gongyi?.算料CAD[i];
        if (!cad) {
          return;
        }
        const cadViewer = new CadViewer(new CadData(cad?.json), {
          width: 300,
          height: 150,
          backgroundColor: "black",
          enableZoom: false,
          dragAxis: "",
          selectMode: "single",
          entityDraggable: false,
          lineGongshi: 12
        });
        cadViewer.dom.removeAllListeners?.("wheel");
        cadViewer.on("entitydblclick", async (_, entity) => {
          if (entity instanceof CadMtext && entity.parent) {
            entity = entity.parent;
          }
          if (!(entity instanceof CadLineLike)) {
            return;
          }
          const form: InputInfo<typeof entity>[] = [
            {type: "string", label: "名字", model: {data: entity, key: "mingzi"}},
            {type: "string", label: "公式", model: {data: entity, key: "gongshi"}}
          ];
          const result = await this.message.form(form);
          if (result) {
            cad.json = cadViewer.data.export();
            await this.updateSuanliaoCads(true);
          }
        });
        cadViewer.appendTo(cadContainer);
        setTimeout(() => {
          cadViewer.center();
        }, 0);
        suanliaoCadViewers.push(cadViewer);
      });
    }
    if (submit) {
      await this.submitGongyi(["算料CAD"]);
    }
  }

  updateBcfzInputData() {
    const {gongyi} = this;
    if (gongyi) {
      const morenbancai = cloneDeep(gongyi.板材分组);
      this.bcfzInputData = {
        xinghao: this.xinghaoName,
        morenbancai: morenbancai,
        cads: gongyi.算料CAD.map((v) => new CadData(v.json)),
        huajians: this.huajians,
        isLocal: true
      };
    } else {
      this.bcfzInputData = {xinghao: this.xinghaoName, morenbancai: {}};
    }
  }

  getBcfzSubmitData(info: MrbcjfzXinghaoInfo) {
    const {gongyi} = this;
    if (!gongyi) {
      return null;
    }
    return cloneDeep(info.默认板材);
  }

  async onBcfzSubmit(info: MrbcjfzXinghaoInfo) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const 板材分组 = this.getBcfzSubmitData(info);
    if (板材分组 && !isEqual(板材分组, gongyi.板材分组)) {
      gongyi.板材分组 = 板材分组;
      await this.submitGongyi(["板材分组"]);
    }
  }

  async onBcfzRefreshEnd() {
    const {gongyi, mrbcjfz} = this;
    if (!gongyi || !mrbcjfz || !mrbcjfz.inputData) {
      return;
    }
    if (this.xinghaoName !== mrbcjfz.inputData.xinghao) {
      return;
    }
    const 板材分组 = this.getBcfzSubmitData(mrbcjfz.xinghao);
    if (板材分组 && !isEqual(板材分组, gongyi.板材分组)) {
      gongyi.板材分组 = 板材分组;
      await this.submitGongyi(["板材分组"]);
    }
  }

  async editSuanliaoCad(i: number) {
    const cad = this.gongyi?.算料CAD[i];
    if (!cad) {
      return;
    }
    const cadData = new CadData(cad.json);
    const data: CadEditorInput = {
      data: cadData,
      center: true,
      isLocal: true
    };
    const result = await openCadEditorDialog(this.dialog, {data});
    if (result?.isSaved) {
      Object.assign(cad, getHoutaiCad(cadData), {_id: cad._id});
      await this.updateSuanliaoCads(true);
      this.updateBcfzInputData();
    }
  }

  async copySuanliaoCad(i: number) {
    const 算料CAD = this.gongyi?.算料CAD;
    if (!算料CAD) {
      return;
    }
    if (!(await this.message.confirm(`确定复制${算料CAD[i].名字}吗？`))) {
      return;
    }
    const cad = cloneDeep(算料CAD[i]);
    cad._id = v4();
    cad.json.id = v4();
    算料CAD.splice(i, 0, cad);
    await this.updateSuanliaoCads(true);
    this.updateBcfzInputData();
  }

  async removeSuanliaoCad(i: number) {
    const 算料CAD = this.gongyi?.算料CAD;
    if (!算料CAD) {
      return;
    }
    if (!(await this.message.confirm(`确定删除${算料CAD[i].名字}吗？`))) {
      return;
    }
    算料CAD.splice(i, 1);
    await this.updateSuanliaoCads(true);
    this.updateBcfzInputData();
  }
}
