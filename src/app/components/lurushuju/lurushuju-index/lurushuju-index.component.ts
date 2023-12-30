import {CommonModule} from "@angular/common";
import {Component, HostBinding, OnInit} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTabChangeEvent, MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, getBooleanStr, getFilepathUrl, session, setGlobal} from "@app/app.common";
import {ObjectOf, queryString} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption, InputInfoOptions, InputInfoSelect, InputInfoSelectMulti} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {cloneDeep, debounce, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getXinghao, updateXinghaoFenleis, Xinghao, XinghaoRaw, 工艺做法, 输入, 选项} from "../xinghao-data";
import {
  LurushujuIndexStep,
  LurushujuIndexStepInfo,
  MenjiaoData,
  OptionsAll,
  ShuruTableData,
  XinghaoData,
  XuanxiangFormData,
  XuanxiangTableData
} from "./lurushuju-index.types";

@Component({
  selector: "app-lurushuju-index",
  standalone: true,
  imports: [
    CommonModule,
    ImageComponent,
    InputComponent,
    MatButtonModule,
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
  tabIndexKey = "lurushujuTabIndex";
  tabIndex = session.load<number>(this.tabIndexKey) || 0;
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
  menjiaoOptionsAll: OptionsAll = {};
  xinghaoInputInfos: InputInfo<Xinghao>[] = [];
  xuanxiangTable: TableRenderInfo<XuanxiangTableData> = {
    title: "选项数据",
    noCheckBox: true,
    columns: [
      {type: "string", field: "名字"},
      {
        type: "toString",
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
          {event: "删除", color: "primary"}
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
  menjiaoTable: TableRenderInfo<MenjiaoData> = {columns: [], data: []};
  stepDataKey = "lurushujuIndexStepData";
  step: LurushujuIndexStep = 1;
  xinghaoName = "";
  fenleiName = "";
  gongyiName = "";

  constructor(
    private http: CadDataService,
    private message: MessageService
  ) {
    setGlobal("lrsj", this, true);
  }

  async ngOnInit() {
    const stepData = session.load<[LurushujuIndexStep, LurushujuIndexStepInfo[LurushujuIndexStep]]>(this.stepDataKey);
    if (stepData) {
      this.setStep(...stepData);
    } else {
      this.setStep(1, {});
    }
  }

  async getXinghaos() {
    const xinghaos = this.http.getData(await this.http.post<TableDataBase[]>("shuju/shuju/getXinghaos"));
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
    const xinghaoRaw = this.http.getData(await this.http.post<XinghaoRaw>("shuju/shuju/getXinghao", {名字: this.xinghaoName}));
    const xinghao = getXinghao(xinghaoRaw);
    const optionsAll = this.http.getData(await this.http.post<OptionsAll>("shuju/shuju/getXinghaoOption"));
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
    const xinghao = this.http.getData(await this.http.post<XinghaoData>("shuju/shuju/insertXinghao", {名字}));
    if (xinghao) {
      this.editXinghao(xinghao);
    }
  }

  editXinghao(xinghao: XinghaoData) {
    this.setStep(2, {xinghaoName: xinghao.mingzi});
  }

  back() {
    switch (this.step) {
      case 1:
        break;
      case 2:
        this.setStep(1, {});
        break;
      case 3:
        this.setStep(2, {xinghaoName: this.xinghaoName});
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
    if (!this.xinghao) {
      await this.getXinghao();
    }
    if (!this.xinghao) {
      return;
    }
    const gongyi = this.xinghao.产品分类[this.fenleiName].find((v) => v.名字 === this.gongyiName);
    if (!gongyi) {
      this.gongyi = null;
      return;
    }
    this.gongyi = gongyi;
    const gongyiOptionsAll = this.http.getData(await this.http.post<OptionsAll>("shuju/shuju/getGongyizuofaOption"));
    const menjiaoOptionsAll = this.http.getData(await this.http.post<OptionsAll>("shuju/shuju/getMenjiaoOptions"));
    this.gongyiOptionsAll = gongyiOptionsAll || {};
    this.menjiaoOptionsAll = menjiaoOptionsAll || {};
    this.xuanxiangTable.data = [...gongyi.选项数据];
    this.shuruTable.data = [...gongyi.输入数据];
  }

  onSelectedTabChange({index}: MatTabChangeEvent) {
    session.save(this.tabIndexKey, index);
  }

  async setXinghao(data: Partial<Xinghao>, silent?: boolean) {
    const name = this.xinghao?.名字;
    await this.http.post("shuju/shuju/setXinghao", {名字: name, data, silent}, {spinner: false});
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
    const xinghaoRaw = this.http.getData(await this.http.post<XinghaoRaw>("shuju/shuju/addGongyi", {名字, 型号, 产品分类}));
    await this.updateXinghao(xinghaoRaw?.产品分类);
  }

  async removeGongyi(产品分类: string, 名字: string) {
    if (!this.xinghao || !(await this.message.confirm("确定删除选中的工艺做法吗？"))) {
      return;
    }
    const 型号 = this.xinghao.名字;
    const xinghaoRaw = this.http.getData(await this.http.post<XinghaoRaw>("shuju/shuju/removeGongyi", {名字, 型号, 产品分类}));
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
    const xinghaoRaw = this.http.getData(await this.http.post<XinghaoRaw>("shuju/shuju/copyGongyi", {名字, 复制名字, 型号, 产品分类}));
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
    const form: InputInfo<工艺做法>[] = [
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
      {type: "boolean", label: "录入完成", model: {data, key: "录入完成"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      Object.assign(data0, result);
      const 型号 = this.xinghao.名字;
      await this.http.post("shuju/shuju/editGongyi", {名字, 型号, 产品分类, data: result});
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
    await this.http.post("shuju/shuju/editGongyi", {名字, 型号, 产品分类, data}, {silent});
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
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          this.gongyi.选项数据.splice(rowIdx, 1);
          this.xuanxiangTable.data = [...this.gongyi.选项数据];
          await this.submitGongyi(["选项数据"]);
        }
        break;
    }
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
}
