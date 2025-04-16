import {NgTemplateOutlet} from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  OnInit,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatTabChangeEvent, MatTabsModule} from "@angular/material/tabs";
import {filterCad} from "@app/cad/cad-shujuyaoqiu";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {FentiCadDialogInput} from "@components/lurushuju/fenti-cad-dialog/fenti-cad-dialog.types";
import {get双开门扇宽生成方式Inputs} from "@components/lurushuju/services/lrsj-status.utils";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf, timeout} from "@lucilor/utils";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {convertOptions, getInputInfoGroup} from "@modules/input/components/input.utils";
import {validateForm} from "@modules/message/components/message/message.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MrbcjfzInputData} from "@views/mrbcjfz/mrbcjfz.types";
import {filterCad as filterCad2} from "@views/mrbcjfz/mrbcjfz.utils";
import {HoutaiData} from "@views/suanliao/suanliao.types";
import {Properties} from "csstype";
import {cloneDeep, debounce, isEmpty} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {firstValueFrom} from "rxjs";
import {CadItemComponent} from "../../cad-item/cad-item.component";
import {CadItemButton} from "../../cad-item/cad-item.types";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {SuanliaoTablesComponent} from "../../suanliao-tables/suanliao-tables.component";
import {
  MenjiaoCadType,
  menjiaoCadTypes,
  SuanliaoDataParams,
  xiaoguotuKeys,
  企料CAD,
  企料组合,
  孔位CAD名字对应关系,
  算料数据,
  算料数据2Keys,
  配合框组合,
  门缝配置,
  门缝配置输入
} from "../../xinghao-data";
import {LrsjPiece} from "../lrsj-piece";
import {MenjiaoCadItemInfo, MenjiaoShiyituCadItemInfo, SuanliaoDataBtnName} from "./lrsj-suanliao-data.types";
import {
  copySuanliaoData,
  getCadSearch,
  getMenjiaoCadInfos,
  getMenjiaoOptionInputInfo,
  getShiyituCadSearch,
  updateMenjiaoData
} from "./lrsj-suanliao-data.utils";

