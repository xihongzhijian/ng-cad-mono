import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, signal} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, getCopyName, joinOptions, splitOptions} from "@app/app.common";
import {environment} from "@env";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoGroup, InputInfoSelect} from "@modules/input/components/input.types";
import {getGroupStyle, getInputStyle} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {getIsVersion2024} from "@views/msbj/msbj.utils";
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
    FloatingDialogModule,
    FormsModule,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
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
    const zuoshujubanbenOptions = this.getOptions0(this.lrsjStatus.xinghaoOptionsManager.data(), "做数据版本");
    zuoshujubanbenOptions.unshift({label: "全部", value: ""});
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "搜索型号",
        clearable: true,
        model: {data, key: "name"},
        onInput: debounce(() => {
          update();
        }, 500),
        style: {width: "200px"}
      },
      {
        type: "select",
        label: "做数据版本",
        clearable: true,
        model: {data, key: "zuoshujubanben"},
        options: zuoshujubanbenOptions,
        onChange: () => {
          update();
        },
        style: {width: "220px"}
      }
    ];
    return form;
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
    if (!data.算料单模板) {
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

    const data2: XinghaoRaw = {
      名字: data.mingzi,
      所属门窗: data.menchuang,
      所属工艺: data.gongyi,
      订单流程: data.dingdanliucheng,
      做数据版本: data.zuoshujubanben,
      算料单模板: data.算料单模板,
      是否需要激光开料: data.是否需要激光开料,
      下单显示没有配件的板材分组: data.下单显示没有配件的板材分组
    };
    if (typeof data2.下单显示没有配件的板材分组 !== "boolean") {
      data2.下单显示没有配件的板材分组 = true;
    }
    const mingziOld = data.mingzi;
    const names = this.xinghaos().map((xinghao) => xinghao.mingzi);
    let refreshOptions = false;
    const getOptionInput = async (key: string, label: string, hasDialog?: boolean, multiple?: boolean, options?: Partial<InputInfo>) => {
      const info = await this.getOptionInput(data2, key, label, multiple, options);
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
    const form: InputInfo[] = [
      {
        type: "string",
        label: "名字",
        model: {data: data, key: "mingzi"},
        validators: [
          (control) => {
            const value = control.value;
            if (!value) {
              return {名字不能为空: true};
            }
            if (names.includes(value) && value !== mingziOld) {
              return {名字已存在: true};
            }
            return null;
          }
        ]
      },
      {
        type: "image",
        label: "图片",
        value: data.tupian,
        prefix: filePathUrl,
        clearable: true,
        onChange: async (val, info) => {
          if (val) {
            const result = await this.http.uploadImage(val);
            if (result?.url) {
              info.value = result.url;
              data.tupian = result.url;
            }
          } else {
            info.value = "";
            data.tupian = "";
          }
        }
      },
      await getOptionInput("门窗", "所属门窗", true, true),
      await getOptionInput("工艺", "所属工艺", true, true),
      await getOptionInput("订单流程", "订单流程"),
      await getOptionInput("做数据版本", "做数据版本"),
      {
        type: "select",
        label: "算料单模板",
        model: {data: data2, key: "算料单模板"},
        options: 算料单模板Options.slice()
      },
      {
        type: "boolean",
        label: "下单显示没有配件的板材分组",
        model: {data: data2, key: "下单显示没有配件的板材分组"}
      },
      {
        type: "boolean",
        label: "是否需要激光开料",
        model: {data: data2, key: "是否需要激光开料"},
        validators: Validators.required
      },
      {type: "number", label: "排序", model: {data, key: "paixu"}},
      {type: "boolean", label: "停用", model: {data, key: "tingyong"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      if (refreshOptions) {
        this.lrsjStatus.xinghaoOptionsManager.fetch(true);
      }
      data.menchuang = data2.所属门窗 || "";
      data.gongyi = data2.所属工艺 || "";
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
      {
        type: "group",
        label: "",
        infos: [
          await this.getOptionInput(data, "门窗", "menchuang", true, {style: getInputStyle(true)}),
          await this.getOptionInput(data, "工艺", "gongyi", true, {style: getInputStyle(true)})
        ],
        groupStyle: getGroupStyle()
      },
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
  async getOptionInput(data: any, key1: string, key2: string, multiple?: boolean, others?: Partial<InputInfo>) {
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
        data[key2] = joinOptions(val.options, "*");
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
