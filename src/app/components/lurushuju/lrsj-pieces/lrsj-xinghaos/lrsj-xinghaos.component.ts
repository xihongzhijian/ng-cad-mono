import {ChangeDetectionStrategy, Component, effect, HostBinding, inject, OnInit, output, signal, untracked} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDivider} from "@angular/material/divider";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, getCopyName, joinOptions, session, splitOptions} from "@app/app.common";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {getTableUpdateData} from "@app/modules/http/services/cad-data.service.utils";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo, InputInfoGroup, InputInfoSelect} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {AppStatusService} from "@app/services/app-status.service";
import {environment} from "@env";
import {cloneDeep, debounce} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {ObjectOf, queryString} from "packages/utils/lib";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {XinghaoRaw} from "../../xinghao-data";
import {LrsjPiece} from "../lrsj-piece";
import {defaultFenleis, getGroupStyle, getInfoStyle, getOptions} from "../lrsj-pieces.utils";
import {XinghaoData, XinghaoDataList, XinghaoGongyi, XinghaoMenchuang} from "./lrsj-xinghaos.types";
import {getXinghaoData, getXinghaoGongyi, getXinghaoMenchuang} from "./lrsj-xinghaos.utils";

@Component({
  selector: "app-lrsj-xinghaos",
  standalone: true,
  imports: [ImageComponent, InputComponent, MatButtonModule, MatDivider, MatTooltipModule, NgScrollbarModule],
  templateUrl: "./lrsj-xinghaos.component.html",
  styleUrl: "./lrsj-xinghaos.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LrsjXinghaosComponent extends LrsjPiece implements OnInit {
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class.hidden") hidden = false;

  xinghaoMenchuangs = this.lrsjStatus.xinghaoMenchuangs;
  xinghao = this.lrsjStatus.xinghao;
  editMode = this.lrsjStatus.editMode;
  saveInfo = output();

  production = environment.production;

  constructor() {
    super();
    effect(() => {
      const str = this.xinghaoFilterStr();
      session.save(this._xinghaoFilterStrKey, str);
      untracked(() => this.filterXinghaos());
    });
    effect(() => (this.hidden = !!this.xinghao()));
  }

  async ngOnInit() {
    await this.getXinghaos();
    this.isReadyForInfo.next(true);
  }

  getInfo() {
    const menchuang = this.xinghaoMenchuangs.item();
    const info: ObjectOf<any> = {};
    if (menchuang) {
      info.门窗 = menchuang.mingzi;
    }
    const gongyi = menchuang?.gongyis?.item();
    if (gongyi) {
      info.工艺 = gongyi.mingzi;
    }
    const xinghao = this.xinghao();
    if (xinghao) {
      info.型号 = xinghao.名字;
    }
    return info;
  }
  async setInfo(info: ObjectOf<any>) {
    const {门窗, 工艺, 型号} = info;
    let i: number | undefined;
    let j: number | undefined;
    if (门窗) {
      i = this.xinghaoMenchuangs.items().findIndex((v) => v.mingzi === 门窗);
    }
    if (工艺 && typeof i === "number") {
      const gongyis = this.xinghaoMenchuangs.items()[i]?.gongyis;
      if (gongyis) {
        j = gongyis.items().findIndex((v) => v.mingzi === 工艺);
      }
    }
    if (typeof i === "number" && typeof j === "number") {
      this.clickXinghaoGongyi(i, j);
    }
    if (型号) {
      this.enterXinghao(型号);
    }
  }

  async getXinghaos() {
    const xinghaos = await this.http.getData<XinghaoData[]>("shuju/api/getXinghaos");
    const fields = ["vid", "mingzi"];
    const menchuangs = await this.http.queryMySql<XinghaoMenchuang>({table: "p_menchuang", fields});
    const gongyis = await this.http.queryMySql<XinghaoGongyi>({table: "p_gongyi", fields: [...fields, "menchuang"]});
    const iPrev = this.xinghaoMenchuangs.index();
    const jPrev = this.xinghaoMenchuangs.item()?.gongyis?.index();
    this.xinghaoMenchuangs.items.set([]);
    for (const menchuang of menchuangs) {
      const xinghaoMenchuang = getXinghaoMenchuang(menchuang);
      xinghaoMenchuang.gongyis = new XinghaoDataList();
      this.xinghaoMenchuangs.items.update((v) => [...v, xinghaoMenchuang]);
      for (const gongyi of gongyis) {
        const menchuangIds = splitOptions(String(gongyi.menchuang)).map(Number);
        if (!menchuangIds.includes(menchuang.vid)) {
          continue;
        }
        const xinghaoGongyi = getXinghaoGongyi(gongyi);
        xinghaoMenchuang.gongyis.items.update((v) => [...v, xinghaoGongyi]);
      }
    }
    if (xinghaos) {
      for (const xinghao of xinghaos) {
        const {menchuang, gongyi} = xinghao;
        const menchuangs = splitOptions(menchuang);
        const gongyis = splitOptions(gongyi);
        const menchuangItems = this.xinghaoMenchuangs.items().filter((v) => menchuangs.includes(v.mingzi));
        for (const menchuangItem of menchuangItems) {
          const gongyiItems = menchuangItem.gongyis?.items().filter((v) => gongyis.includes(v.mingzi));
          for (const gongyiItem of gongyiItems || []) {
            if (!gongyiItem.xinghaos) {
              gongyiItem.xinghaos = new XinghaoDataList();
            }
            gongyiItem.xinghaos.items.update((v) => [...v, xinghao]);
          }
        }
      }
      if (typeof iPrev === "number") {
        this.xinghaoMenchuangs.index.set(iPrev);
        const menchuangItem = this.xinghaoMenchuangs.items()[iPrev];
        if (menchuangItem?.gongyis && typeof jPrev === "number") {
          menchuangItem.gongyis.index.set(jPrev);
        }
      }
      this.filterXinghaos();
    }
  }
  private _xinghaoFilterStrKey = "lurushujuXinghaoFilterStr";
  xinghaoFilterStr = signal(session.load<string>(this._xinghaoFilterStrKey) || "");
  filterInputInfo: InputInfo<this> = {
    type: "string",
    label: "搜索型号",
    clearable: true,
    value: this.xinghaoFilterStr(),
    onInput: debounce((val) => {
      this.xinghaoFilterStr.set(val);
    }, 500),
    style: {width: "200px"}
  };
  filterXinghaos() {
    const str = this.xinghaoFilterStr();
    const menchuangs = this.xinghaoMenchuangs;
    let menchuangCount = 0;
    const foundGongyis: [number, number][] = [];
    for (const [i, menchuang] of menchuangs.items().entries()) {
      if (!menchuang.gongyis) {
        menchuang.gongyis = new XinghaoDataList<XinghaoGongyi>();
      }
      const gongyis = menchuang.gongyis;
      let gongyiCount = 0;
      for (const [j, gongyi] of gongyis.items().entries()) {
        if (!gongyi.xinghaos) {
          gongyi.xinghaos = new XinghaoDataList();
        }
        const xinghaos = gongyi.xinghaos;
        let xinghaoCount = 0;
        for (const xinghao of xinghaos.items()) {
          xinghao.hidden = !queryString(str, xinghao.mingzi);
          if (!xinghao.hidden) {
            xinghaoCount++;
            gongyiCount++;
            menchuangCount++;
          }
        }
        xinghaos.count.set(xinghaoCount);
        if (xinghaoCount) {
          foundGongyis.push([i, j]);
        }
      }
      gongyis.count.set(gongyiCount);
    }
    menchuangs.count.set(menchuangCount);
    if (str) {
      const foundCount = foundGongyis.length;
      if (foundCount < 1) {
        this.message.snack("搜索不到数据");
      } else if (foundCount === 1) {
        const [i, j] = foundGongyis[0];
        this.clickXinghaoGongyi(i, j, true);
      }
    } else {
      const iPrev = this.xinghaoMenchuangs.index();
      const jPrev = this.xinghaoMenchuangs.item()?.gongyis?.index();
      this.clickXinghaoGongyi(iPrev || 0, jPrev || 0, true);
    }
  }
  clickXinghaoGongyi(i: number, j: number, refresh?: boolean) {
    const menchuangs = this.xinghaoMenchuangs;
    const iPrev = menchuangs.index();
    menchuangs.index.set(i);
    const gongyis = menchuangs.items()[i]?.gongyis;
    if (!gongyis) {
      return;
    }
    const jPrev = gongyis.index();
    gongyis.index.set(j);
    if (iPrev !== i || jPrev !== j || refresh) {
      this.xinghaos.set(gongyis.item()?.xinghaos?.items() || []);
    }
    this.emitSaveInfo();
  }

  async getXinghaoMenchaung(menchuang?: XinghaoMenchuang) {
    const data = menchuang ? cloneDeep({...menchuang, gongyis: undefined}) : getXinghaoMenchuang();
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "mingzi"},
        validators: Validators.required
      },
      {type: "number", label: "排序", model: {data, key: "paixu"}},
      {type: "boolean", label: "停用", model: {data, key: "tingyong"}}
    ];
    const result = await this.message.form(form);
    return result ? data : null;
  }
  async addXinghaoMenchaung() {
    const data = await this.getXinghaoMenchaung();
    if (data) {
      await this.http.tableInsert({table: "p_menchuang", data});
      await this.getXinghaos();
    }
  }
  async editXinghaoMenchaung(i: number) {
    const data0 = this.xinghaoMenchuangs.items()[i];
    const data1 = await this.getXinghaoMenchaung(data0);
    if (!data1) {
      return;
    }
    const data = getTableUpdateData(data0, data1);
    if (data) {
      await this.http.tableUpdate({table: "p_menchuang", data});
      await this.getXinghaos();
    }
  }
  async removeXinghaoMenchaung(i: number) {
    const data = this.xinghaoMenchuangs.items()[i];
    if (data.gongyis && data.gongyis.items().length > 0) {
      this.message.error("门窗存在工艺时不能删除");
      return;
    }
    if (!(await this.message.confirm("确定删除吗？"))) {
      return;
    }
    await this.http.tableDelete({table: "p_menchuang", vids: [data.vid]});
    await this.getXinghaos();
  }

  async getXinghaoGongyi(gongyi?: XinghaoGongyi) {
    const data = gongyi ? cloneDeep({...gongyi, xinghaos: undefined}) : getXinghaoGongyi();
    const form: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "mingzi"},
        validators: Validators.required
      },
      {type: "number", label: "排序", model: {data, key: "paixu"}},
      {type: "boolean", label: "停用", model: {data, key: "tingyong"}}
    ];
    const result = await this.message.form(form);
    return result ? data : null;
  }
  async addXinghaoGongyi(i: number) {
    const data = await this.getXinghaoGongyi();
    if (data) {
      data.menchuang = this.xinghaoMenchuangs.items()[i].vid;
      await this.http.tableInsert({table: "p_gongyi", data});
      await this.getXinghaos();
    }
  }
  async editXinghaoGongyi(i: number, j: number) {
    const data0 = this.xinghaoMenchuangs.items()[i].gongyis?.items()[j];
    const data1 = await this.getXinghaoGongyi(data0);
    if (!data0 || !data1) {
      return;
    }
    const data = getTableUpdateData(data0, data1);
    if (data) {
      await this.http.tableUpdate({table: "p_gongyi", data});
      await this.getXinghaos();
    }
  }
  async removeXinghaoGongyi(i: number, j: number) {
    const data = this.xinghaoMenchuangs.items()[i].gongyis?.items()[j];
    if (!data) {
      return;
    }
    if (data.xinghaos && data.xinghaos.items.length > 0) {
      this.message.error("工艺存在型号时不能删除");
      return;
    }
    if (!(await this.message.confirm("确定删除吗？"))) {
      return;
    }
    await this.http.tableDelete({table: "p_gongyi", vids: [data.vid]});
    await this.getXinghaos();
  }

  xinghaos = signal<XinghaoData[]>([]);
  async getXinghaoItem(xinghao?: XinghaoData) {
    const data: XinghaoData = xinghao ? cloneDeep(xinghao) : getXinghaoData();
    if (!data.算料单模板) {
      data.算料单模板 = this.status.projectConfig.get("新做数据算料单排版默认方案") || "自动排版模板";
    }
    if (typeof data.是否需要激光开料 !== "boolean") {
      data.是否需要激光开料 = this.lrsjStatus.isKailiao();
    }
    const menchuang = this.xinghaoMenchuangs.item();
    const gongyi = menchuang?.gongyis?.item();
    if (!data.menchuang && menchuang) {
      data.menchuang = menchuang.mingzi;
    }
    if (!data.gongyi && gongyi) {
      data.gongyi = gongyi.mingzi;
    }
    const isAdd = !xinghao;

    const data2: XinghaoRaw = {
      名字: data.mingzi,
      所属门窗: data.menchuang,
      所属工艺: data.gongyi,
      订单流程: data.dingdanliucheng,
      算料单模板: data.算料单模板,
      是否需要激光开料: data.是否需要激光开料
    };
    const mingziOld = data.mingzi;
    const names = this.xinghaos().map((xinghao) => xinghao.mingzi);
    let refreshOptions = false;
    const getOptionInput = async (key: string, label: string, multiple?: boolean, options?: {hidden?: boolean}) => {
      const info = await this.getOptionInput(data2, key, label, multiple, options);
      if (info.optionsDialog) {
        info.optionsDialog.onChange = () => {
          refreshOptions = true;
        };
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
      await getOptionInput("门窗", "所属门窗", true, {hidden: isAdd}),
      await getOptionInput("工艺", "所属工艺", true, {hidden: isAdd}),
      await getOptionInput("订单流程", "订单流程"),
      {
        type: "select",
        label: "算料单模板",
        model: {data: data2, key: "算料单模板"},
        options: ["自动排版模板", "手动装配配件模板", "混合模板"]
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
        this.lrsjStatus.deleteDataCache("xinghaoOptionsAll");
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
      await this.getXinghaos();
      this.enterXinghao(xinghao.mingzi);
    }
  }
  async editXinghao(xinghao: XinghaoData) {
    const result = await this.getXinghaoItem(xinghao);
    if (result) {
      await this.editXinghaoByResult(result, xinghao);
    }
  }
  async editXinghaoByResult(result: NonNullable<Awaited<ReturnType<typeof this.getXinghaoItem>>>, xinghao: XinghaoData) {
    const {data, data2, mingziOld} = result;
    data2.名字 = data.mingzi;
    const response = await this.http.post("shuju/api/editXinghao", {mingziOld, data: {...xinghao, ...data}});
    if (response?.code === 0) {
      const response2 = await this.lrsjStatus.setXinghao(data2, true, data2.名字);
      if (response2?.code === 0) {
        await this.getXinghaos();
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
          await this.getOptionInput(data, "门窗", "menchuang", true, {style: getInfoStyle(2)}),
          await this.getOptionInput(data, "工艺", "gongyi", true, {style: getInfoStyle(2)})
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
  async enterXinghao(name: string) {
    const xinghao = await this.lrsjStatus.getXinghao(name);
    await this.lrsjStatus.updateXinghao(xinghao);
    this.emitSaveInfo();
  }

  async getOptions(key: string) {
    const xinghaoOptionsAll = await this.lrsjStatus.getXinghaoOptions();
    return getOptions(xinghaoOptionsAll, key, (option) => {
      if (key === "产品分类") {
        option.disabled = defaultFenleis.includes(option.value);
      }
    });
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
}