@Component({
  selector: "app-lrsj-suanliao-data",
  imports: [
    CadItemComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatTabsModule,
    MrbcjfzComponent,
    NgScrollbarModule,
    NgTemplateOutlet,
    SuanliaoTablesComponent,
    TypedTemplateDirective
  ],
  templateUrl: "./lrsj-suanliao-data.component.html",
  styleUrl: "./lrsj-suanliao-data.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LrsjSuanliaoDataComponent extends LrsjPiece implements OnInit {
  private dialog = inject(MatDialog);
  private el = inject(ElementRef);
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  xinghao = this.lrsjStatus.xinghao;
  suanliaoDataInfo = this.lrsjStatus.suanliaoDataInfo;
  xinghaozhuanyongCadCount = this.lrsjStatus.xinghaozhuanyongCadCount;
  suanliaoData = this.lrsjStatus.suanliaoDataNew;
  isKailiao = this.lrsjStatus.isKailiao;
  menjiaoOptions = this.lrsjStatus.menjiaoOptionsManager.data;
  saveInfo = output();

  production = environment.production;
  menjiaoCadTypes = menjiaoCadTypes;
  peiheKeys = 配合框组合;
  qiliaoKeys = 企料组合;
  cadNameMap = 孔位CAD名字对应关系;
  emptyCadTemplateType!: {key1: MenjiaoCadType; key2: "配合框CAD" | "企料CAD"; key3: string};

  suanliaoTablesList = viewChildren(SuanliaoTablesComponent);
  inputs = viewChildren(InputComponent);
  inputScrollbar = viewChild<NgScrollbar>("inputScrollbar");
  mrbcjfzs = viewChildren(MrbcjfzComponent);

  async ngOnInit() {
    await this.lrsjStatus.refreshMenshanOptions();
    await this.lrsjStatus.refreshBancaiList();
  }

  onShow = effect(() => {
    const show = this.lrsjStatus.pieceInfos().suanliaoData.show;
    if (show) {
      untracked(() => this.validate(false));
    }
  });

  getOptionInputInfo2(data: any, key: string, style?: Properties, canSearch?: boolean) {
    const info = getMenjiaoOptionInputInfo(
      data,
      key,
      this.menjiaoOptions(),
      () => this.lrsjStatus.menjiaoOptionsManager.fetch(true),
      canSearch
    );
    info.style = style;
    const onChange = info.onChange;
    info.onChange = (val: any, info2: any) => {
      onChange?.(val, info2);
      this.suanliaoData.update((v) => ({...v}));
    };
    if (info.optionsDialog) {
      const dialogOnChange = info.optionsDialog.onChange;
      info.optionsDialog.onChange = (val) => {
        dialogOnChange?.(val);
        this.suanliaoData.update((v) => ({...v}));
      };
    }
    return info;
  }
  form = computed(() => {
    const data = this.suanliaoData();

    const getMenfengInputInfo = (value: (typeof 门缝配置输入)[number]): InputInfo => {
      return {
        type: "number",
        label: value.name,
        model: {data: data.门缝配置, key: value.name},
        onChange: () => {
          this.suanliaoData.update((v) => ({...v}));
        },
        validators: Validators.required
      };
    };
    const optionKeys: (keyof 算料数据)[] = ["门铰", "门扇厚度", "锁边", "铰边"];
    const form1Group: InputInfo[] = [
      getInputInfoGroup(
        optionKeys.map((v) => {
          const canSearchKeys: (keyof 算料数据)[] = ["锁边", "铰边"];
          const canSearch = canSearchKeys.includes(v);
          const info = this.getOptionInputInfo2(data, v, {}, canSearch);
          let w: number;
          switch (v) {
            case "门铰":
              w = 160;
              break;
            case "门扇厚度":
              w = 150;
              break;
            case "锁边":
            case "铰边":
              w = 180;
              break;
            default:
              w = 0;
          }
          info.style = {...info.style, width: `${w}px`};
          return info;
        }),
        {style: {width: "auto", flex: "0 1 auto"}, inputStyle: {flex: `0 0 auto`}, label: "选项"}
      )
    ];
    const 选项要求Form: InputInfo[] = [];
    for (const key in data.选项要求) {
      const value = data.选项要求[key];
      const info = this.getOptionInputInfo2(data, key);
      选项要求Form.push(info);
      delete info.model;
      info.value = value.map((v) => v.mingzi);
      info.optionsDialog = {
        defaultValue: {value: value.find((v) => v.morenzhi)?.mingzi || ""},
        optionKey: key,
        useLocalOptions: true,
        openInNewTab: true,
        onChange(val) {
          data.选项要求[key] = cloneDeep(val.options);
          if (val.defaultValue) {
            for (const item of data.选项要求[key]) {
              if (item.mingzi === val.defaultValue) {
                item.morenzhi = true;
              }
            }
          }
        }
      };
    }
    const form1: InputInfo<typeof data>[] = [
      {
        type: "string",
        label: "名字",
        model: {data, key: "名字"},
        onChange: () => {
          this.suanliaoData.update((v) => ({...v}));
        },
        validators: [
          Validators.required,
          (control) => {
            const value = control.value;
            if (value === "无") {
              return {名字不能为无: true};
            }
            return null;
          }
        ],
        placeholder: "下单显示，请输入有意义的名字"
      },
      getInputInfoGroup(form1Group)
    ];
    if (选项要求Form.length > 0) {
      form1.push(getInputInfoGroup(选项要求Form, {label: "选项要求", style: {width: "auto", flex: "0 1 auto"}}));
    }
    const form2: InputInfo<门缝配置>[] = [
      getInputInfoGroup(门缝配置输入.map(getMenfengInputInfo), {
        style: {width: "auto", flex: "0 1 360px"},
        label: "门缝配置"
      })
    ];
    form1Group.push(...form2);
    return form1;
  });
  key1Infos = computed(() => {
    const key1Infos: ObjectOf<{
      xiaoguotuInputs: InputInfo[];
      suanliaoDataParams: SuanliaoDataParams;
      suanliaogongshiInfo: SuanliaogongshiInfo;
      inputs: InputInfo[];
      title: string;
      mrbjfzInputData: MrbcjfzInputData;
    }> = {};
    const xinghao = this.lrsjStatus.xinghao();
    if (!xinghao) {
      return key1Infos;
    }
    const suanliaoDataInfo = this.suanliaoDataInfo();
    if (!suanliaoDataInfo) {
      return key1Infos;
    }
    const {fenleiName, zuofaName} = suanliaoDataInfo;
    const data = this.suanliaoData();
    for (const key1 of menjiaoCadTypes) {
      const [包边方向, 开启] = key1.split("+");
      const validators: InputInfo["validators"] = [
        (control) => {
          const menjiaoCadInfos = getMenjiaoCadInfos(data);
          if (menjiaoCadInfos[key1].isEmpty) {
            return null;
          }
          return Validators.required(control);
        }
      ];

      const inputs = get双开门扇宽生成方式Inputs(fenleiName, this.menjiaoOptions(), data[key1]);
      const update双开门扇宽生成方式Inputs = () => {
        for (const info of inputs) {
          if (info.hidden) {
            delete info.validators;
          } else {
            info.validators = validators;
          }
        }
      };
      inputs[0].style = {flex: "0 0 250px"};
      const tmpOnChange = inputs[0].onChange;
      inputs[0].onChange = (val, info) => {
        tmpOnChange?.(val, info);
        update双开门扇宽生成方式Inputs();
        this.suanliaoData.update((v) => ({...v}));
      };
      inputs[1].style = {flex: "0 0 180px"};
      update双开门扇宽生成方式Inputs();
      const varNameItem = this.lrsjStatus.varNames().at(0) || {};
      key1Infos[key1] = {
        xiaoguotuInputs: [],
        suanliaoDataParams: {
          选项: {
            型号: xinghao.名字,
            产品分类: fenleiName,
            工艺做法: zuofaName,
            包边方向,
            开启,
            门铰锁边铰边: data.名字
          }
        },
        suanliaogongshiInfo: {
          data: {算料公式: data[key1].算料公式, 输入数据: data[key1].输入数据},
          varNameItem
        },
        inputs: inputs.slice(),
        title: this.getMenjiaoCadTabLabel(key1),
        mrbjfzInputData: this.getMrbcjfzInputData(key1)
      };
      // if (component.parentInfo.isZhijianUser) { // TODO
      // eslint-disable-next-line no-constant-condition
      if (true) {
        const menshans = this.lrsjStatus.menshanOptions();
        key1Infos[key1].xiaoguotuInputs = xiaoguotuKeys.map<InputInfo>((key) => {
          return {
            type: "select",
            label: key,
            options: convertOptions(menshans),
            clearable: true,
            model: {data: data[key1], key},
            style: {width: "100px", flex: "1 1 auto"},
            optionsDialog: {
              useLocalOptions: true,
              onChange: async () => {
                this.suanliaoData.update((v) => ({...v}));
              }
            }
          };
        });
      }
    }
    return key1Infos;
  });
  getMenjiaoCadTabLabel(key1: MenjiaoCadType) {
    const item = this.suanliaoData()[key1];
    const isItemEmpty = () => {
      if (item.算料CAD.length > 0) {
        return false;
      }
      if (Object.values(item.企料CAD).some((v) => v.cad)) {
        return false;
      }
      if (Object.values(item.配合框CAD).some((v) => v.cad)) {
        return false;
      }
      return true;
    };
    let label = key1;
    if (!isItemEmpty()) {
      label += "（有数据）";
    }
    return label;
  }
  getMrbcjfzInputData(key1: MenjiaoCadType): MrbcjfzInputData {
    const data = this.suanliaoData();
    const morenbancai = cloneDeep(data[key1].板材分组);
    const cads = data[key1].算料CAD.map((v) => new CadData(v.json)).filter((v) => filterCad2(v, {skipTpyeCheck: true}));
    const huajians = this.lrsjStatus.filterHuajians(data[key1]);
    const bancaiList = this.lrsjStatus.bancaiList();
    return {
      xinghao: this.xinghao()?.名字 || "",
      morenbancai,
      cads,
      huajians,
      bancaiList: bancaiList || undefined,
      isLocal: true,
      noScroll: true,
      noToolbar: true
    };
  }

  cadItemButtons = computed(() => {
    const buttons: CadItemButton<MenjiaoCadItemInfo>[] = [{name: "删除", onClick: this.removeCad.bind(this)}];
    if (this.isKailiao()) {
      buttons.push({name: "添加孔位配置", onClick: this.addKwpz.bind(this)}, {name: "添加开料参数", onClick: this.addKlcs.bind(this)});
    }
    return buttons;
  });
  cadItemButtons2 = computed(() => {
    const buttons: CadItemButton<MenjiaoCadItemInfo>[] = [{name: "选择", onClick: this.selectCad.bind(this)}];
    return buttons;
  });
  shiyituCadItemButtons = computed(() => {
    const buttons: CadItemButton<MenjiaoShiyituCadItemInfo>[] = [
      {name: "选择", onClick: this.selectShiyituCad.bind(this)},
      {name: "删除", onClick: this.removeShiyituCad.bind(this)}
    ];
    return buttons;
  });
  hiddenShiyitus = signal<number[]>([]);
  shiyituSearchInputInfo = computed(() => {
    const inputs: ObjectOf<InputInfo> = {};
    for (const key1 of menjiaoCadTypes) {
      inputs[key1] = {
        type: "string",
        label: "搜索",
        onInput: debounce((val) => {
          const hiddenShiyitus: number[] = [];
          const yaoqiu = this.status.getCadYaoqiu("算料单示意图");
          if (yaoqiu) {
            for (const [i, cad] of this.suanliaoData()[key1].示意图CAD.算料单示意图.entries()) {
              if (!filterCad(val, cad, yaoqiu)) {
                hiddenShiyitus.push(i);
              }
            }
          }
          this.hiddenShiyitus.set(hiddenShiyitus);
        }, 500)
      };
    }
    return inputs;
  });

  getSuanliaoTables(key1: MenjiaoCadType) {
    return this.suanliaoTablesList().find((v) => {
      const {包边方向, 开启} = v.suanliaoDataParams.选项;
      return key1 === `${包边方向}+${开启}`;
    });
  }
  getTableCadName(name: string) {
    if (["小扇铰企料", "小扇小锁料"].includes(name)) {
      return name.replace("小扇", "");
    }
    return name;
  }
  async addKwpz(component: CadItemComponent<MenjiaoCadItemInfo>) {
    const {key1} = component.customInfo();
    const suanliaoDataParams = this.key1Infos()[key1].suanliaoDataParams;
    const response = await this.http.mongodbInsert("kailiaokongweipeizhi", {
      ...suanliaoDataParams,
      名字: this.getTableCadName(component.cadName())
    });
    if (response) {
      this.getSuanliaoTables(key1)?.updateKlkwpzTable();
    }
  }
  async addKlcs(component: CadItemComponent<MenjiaoCadItemInfo>) {
    const {key1} = component.customInfo();
    const suanliaoDataParams = this.key1Infos()[key1].suanliaoDataParams;
    const response = await this.http.mongodbInsert<HoutaiData>("kailiaocanshu", {
      ...suanliaoDataParams,
      名字: this.getTableCadName(component.cadName()) + "中空参数",
      分类: "切中空"
    });
    if (response) {
      this.getSuanliaoTables(key1)?.updateKlcsTable();
    }
  }

  getCadshujuyaoqiu(type: string) {
    return this.status.getCadYaoqiu(type);
  }
  async selectCad0(info: typeof this.emptyCadTemplateType) {
    const data = this.suanliaoData();
    const {key1, key2, key3} = info;
    const yaoqiu = this.getCadshujuyaoqiu(key3);
    if (!yaoqiu) {
      return;
    }
    const {search, addCadData} = getCadSearch(data, yaoqiu, key1, key2, key3);
    const imgIdPrev = data[key1][key2][key3].cad?.json.info?.imgId;
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "single",
        collection: "cad",
        standaloneSearch: true,
        raw: true,
        search,
        addCadData,
        yaoqiu
      }
    });
    const cad = result?.[0] as unknown as HoutaiCad | undefined;
    if (cad) {
      const name = this.cadNameMap[key3] || key3;
      const houtaiId = cad._id;
      const cadData = new CadData(cad.json, true);
      cadData.name = name;
      if (imgIdPrev) {
        cadData.info.imgId = imgIdPrev;
        cadData.info.imgUpdate = true;
      } else {
        delete cadData.info.imgId;
      }
      if (!data[key1][key2][key3]) {
        data[key1][key2][key3] = {};
      }
      data[key1][key2][key3].cad = getHoutaiCad(cadData, {houtaiId});
      updateMenjiaoData(this.suanliaoData);
      await this.validate(false);
    }
  }
  async selectCad(component: CadItemComponent<MenjiaoCadItemInfo>) {
    await this.selectCad0(component.customInfo());
  }
  async removeCad(component: CadItemComponent<MenjiaoCadItemInfo>) {
    const {key1, key2, key3} = component.customInfo();
    const data = this.suanliaoData()[key1][key2][key3];
    if (!data.cad || !(await this.message.confirm(`确定删除【${data.cad.名字}】吗？`))) {
      return;
    }
    delete data.cad;
    if (data.企料分体CAD) {
      for (const key of keysOf(data.企料分体CAD)) {
        data.企料分体CAD[key] = null;
      }
    }
    updateMenjiaoData(this.suanliaoData);
    await this.validate(false);
  }

  async selectShiyituCad(key1: MenjiaoCadType | CadItemComponent<MenjiaoShiyituCadItemInfo>) {
    if (this.xinghaozhuanyongCadCount() > 0) {
      await this.message.alert("不可以选择");
      return;
    }
    if (typeof key1 !== "string") {
      key1 = key1.customInfo().key1;
    }
    const suanliaoData = this.suanliaoData();
    const data = suanliaoData[key1].示意图CAD;
    const yaoqiu = this.status.getCadYaoqiu("算料单示意图");
    if (!yaoqiu) {
      return;
    }
    const {search, addCadData} = getShiyituCadSearch(suanliaoData, key1);
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "multiple",
        collection: "cad",
        search,
        addCadData,
        yaoqiu
      }
    });
    if (result) {
      for (const v of result) {
        const houtaiId = v.id;
        const v2 = v.clone(true);
        delete v2.info.imgId;
        data.算料单示意图.push(getHoutaiCad(v2, {houtaiId}));
      }
      updateMenjiaoData(this.suanliaoData);
    }
  }
  async removeShiyituCad(component: CadItemComponent<MenjiaoShiyituCadItemInfo>) {
    const {key1, index} = component.customInfo();
    const suanliaoData = this.suanliaoData();
    const data = suanliaoData[key1].示意图CAD;
    const cad = data.算料单示意图[index];
    if (!cad || !(await this.message.confirm(`确定删除【${cad.名字}】吗？`))) {
      return;
    }
    data.算料单示意图.splice(index, 1);
    updateMenjiaoData(this.suanliaoData);
  }

  getOpenCadOptions(key1: MenjiaoCadType): OpenCadOptions {
    const info = this.key1Infos()[key1];
    return {
      suanliaogongshiInfo: info.suanliaogongshiInfo,
      suanliaoTablesInfo: {params: info.suanliaoDataParams}
    };
  }
  afterEditCad(key1: MenjiaoCadType) {
    this.getSuanliaoTables(key1)?.update();
  }
  getFentiDialogInput(key1: MenjiaoCadType, key2: string, key3: string): FentiCadDialogInput | undefined {
    if (key2 === "企料CAD") {
      const item = this.suanliaoData()[key1];
      return {
        data: item[key2][key3]["企料分体CAD"] || {},
        cad数据要求: this.getCadshujuyaoqiu("企料分体"),
        gongshis: item.算料公式
      };
    }
    return undefined;
  }

  async gotoSuanliaoCads(key1: MenjiaoCadType | null) {
    if (!key1) {
      return;
    }
    await this.lrsjStatus.gotoSuanliaoCads(key1);
  }
  async copy(key1: MenjiaoCadType) {
    const data = this.suanliaoData();
    const suanliaoDataParams = this.key1Infos()[key1].suanliaoDataParams;
    const result: MenjiaoCadType | "" | null = await this.message.prompt({
      type: "select",
      label: "从哪个复制",
      options: menjiaoCadTypes.filter((v) => v !== key1),
      validators: Validators.required
    });
    if (!result) {
      return;
    }
    const data2 = data[result];
    data[key1].板材分组 = cloneDeep(data2.板材分组);
    data[key1].算料公式 = cloneDeep(data2.算料公式);
    data[key1].测试用例 = cloneDeep(data2.测试用例);
    data[key1].算料CAD = cloneDeep(data2.算料CAD);
    data[key1].企料CAD = {};
    for (const key2 in data2.企料CAD) {
      const item = {...data2.企料CAD[key2]};
      let cad: 企料CAD["cad"] = undefined;
      if (data2.企料CAD[key2].cad) {
        cad = getHoutaiCad(new CadData(data2.企料CAD[key2].cad.json));
      }
      delete item.cad;
      data[key1].企料CAD[key2] = {cad, ...cloneDeep(item)};
    }
    this.suanliaoData.set({...data});
    const from = cloneDeep(suanliaoDataParams);
    const [包边方向2, 开启2] = result.split("+");
    from.选项.包边方向 = 包边方向2;
    from.选项.开启 = 开启2;
    const copyResult = await copySuanliaoData(this.http, data2, data[key1], from, suanliaoDataParams);
    if (copyResult) {
      this.message.snack("复制成功");
      this.getSuanliaoTables(key1)?.update();
    }
  }
  async empty(key1: MenjiaoCadType) {
    if (!(await this.message.confirm("确定清空吗？"))) {
      return;
    }
    const data = this.suanliaoData();
    const item = data[key1];
    for (const key2 in item.配合框CAD) {
      delete item.配合框CAD[key2].cad;
    }
    for (const key2 in item.企料CAD) {
      delete item.企料CAD[key2].cad;
    }
    item.算料CAD = [];
    item.算料公式 = [];
    item.测试用例 = [];
    item.输入数据 = [];
    for (const item2 of Object.values(item.板材分组)) {
      item2.CAD = [];
    }
    this.suanliaoData.set({...data});
    const suanliaoDataParams = this.key1Infos()[key1].suanliaoDataParams;
    await this.http.mongodbDelete("kailiaokongweipeizhi", {filter: suanliaoDataParams});
    await this.http.mongodbDelete("kailiaocanshu", {filter: suanliaoDataParams});
    await this.getSuanliaoTables(key1)?.update();
  }

  getEmptyErrors() {
    return {others: false, key1: {} as Partial<Record<MenjiaoCadType, string>>};
  }
  errors = signal(this.getEmptyErrors());
  key1Errors = signal<ObjectOf<{msg: string; missingCads: string[]; bcfz: string[]} | undefined>>({});
  async validate(alert: boolean) {
    this.lrsjStatus.suanliaoCadsValidateStart$.next({alert});
    const cadsErrors = await firstValueFrom(this.lrsjStatus.suanliaoCadsValidateEnd$);
    if (cadsErrors.length > 0) {
      return false;
    }

    const errors = this.getEmptyErrors();
    const {errors: inputErrors} = await validateForm(this.inputs());
    const data = this.suanliaoData();
    const key1Infos = this.key1Infos();
    const key1Errors: ReturnType<typeof this.key1Errors> = {};
    const mrbcjfzs = this.mrbcjfzs();

    const key1ErrorsList = await Promise.all(
      menjiaoCadTypes.map(async (key1, i) => {
        if (!key1Infos[key1]) {
          return null;
        }
        key1Errors[key1] = {msg: "", missingCads: [], bcfz: []};
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
        const missingCads: string[] = [];
        key1Errors[key1].missingCads = missingCads;
        for (const key2 of 算料数据2Keys) {
          for (const key3 in value[key2]) {
            if (!value[key2][key3].cad) {
              missingCads.push(key3);
            }
          }
        }
        const errors2 = [];
        if (missingCads.length > 0) {
          errors2.push("选择" + missingCads.join("、"));
          errors.others = true;
        }
        const mrbcjfz = mrbcjfzs[i];
        let mrbcjfzErrors: string[] | undefined;
        if (mrbcjfz) {
          mrbcjfzErrors = mrbcjfz.checkSubmit();
          data[key1].板材分组 = mrbcjfz.xinghao().默认板材;
        } else {
          const mrbcjfzResult = await openMrbcjfzDialog(this.dialog, {
            width: "0",
            height: "0",
            data: {id: -1, table: "", inputData: this.getMrbcjfzInputData(key1), dryRun: true}
          });
          mrbcjfzErrors = mrbcjfzResult?.errors;
        }
        if (mrbcjfzErrors && mrbcjfzErrors.length > 0) {
          errors2.push("检查板材分组");
          key1Errors[key1].bcfz = mrbcjfzErrors;
        }
        if (errors2.length > 0) {
          const error = `请${errors2.join("并")}`;
          key1Errors[key1].msg = error;
          errors.key1[key1] = error;
          return {[error]: true};
        } else {
          key1Errors[key1].msg = "";
          return null;
        }
      })
    );
    for (const input of this.inputs()) {
      if (!input.isValid()) {
        let key1El: HTMLElement | null = input.el;
        while (key1El && !key1El.dataset.key1) {
          key1El = key1El.parentElement;
        }
        const key1 = key1El?.dataset.key1 as MenjiaoCadType | undefined;
        if (key1) {
          // if (!key1Errors[key1]) {
          //   key1Errors[key1] = {msg: "", missingCads: [], bcfz: []};
          // }
          // if (!key1Errors[key1].msg) {
          //   key1Errors[key1].msg = `【${input.info.label}】` + input.getErrorMsg();
          // }
          if (!errors.key1[key1]) {
            errors.key1[key1] = `【${input.info().label}】` + input.getErrorMsg();
          }
        }
      }
    }
    this.key1Errors.set(key1Errors);
    this.errors.set(errors);
    this.suanliaoData.update((v) => ({...v}));

    if (alert) {
      const msgs: string[] = [];
      if (errors.others) {
        msgs.push("无法保存，输入不完整，请补充");
      }
      const key1Keys = keysOf(errors.key1);
      if (key1Keys.length > 0) {
        for (const key of key1Keys) {
          msgs.push(`【${key}】${errors.key1[key]}`);
          const bcfzErrors = key1Errors[key]?.bcfz;
          if (bcfzErrors && bcfzErrors.length > 0) {
            msgs.push(...bcfzErrors);
          }
        }
        const index = menjiaoCadTypes.indexOf(key1Keys[0]);
        if (index >= 0) {
          this.menjiaoCadTabIndex.set(index);
          const {missingCads, bcfz} = key1Errors[menjiaoCadTypes[index]] || {};
          setTimeout(() => {
            if (!isEmpty(missingCads)) {
              this.onTriggerBtn("包边+企料数据");
            } else if (!isEmpty(bcfz)) {
              this.onTriggerBtn("板材分组");
            }
          }, 0);
        }
      }
      if (msgs.length > 0) {
        this.message.error(msgs.join("<br>"));
      }
    }

    if (!isEmpty(inputErrors)) {
      errors.others = true;
      return false;
    }
    if (key1ErrorsList.some((v) => !isEmpty(v))) {
      return false;
    }
    return true;
  }
  async submit() {
    if (!(await this.validate(true))) {
      return;
    }
    const data = this.suanliaoData();
    const xinghao = this.xinghao();
    const suanliaoDataInfo = this.suanliaoDataInfo();
    let refreshSuanliaoTables = false;
    const dataOld = this.lrsjStatus.suanliaoDataOld();
    if (xinghao && suanliaoDataInfo && dataOld) {
      const {fenleiName, zuofaName, suanliaoDataIndex} = suanliaoDataInfo;
      const mingziOld = dataOld.名字;
      const mingziNew = data.名字;
      const xinghaoName = xinghao.名字;
      if (mingziOld && mingziOld !== mingziNew) {
        const params = {xinghao: xinghaoName, fenlei: fenleiName, gongyi: zuofaName, mingziOld, mingziNew};
        const result = await this.http.getData("shuju/api/onMenjiaoNameChange", params);
        if (result) {
          for (const item of Object.values(this.key1Infos())) {
            item.suanliaoDataParams.选项.门铰锁边铰边 = mingziNew;
          }
          this.suanliaoDataInfo.set({...suanliaoDataInfo});
          refreshSuanliaoTables = true;
        } else {
          return;
        }
      }
      const zuofaIndex = xinghao.产品分类[fenleiName].findIndex((v) => v.名字 === zuofaName);
      if (zuofaIndex >= 0) {
        const zuofa = xinghao.产品分类[fenleiName][zuofaIndex];
        if (data.默认值) {
          for (const [i, item] of zuofa.算料数据.entries()) {
            if (i !== zuofaIndex) {
              item.默认值 = false;
            }
          }
        }
        if (suanliaoDataIndex >= 0) {
          zuofa.算料数据[suanliaoDataIndex] = data;
        } else {
          zuofa.算料数据.push(data);
        }
        await this.lrsjStatus.submitZuofa(fenleiName, zuofa, ["算料数据"]);
      }
    }
    if (refreshSuanliaoTables) {
      this.suanliaoTablesList().forEach((v) => v.update());
    }
    this.lrsjStatus.suanliaoDataSubmit.next();
  }

  currKey1 = signal<MenjiaoCadType | null>(null);
  loadedKey1s = signal<MenjiaoCadType[]>([]);
  menjiaoCadTabIndex = signal(0);
  onMenjiaoCadTabChange(event: MatTabChangeEvent) {
    if (!event.tab) {
      return;
    }
    const label = event.tab.textLabel;
    const loadedKey1s = this.loadedKey1s();
    for (const key of menjiaoCadTypes) {
      if (label.startsWith(key)) {
        if (!loadedKey1s.includes(key)) {
          loadedKey1s.push(key);
        }
        this.currKey1.set(key);
        break;
      }
    }
    this.loadedKey1s.set([...loadedKey1s]);
  }

  onTriggerBtn(name: SuanliaoDataBtnName) {
    switch (name) {
      case "保存":
        this.submit();
        break;
      case "选项信息":
        this.scrollToElement("app-input.选项");
        break;
      case "门缝参数":
        this.scrollToElement("app-input.门缝配置");
        break;
      case "包边+企料数据":
        this.scrollToElement(".menjiao-data");
        break;
      case "板材分组":
        this.scrollToElement("app-mrbcjfz");
        break;
      case "CAD配置":
        this.gotoSuanliaoCads(this.currKey1());
        break;
      default:
        this.message.alert("?");
    }
  }
  onTriggerBtnEff = effect(() => {
    const name = this.lrsjStatus.triggerSuanliaoDataBtn()?.name;
    if (typeof name !== "string") {
      return;
    }
    untracked(() => {
      this.onTriggerBtn(name);
    });
  });
  async scrollToElement(selector: string) {
    const show = this.lrsjStatus.pieceInfos().suanliaoData.show;
    if (!show) {
      const suanliaoCadsInfo = this.lrsjStatus.suanliaoDataInfo();
      if (suanliaoCadsInfo) {
        const {fenleiName, zuofaName, suanliaoDataIndex} = suanliaoCadsInfo;
        await this.lrsjStatus.gotoSuanliaoData(fenleiName, zuofaName, suanliaoDataIndex);
        await timeout(0);
      } else {
        return;
      }
    }
    const el = this.el.nativeElement.querySelector(selector);
    if (el) {
      this.inputScrollbar()?.scrollToElement(el);
    }
  }
}
