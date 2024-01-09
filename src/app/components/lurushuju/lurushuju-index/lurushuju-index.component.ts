import {CommonModule} from "@angular/common";
import {Component, HostBinding, OnInit, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTabChangeEvent, MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {SafeUrl} from "@angular/platform-browser";
import {filePathUrl, getBooleanStr, getFilepathUrl, session, setGlobal} from "@app/app.common";
import {CadListInput} from "@components/dialogs/cad-list/cad-list.component";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf, queryString, RequiredKeys, WindowMessageManager} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase, 后台CAD} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {
  InputInfo,
  InputInfoGroup,
  InputInfoOption,
  InputInfoOptions,
  InputInfoSelect,
  InputInfoSelectMulti
} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MrbcjfzHuajian, MrbcjfzInputData, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import csstype from "csstype";
import {cloneDeep, debounce, isEmpty, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
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
  MenjiaoData,
  OptionsAll,
  OptionsAll2,
  ShuruTableData,
  XinghaoData,
  XuanxiangFormData,
  XuanxiangTableData
} from "./lurushuju-index.types";
import {autoFillMenjiao, getCadSearch, getMenjiaoCadInfos, updateMenjiaoForm} from "./lurushuju-index.utils";

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
  xuanxiangTable: TableRenderInfo<XuanxiangTableData> = {
    title: "选项数据",
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字"},
      {
        type: "custom",
        field: "可选项",
        toString(item) {
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
  shuruTable: TableRenderInfo<ShuruTableData> = {
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
  menjiaoTable: TableRenderInfo<MenjiaoData> = {
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
        type: "custom",
        field: "门缝配置",
        width: "250px",
        toString(value) {
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
    toolbarButtons: {extra: [{event: "添加", color: "primary"}], inlineTitle: true}
  };
  shiyituInputInfos: InputInfo[] = [];
  xiaoguotuInputInfos: InputInfo[] = [];
  bcfzInputData: MrbcjfzInputData | null = null;
  huajians: MrbcjfzHuajian[] = [];
  parentInfo = {isZhijianUser: false};

  stepDataKey = "lurushujuIndexStepData";
  step: LurushujuIndexStep = 1;
  xinghaoName = "";
  fenleiName = "";
  gongyiName = "";
  production = environment.production;
  cadImgs: ObjectOf<SafeUrl> = {};
  wmm = new WindowMessageManager("录入数据", this, window.parent);
  @ViewChild(MrbcjfzComponent) mrbcjfz?: MrbcjfzComponent;

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
        {
          const errorMsg = this.mrbcjfz?.checkSubmit() || [];
          if (errorMsg.length > 0) {
            await this.message.error(errorMsg.join("\n"));
            this.tabIndex;
          } else if (await this.message.confirm("确定返回吗？")) {
            this.setStep(2, {xinghaoName: this.xinghaoName});
          }
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
      return options.map(({mingzi}) => {
        const option: InputInfoOption = {value: mingzi};
        if (key === "产品分类") {
          option.disabled = this.defaultFenleis.includes(mingzi);
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
          onChange: (val) => onChange({所属门窗: val})
        },
        {
          type: "selectMulti",
          label: "所属工艺",
          model: {data: xinghao, key: "所属工艺"},
          options: getOptions("工艺"),
          onChange: (val) => onChange({所属工艺: val})
        },
        {
          type: "selectMulti",
          label: "产品分类",
          model: {data: xinghao, key: "显示产品分类"},
          options: getOptions("产品分类"),
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
    const tabName = session.load<string>(this.tabNameKey);
    this.openTab(tabName || "");
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
    this.cadImgs = {};
    for (const cad of gongyi.算料CAD) {
      const id = cad._id;
      this.cadImgs[id] = this.http.getCadImgUrl(id);
    }
    this.shiyituInputInfos = [];
    for (const key in gongyi.示意图CAD) {
      const params: CadListInput = {selectMode: "single", collection: "cad", raw: true};
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
    const optionsRaw = await this.http.queryMySql<TableDataBase & {zuchenghuajian?: string}>({
      table: "p_menshan",
      fields: ["vid", "mingzi", "zuchenghuajian"]
    });
    const options: InputInfoOptions = [];
    const huajianIds = new Set<string>();
    for (const optionRaw of optionsRaw) {
      options.push(optionRaw.mingzi);
      if (typeof optionRaw.zuchenghuajian === "string") {
        for (const v of optionRaw.zuchenghuajian.split("*")) {
          if (v) {
            huajianIds.add(v);
          }
        }
      }
    }
    this.huajians = await this.http.queryMySql<MrbcjfzHuajian>({
      table: "p_huajian",
      fields: ["vid", "mingzi", "xiaotu"],
      filter: {where_in: {vid: Array.from(huajianIds)}}
    });
    const xiaoguotuKeys: (keyof 工艺做法)[] = ["锁扇正面", "锁扇背面", "小扇正面", "小扇背面", "铰扇正面", "铰扇背面"];
    for (const key of xiaoguotuKeys) {
      this.xiaoguotuInputInfos.push({
        type: "select",
        label: key,
        options,
        model: {data: gongyi, key},
        onChange: () => {
          this.submitGongyi([key]);
        }
      });
    }
    this.updateBcfzInputData();
  }

  openTab(name: string) {
    const tabIndex = this.tabs.filter((v) => !v.hidden).findIndex((v) => v.name === name);
    if (tabIndex >= 0) {
      this.tabIndex = tabIndex;
    } else if (name) {
      this.message.error("未找到对应的标签页：" + name);
    }
  }

  onSelectedTabChange({index}: MatTabChangeEvent) {
    const tabName = this.tabs.filter((v) => !v.hidden)[index]?.name;
    if (tabName) {
      session.save(this.tabNameKey, tabName);
    }
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
    const allFenleis = this.xinghaoOptionsAll.产品分类.map((v) => v.mingzi);
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
    const 复制名字 = await this.message.prompt({
      type: "string",
      label: "复制工艺做法",
      placeholder: "若留空则自动生成名字",
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
        return {label: v.mingzi, value: v};
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
          const info = form[1] as unknown as InputInfoSelectMulti<any, K>;
          info.options = get可选项Options();
          if (Array.isArray(info.value)) {
            info.value.length = 0;
          }
        }
      },
      {
        type: "selectMulti",
        label: "可选项",
        model: {data, key: "可选项"},
        options: 可选项Options,
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
      门铰: "",
      门扇厚度: "",
      锁边: "",
      铰边: "",
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
    const getOptionInputInfo = (key: keyof 门铰锁边铰边, n: number): InputInfoSelect | InputInfoSelectMulti => {
      const optionsInfo = this.menjiaoOptionsAll[key];
      if (!optionsInfo) {
        return {type: "select", label: key, options: []};
      }
      const options = optionsInfo.options.map<InputInfoOption>((v) => {
        return {value: v.mingzi};
      });
      const disabled = optionsInfo.disabled;
      const info2: Omit<InputInfo, "type"> = {
        label: key,
        model: {data, key},
        disabled,
        validators: Validators.required,
        styles: getInfoStyles(n)
      };
      const onChange = () => {
        updateMenjiaoForm(data);
      };
      if (optionsInfo.multiple) {
        return {type: "selectMulti", options, onChange, ...info2};
      } else {
        return {type: "select", options, onChange, ...info2};
      }
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

  async getGongshis() {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const extraData = this.getGongshiExtraData();
    const where: ObjectOf<any> = {};
    for (const key of keysOf(extraData.选项)) {
      where[`选项.${key}`] = extraData.选项[key];
    }
    const fields = ["名字", "条件", "选项", "公式"];
    const gongshis = (await this.http.getData<any[]>("ngcad/querymongodb", {collection: "material", where, fields})) || [];
    for (const gongshi of gongshis) {
      delete gongshi.collection;
    }
    gongyi.算料公式 = gongshis;
    await this.submitGongyi(["算料公式"]);
  }

  async editGongshis(index?: number) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    const extraData = this.getGongshiExtraData();
    const search2: ObjectOf<any> = {};
    if (typeof index === "number") {
      search2._id = gongyi.算料公式[index]._id;
    } else {
      for (const key of keysOf(extraData.选项)) {
        search2[`选项.${key}`] = extraData.选项[key];
      }
    }
    const url = await this.http.getData<string>("ngcad/getShortUrl", {name: "算料公式", data: {search2, extraData}});
    if (url) {
      window.open(url);
    }
  }

  getTimeStr(time: number) {
    return new Date(time).toLocaleString();
  }

  async getTestCaseItem(data0?: 测试用例) {
    const data: 测试用例 = {名字: "", 时间: 0, 测试数据: {}, 测试正确: false, ...data0};
    const form: InputInfo<typeof data>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "object",
        label: "测试数据",
        model: {data, key: "测试数据"},
        validators: (control) => {
          if (isEmpty(control.value)) {
            return {测试数据不能为空: true};
          }
          return null;
        },
        keyLabel: "公式名",
        valueLabel: "公式值",
        keyValidators: (control) => {
          const value = control.value;
          if (!value) {
            return {公式名不能为空: true};
          }
          if (!isNaN(Number(value))) {
            return {公式名不能为数字: true};
          }
          if (value.match(/^[0-9]/)) {
            return {公式名不能以数字开头: true};
          }
          return null;
        },
        valueValidators: Validators.required
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
    const result = await this.getTestCaseItem();
    if (result) {
      this.submitGongyi(["测试用例"]);
    }
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
      stepFixed: true
    };
    const result = await openZixuanpeijianDialog(this.dialog, {data});
    if (!result) {
      return;
    }
    const ids = result.零散.map((v) => v.info.houtaiId);
    if (ids.length > 0) {
      const result2 = await this.http.queryMongodb<后台CAD>({collection: "cad", where: {_id: {$in: ids}}});
      for (const cad of result2) {
        delete cad.json;
      }
      const result3: 后台CAD[] = [];
      for (const v of result.零散) {
        const cad = cloneDeep(result2.find((v2) => v2._id === v.info.houtaiId));
        if (!cad) {
          continue;
        }
        cad.json = v.data.export();
        cad.json.houtaiId = cad._id;
        result3.push(cad);
        if (!this.cadImgs[cad._id]) {
          this.cadImgs[cad._id] = this.http.getCadImgUrl(cad._id);
        }
      }
      gongyi.算料CAD = result3;
    } else {
      gongyi.算料CAD = [];
    }
    await this.submitGongyi(["算料CAD"]);
    this.updateBcfzInputData();
  }

  suanliao() {
    this.message.alert("未实现");
  }

  updateBcfzInputData() {
    const {gongyi} = this;
    if (gongyi) {
      const morenbancai = cloneDeep(gongyi.板材分组);
      for (const info of Object.values(morenbancai)) {
        info.CAD = info.CAD.map((id) => {
          const cad = gongyi.算料CAD.find((v) => v._id === id);
          if (cad?.json) {
            return cad.json.id;
          } else {
            return id;
          }
        });
      }
      this.bcfzInputData = {
        xinghao: this.xinghaoName,
        morenbancai: morenbancai,
        cads: gongyi.算料CAD.map((v) => new CadData(v.json)),
        huajians: this.huajians
      };
    } else {
      this.bcfzInputData = null;
    }
  }

  async onBcfzSubmit(info: MrbcjfzXinghaoInfo) {
    const {gongyi} = this;
    if (!gongyi) {
      return;
    }
    gongyi.板材分组 = cloneDeep(info.默认板材);
    for (const item of Object.values(gongyi.板材分组)) {
      item.CAD = item.CAD.map((id) => {
        const cad = gongyi.算料CAD.find((v) => v.json?.id === id);
        if (cad) {
          return cad._id;
        } else {
          return id;
        }
      });
    }
    await this.submitGongyi(["板材分组"]);
  }
}
