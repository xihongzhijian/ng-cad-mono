import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, signal} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {joinOptions, splitOptions} from "@app/app.common";
import {getCopyName} from "@app/utils/get-value";
import {getIsVersion2024} from "@app/utils/table-data/zuoshuju-data";
import {environment} from "@env";
import {ClickedClsDirective} from "@modules/directives/clicked-cls.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoGroup, InputInfoOption, InputInfoPart, InputInfoSelect} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {XhmrmsbjComponent} from "@views/xhmrmsbj/xhmrmsbj.component";
import {cloneDeep, debounce} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {OptionsAll, XinghaoData} from "../../services/lrsj-status.types";
import {getXinghaoData} from "../../services/lrsj-status.utils";
import {XinghaoRaw, 算料单模板Options} from "../../xinghao-data";
import {LrsjPiece} from "../lrsj-piece";
import {defaultFenleis, getOptions} from "../lrsj-pieces.utils";

@Component({
  selector: "app-lrsj-xinghaos",
  imports: [
    ClickedClsDirective,
    FloatingDialogModule,
    FormsModule,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatCheckboxModule,
    NgScrollbarModule,
    XhmrmsbjComponent
  ],
  templateUrl: "./lrsj-xinghaos.component.html",
  styleUrl: "./lrsj-xinghaos.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LrsjXinghaosComponent extends LrsjPiece {
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghaoMenchuangs = this.lrsjStatus.xinghaoMenchuangs;
  xinghao = this.lrsjStatus.xinghao;
  editMode = this.lrsjStatus.editMode;

  production = environment.production;

  constructor() {
    super();
  }

  xinghaoFilterForm = computed(() => {
    const data = {...this.lrsjStatus.xinghaoFilter()};
    const update = () => {
      this.lrsjStatus.xinghaoFilter.set(data);
    };
    const list = this.lrsjStatus.xinghaoMenchuangs();
    const menleixings = new Set<string>();
    for (const menchuang of list.items) {
      for (const gongyi of menchuang.gongyis?.items || []) {
        for (const xinghao of gongyi.xinghaos?.items || []) {
          if (xinghao.menleixing) {
            menleixings.add(xinghao.menleixing);
          }
        }
      }
    }
    const getOptions0 = <T>(options: InputInfoOption<T>[]): InputInfoOption<T | "">[] => {
      return [{label: "全部", value: ""}, ...options];
    };
    const zuoshujubanbenOptions = getOptions0(this.getOptions0(this.lrsjStatus.xinghaoOptionsManager.data(), "做数据版本"));
    const tingyongOptions = getOptions0([
      {label: "是", value: true},
      {label: "否", value: false}
    ]);
    const menleixingOptions = getOptions0(Array.from(menleixings).map((v) => ({value: v})));
    const getter = new InputInfoWithDataGetter(data, {
      clearable: true,
      onChange: () => update()
    });
    const form: InputInfo<typeof data>[] = [
      getter.string("name", {
        label: "搜索型号",
        style: {width: "200px"},
        onInput: debounce(() => update(), 500)
      }),
      getter.selectSingle("menleixing", menleixingOptions, {label: "门类型", style: {width: "150px"}}),
      getter.selectSingle("zuoshujubanben", zuoshujubanbenOptions, {
        label: "做数据版本",
        style: {width: "220px"}
      }),
      getter.selectSingle("tingyong", tingyongOptions, {
        label: "停用",
        style: {width: "100px"}
      })
    ];
    return form;
  });

  showMenleixing = computed(() => {
    return this.status.projectConfig.getBoolean("产品数据型号要显示门类型");
  });

  xinghaos = computed(() => {
    const xinghaoMenchuangs = this.xinghaoMenchuangs();
    return xinghaoMenchuangs.item?.gongyis?.item?.xinghaos?.items || [];
  });
  xinghaoSelectedIndexs = signal<number[]>([]);
  xinghaoSelectedIndexsEff = effect(() => {
    this.xinghaos();
    this.xinghaoSelectedIndexs.set([]);
  });
  xinghaosSelected = computed(() => {
    const xinghaos = this.xinghaos();
    const indexs = this.xinghaoSelectedIndexs();
    return xinghaos.filter((_, i) => indexs.includes(i));
  });
  toggleXinghaoSelected(index: number) {
    const indexs = this.xinghaoSelectedIndexs();
    if (indexs.includes(index)) {
      this.xinghaoSelectedIndexs.set(indexs.filter((i) => i !== index));
    } else {
      this.xinghaoSelectedIndexs.set([...indexs, index]);
    }
  }
  selectAllXinghaos() {
    const indexs = this.xinghaoSelectedIndexs();
    if (indexs.length === this.xinghaos().length) {
      this.xinghaoSelectedIndexs.set([]);
    } else {
      this.xinghaoSelectedIndexs.set(this.xinghaos().map((_, i) => i));
    }
  }

  async getXinghaoItem(xinghao?: XinghaoData) {
    const data: XinghaoData = xinghao ? cloneDeep(xinghao) : getXinghaoData();
    if (!xinghao && !data.算料单模板) {
      data.算料单模板 = this.status.projectConfig.get("新做数据算料单排版默认方案") || "自动排版模板";
    }
    if (typeof data.是否需要激光开料 !== "boolean") {
      data.是否需要激光开料 = this.lrsjStatus.isKailiao();
    }
    const menchuang = this.xinghaoMenchuangs().item;
    const gongyi = menchuang?.gongyis?.item;
    if (!data.menchuang && menchuang) {
      data.menchuang = menchuang.mingzi;
    }
    if (!data.gongyi && gongyi) {
      data.gongyi = gongyi.mingzi;
    }
    data.tingyong = !!data.tingyong;
    if (xinghao && !data.zuoshujubanben) {
      data.zuoshujubanben = " ";
    }
    if (typeof data.下单显示没有配件的板材分组 !== "boolean") {
      data.下单显示没有配件的板材分组 = true;
    }

    const mingziOld = data.mingzi;
    const names = this.xinghaos().map((v) => v.mingzi);
    let refreshOptions = false;
    const getOptionInput = async (
      key: keyof typeof data,
      label: string,
      hasDialog?: boolean,
      multiple?: boolean,
      others?: InputInfoPart
    ) => {
      const info = await this.getOptionInput(data, label, key, multiple, others);
      if (hasDialog) {
        if (info.optionsDialog) {
          const onChange = info.optionsDialog.onChange;
          info.optionsDialog.onChange = (val) => {
            onChange?.(val);
            refreshOptions = true;
          };
        }
      } else {
        delete info.optionsDialog;
      }
      return info;
    };
    const showMenleixing = this.showMenleixing() && "menleixing" in data;
    const getter = new InputInfoWithDataGetter(data, {clearable: true});
    const form: InputInfo[] = [
      getter.string("mingzi", {
        label: "名字",
        validators: (control) => {
          const value = control.value;
          if (!value) {
            return {名字不能为空: true};
          }
          if (names.includes(value) && value !== mingziOld) {
            return {名字已存在: true};
          }
          return null;
        }
      }),
      getter.image("tupian", this.http, {label: "图片"}),
      await getOptionInput("menchuang", "门窗", true, true),
      await getOptionInput("gongyi", "工艺", true, true),
      getter.string("menleixing", {label: "门类型", hidden: !showMenleixing}),
      await getOptionInput("dingdanliucheng", "订单流程"),
      await getOptionInput("zuoshujubanben", "做数据版本"),
      getter.selectSingle("算料单模板", 算料单模板Options.slice(), {validators: Validators.required}),
      getter.boolean("下单显示没有配件的板材分组"),
      getter.boolean("是否需要激光开料", {validators: Validators.required}),
      getter.number("paixu", {label: "排序"}),
      getter.boolean("tingyong", {label: "停用"}),
      getter.boolean("数据已录入完成")
    ];
    const result = await this.message.form(form);
    if (result) {
      if (refreshOptions) {
        this.lrsjStatus.xinghaoOptionsManager.fetch(true);
      }
      const data2: XinghaoRaw = {
        名字: data.mingzi,
        所属门窗: data.menchuang,
        所属工艺: data.gongyi,
        订单流程: data.dingdanliucheng,
        做数据版本: data.zuoshujubanben,
        算料单模板: data.算料单模板,
        是否需要激光开料: data.是否需要激光开料,
        下单显示没有配件的板材分组: data.下单显示没有配件的板材分组,
        数据已录入完成: data.数据已录入完成
      };
      return {data, data2, mingziOld};
    }
    return null;
  }
  async addXinghao() {
    const result = await this.getXinghaoItem();
    if (!result) {
      return;
    }
    const xinghao = await this.http.getData<XinghaoData>("shuju/api/insertXinghao", {名字: result.data.mingzi});
    if (xinghao) {
      result.mingziOld = result.data.mingzi;
      await this.editXinghaoByResult(result, xinghao);
      await this.lrsjStatus.getXinghaos();
      const xinghao2 = this.lrsjStatus.findXinghao(xinghao.vid);
      if (xinghao2) {
        this.gotoZuofas(xinghao2);
      }
    }
  }
  async editXinghao(xinghao: XinghaoData) {
    const result = await this.getXinghaoItem(xinghao);
    if (result) {
      await this.editXinghaoByResult(result, xinghao);
    }
  }
  async editXinghaoByResult(result: NonNullable<Awaited<ReturnType<typeof this.getXinghaoItem>>>, xinghao: XinghaoData) {
    if (!(await this.lrsjStatus.validateXinghaoSize())) {
      return;
    }
    const {data, data2, mingziOld} = result;
    data2.名字 = data.mingzi;
    const response = await this.http.post("shuju/api/editXinghao", {mingziOld, data: {...xinghao, ...data}});
    if (response?.code === 0) {
      const response2 = await this.lrsjStatus.setXinghao(data2, true, data2.名字);
      if (response2?.code === 0) {
        await this.lrsjStatus.getXinghaos();
      }
    }
  }
  async copyXinghao(xinghao: XinghaoData) {
    const fromName = xinghao.mingzi;
    const namesAll = this.xinghaos().map((v) => v.mingzi);
    const data = {num: 1, names: [] as string[], menchuang: xinghao.menchuang, gongyi: xinghao.gongyi};
    const getNameInputs = () => {
      const result: InputInfo[] = [];
      data.names = [];
      const numPerRow = 5;
      const w = 100 / numPerRow + "%";
      for (let i = 0; i < data.num; i++) {
        const name = getCopyName(namesAll.concat(data.names), fromName);
        data.names.push(name);
        result.push({
          type: "string",
          label: "",
          model: {data: data.names, key: i},
          validators: () => {
            const val = data.names[i];
            if (!val) {
              return {不能为空: true};
            }
            if (namesAll.includes(val)) {
              return {不能重复: true};
            }
            if (data.names.some((v, j) => i !== j && v === val)) {
              return {不能重复: true};
            }
            return null;
          },
          style: {
            flex: `0 0 calc(${w} - 20px * ${(numPerRow - 1) / numPerRow})`,
            width: "0",
            marginLeft: i % numPerRow === 0 ? "0" : "20px"
          }
        });
      }
      return result;
    };
    const namesGroupInput: InputInfoGroup = {
      type: "group",
      label: "",
      groupStyle: {display: "flex", flexWrap: "wrap"},
      infos: getNameInputs()
    };
    const form: InputInfo<typeof data>[] = [
      {
        type: "number",
        label: "复制数量",
        model: {data, key: "num"},
        validators: () => {
          const num = data.num;
          const min = 1;
          const max = 50;
          if (num < min) {
            return {[`不能小于${min}`]: true};
          }
          if (num > max) {
            return {[`不能大于${max}`]: true};
          }
          return null;
        },
        onChange: () => {
          namesGroupInput.infos = getNameInputs();
        }
      },
      getInputInfoGroup([
        await this.getOptionInput(data, "门窗", "menchuang", true),
        await this.getOptionInput(data, "工艺", "gongyi", true)
      ]),
      namesGroupInput
    ];
    const result = await this.message.form(form, {}, {width: "100%", height: "100%", maxWidth: "900px"});
    if (result) {
      if (data.num > 1 && !(await this.message.confirm(`确定复制吗？`))) {
        return;
      }
      await this.http.getData<boolean>(
        "shuju/api/copyXinghao",
        {fromName, toNames: data.names, menchuang: data.menchuang, gongyi: data.gongyi},
        {spinner: false}
      );
      await this.lrsjStatus.getXinghaos();
    }
  }
  async removeXinghao(xinghao: XinghaoData) {
    const name = xinghao.mingzi;
    if (!(await this.message.confirm("删除不可恢复，请慎重操作"))) {
      return;
    }
    const success = await this.http.getData<boolean>("shuju/api/removeXinghao", {name});
    if (success) {
      await this.lrsjStatus.getXinghaos();
    }
  }
  showXhmrmsbj = signal<{id: number} | null>(null);
  async gotoZuofas(xinghao0: XinghaoData) {
    if (getIsVersion2024(xinghao0.zuoshujubanben)) {
      this.showXhmrmsbj.set({id: xinghao0.vid});
    } else {
      const xinghao = await this.lrsjStatus.getXinghao(xinghao0.mingzi);
      this.lrsjStatus.gotoZuofas(xinghao);
    }
  }
  closeXhmrmsbj() {
    this.showXhmrmsbj.set(null);
  }

  getOptions0(optionsAll: OptionsAll, key: string) {
    return getOptions(optionsAll, key, (option) => {
      if (key === "产品分类") {
        option.disabled = defaultFenleis.includes(option.value);
      }
    });
  }
  async getOptions(key: string) {
    const xinghaoOptionsAll = await this.lrsjStatus.xinghaoOptionsManager.fetch();
    return this.getOptions0(xinghaoOptionsAll, key);
  }
  async getOptionInput(data: any, key1: string, key2: string, multiple?: boolean, others?: InputInfoPart) {
    const info: InputInfoSelect = {
      type: "select",
      label: key1,
      multiple,
      validators: Validators.required,
      options: await this.getOptions(key1),
      optionsDialog: {
        optionKey: key1,
        useLocalOptions: true,
        openInNewTab: true
      }
    };
    if (multiple && info.optionsDialog) {
      info.value = splitOptions(data[key2]);
      info.optionsDialog.onChange = (val) => {
        data[key2] = joinOptions(val.options);
      };
    } else {
      info.model = {data, key: key2};
    }
    Object.assign(info, others);
    return info;
  }

  async selectXinghaosGongyi() {
    const xinghaos = this.xinghaosSelected();
    if (!xinghaos.length) {
      await this.message.alert("请先选择型号");
      return;
    }
    const menchuang = this.xinghaoMenchuangs().item;
    const gongyi = menchuang?.gongyis?.item;
    if (!menchuang || !gongyi) {
      return;
    }
    const data = {menchuang: menchuang.mingzi, gongyi: gongyi.mingzi, xinghaos: xinghaos.map((v) => v.vid)};
    const form = [await this.getOptionInput(data, "门窗", "menchuang", true), await this.getOptionInput(data, "工艺", "gongyi", true)];
    const result = await this.message.form(form, {
      beforeClose: async ({type}) => {
        if (type === "submit") {
          return await this.message.confirm("修改后选中型号全部会被修改且不可恢复");
        }
        return true;
      }
    });
    if (result) {
      const result2 = await this.http.getData<boolean>("shuju/api/selectXinghaosGongyi", data);
      if (result2) {
        await this.lrsjStatus.getXinghaos();
      }
    }
  }
}
