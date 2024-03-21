import {NgClass, NgStyle, NgTemplateOutlet} from "@angular/common";
import {Component, HostBinding, Inject, OnInit, QueryList, ViewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatTabChangeEvent, MatTabsModule} from "@angular/material/tabs";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {MrbcjfzDialogInput, openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {CadData, CadViewerConfig} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf, RequiredKeys} from "@lucilor/utils";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoGroup, InputInfoOptions, InputInfoSelect} from "@modules/input/components/input.types";
import {validateForm} from "@modules/message/components/message/message.utils";
import {MessageService} from "@modules/message/services/message.service";
import csstype from "csstype";
import {cloneDeep, isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadItemComponent} from "../cad-item/cad-item.component";
import {CadItemButton} from "../cad-item/cad-item.types";
import {getOptionInputInfo, getOptions2} from "../lurushuju-index/lurushuju-index.utils";
import {openSuanliaoDataDialog} from "../suanliao-data-dialog/suanliao-data-dialog.component";
import {SuanliaoDataInput} from "../suanliao-data-dialog/suanliao-data-dialog.type";
import {SuanliaoTablesComponent} from "../suanliao-tables/suanliao-tables.component";
import {
  get算料数据,
  MenjiaoCadType,
  menjiaoCadTypes,
  SuanliaoDataParams,
  xiaoguotuKeys,
  企料组合,
  孔位CAD名字对应关系,
  算料数据,
  算料数据2Keys,
  配合框组合,
  门缝配置,
  门缝配置输入
} from "../xinghao-data";
import {MenjiaoCadItemInfo, MenjiaoInput, MenjiaoOutput, MenjiaoShiyituCadItemInfo} from "./menjiao-dialog.types";
import {
  autoFillMenjiao,
  copySuanliaoData,
  getCadSearch,
  getMenjiaoCadInfos,
  getShiyituCadSearch,
  updateMenjiaoData
} from "./menjiao-dialog.utils";

@Component({
  selector: "app-menjiao-dialog",
  standalone: true,
  imports: [
    CadItemComponent,
    InputComponent,
    MatButtonModule,
    MatTabsModule,
    NgClass,
    NgScrollbarModule,
    NgStyle,
    NgTemplateOutlet,
    SuanliaoTablesComponent,
    TypedTemplateDirective
  ],
  templateUrl: "./menjiao-dialog.component.html",
  styleUrl: "./menjiao-dialog.component.scss"
})
export class MenjiaoDialogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";

  cadViewerConfig: Partial<CadViewerConfig> = {width: 200, height: 100, lineGongshi: 20};
  formData = get算料数据();
  menjiaoCadTypes = menjiaoCadTypes;
  peiheKeys = 配合框组合;
  qiliaoKeys = 企料组合;
  cadWidth = 300;
  cadHeight = 150;
  cadItemButtons: CadItemButton<MenjiaoCadItemInfo>[];
  shiyituCadItemButtons: CadItemButton<MenjiaoShiyituCadItemInfo>[];
  emptyCadTemplateType!: {key1: MenjiaoCadType; key2: "配合框CAD" | "企料CAD"; key3: string};
  key1Infos: ObjectOf<{
    xiaoguotuInputs: InputInfo[];
    error: string;
    suanliaoDataParams: SuanliaoDataParams;
    suanliaogongshiInfo: SuanliaogongshiInfo;
    isLoaded: boolean;
  }> = {};
  cadNameMap = 孔位CAD名字对应关系;
  menjiaoTabGroupIndex = 0;

  form: InputInfo[] = [];
  @ViewChildren(InputComponent) inputs?: QueryList<InputComponent>;
  @ViewChildren(SuanliaoTablesComponent) suanliaoTablesList?: QueryList<SuanliaoTablesComponent>;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    public dialogRef: MatDialogRef<MenjiaoDialogComponent, MenjiaoOutput>,
    @Inject(MAT_DIALOG_DATA) public data: MenjiaoInput
  ) {
    if (!this.data) {
      this.data = {};
    }
    this.cadItemButtons = [
      {name: "删除", onClick: this.removeCad.bind(this)},
      {name: "选择", onClick: this.selectCad.bind(this)}
    ];
    if (this.data.isKailiao) {
      this.cadItemButtons.push(
        ...[
          {name: "添加孔位配置", onClick: this.addKwpz.bind(this)},
          {name: "添加开料参数", onClick: this.addKlcs.bind(this)}
        ]
      );
    }
    this.shiyituCadItemButtons = [
      {name: "选择", onClick: this.selectShiyituCad.bind(this)},
      {name: "删除", onClick: this.removeShiyituCad.bind(this)}
    ];
  }

  async ngOnInit() {
    await this.update();
    await this.validate();
  }

  async update() {
    const {data: data0, component} = this.data;
    if (!component) {
      return;
    }
    this.formData = data0 ? cloneDeep(data0) : get算料数据();
    const data = this.formData;
    const 产品分类 = data0 ? data0.产品分类 : component.fenleiName;
    data.产品分类 = 产品分类;
    updateMenjiaoData(data);
    const getGroupStyle = (style?: csstype.Properties): csstype.Properties => {
      return {display: "flex", flexWrap: "wrap", marginBottom: "10px", ...style};
    };
    const getInfoStyle = (n: number, style?: csstype.Properties): csstype.Properties => {
      const percent = 100 / n;
      const margin = 5;
      return {width: `calc(${percent}% - ${margin * 2}px)`, margin: `${margin}px`, ...style};
    };
    const getOptionInputInfo2 = (key: keyof 算料数据, n: number): InputInfoSelect => {
      return getOptionInputInfo(component.menjiaoOptionsAll, key, (info) => {
        info.model = {data, key};
        if (!info.readonly && !info.disabled) {
          info.validators = Validators.required;
        }
        info.onChange = () => {
          updateMenjiaoData(data);
        };
        info.style = getInfoStyle(n);
        const dialogKeys: (keyof 算料数据)[] = ["锁边", "铰边"];
        const openInNewTabKeys: (keyof 算料数据)[] = ["门铰", "门扇厚度"];
        if (dialogKeys.includes(key)) {
          info.optionsDialog = {
            noImage: true,
            defaultValue: {value: data.选项默认值[key] || ""},
            optionKey: key,
            useLocalOptions: true,
            openInNewTab: true,
            onChange(val) {
              if (info.multiple) {
                data.选项默认值[key] = val.defaultValue || "";
              }
            }
          };
        } else if (openInNewTabKeys.includes(key)) {
          info.openInNewTab = {
            optionKey: key,
            onOptionsChange: (options) => {
              info.options = getOptions2(options.data);
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
    const optionKeys: (keyof 算料数据)[] = ["产品分类", "开启", "门铰", "门扇厚度", "锁边", "铰边"];
    const 使用双开门扇宽生成方式 = () => component.fenleiName === "双开";
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
    this.form = form1;

    this.key1Infos = {};
    for (const key1 of menjiaoCadTypes) {
      const [包边方向, 开启] = key1.split("+");
      this.key1Infos[key1] = {
        xiaoguotuInputs: [],
        error: "",
        suanliaoDataParams: {
          选项: {
            型号: component.xinghaoName,
            产品分类: component.fenleiName,
            工艺做法: component.gongyiName,
            包边方向,
            开启,
            门铰锁边铰边: data.名字
          }
        },
        suanliaogongshiInfo: {
          data: {算料公式: data[key1].算料公式, 测试用例: data[key1].测试用例, 输入数据: data[key1].输入数据},
          varNames: component.varNames
        },
        isLoaded: key1 === "包边在外+外开"
      };
      // if (component.parentInfo.isZhijianUser) { // TODO
      // eslint-disable-next-line no-constant-condition
      if (true) {
        const options: InputInfoOptions = component.menshans.map((v) => v.mingzi);
        this.key1Infos[key1].xiaoguotuInputs = xiaoguotuKeys.map<InputInfo>((key) => {
          return {
            type: "select",
            label: key,
            options,
            clearable: true,
            model: {data: data[key1], key},
            style: getInfoStyle(6)
          };
        });
      }
    }
  }

  async submit(close: boolean) {
    if (await this.validate()) {
      const result: MenjiaoOutput = {data: this.formData};
      let refreshSuanliaoTables = false;
      if (this.data.data) {
        const mingziOld = this.data.data.名字;
        const mingziNew = this.formData.名字;
        const {xinghaoName, fenleiName, gongyiName} = this.data.component || {};
        if (mingziOld && mingziOld !== mingziNew) {
          const params = {xinghao: xinghaoName, fenlei: fenleiName, gongyi: gongyiName, mingziOld, mingziNew};
          const result = await this.http.getData("shuju/api/onMenjiaoNameChange", params);
          if (result) {
            for (const item of Object.values(this.key1Infos)) {
              item.suanliaoDataParams.选项.门铰锁边铰边 = mingziNew;
            }
            this.data.data.名字 = mingziNew;
            refreshSuanliaoTables = true;
          } else {
            return;
          }
        }
      }
      this.data.onSubmit?.(result);
      if (close) {
        this.dialogRef.close(result);
      } else if (refreshSuanliaoTables) {
        this.suanliaoTablesList?.forEach((v) => v.update());
      }
    } else {
      this.message.error("无法保存，输入不完整，请补充");
    }
  }

  async cancel(confirm: boolean) {
    if (!confirm || (await this.message.confirm("确定关闭吗？"))) {
      this.dialogRef.close();
    }
  }

  autoFill() {
    if (!this.data.component) {
      return;
    }
    autoFillMenjiao(this.formData, this.data.component.menjiaoOptionsAll);
  }

  async selectCad0(info: typeof this.emptyCadTemplateType) {
    const data = this.formData;
    const {key1, key2, key3} = info;
    const {search, addCadData} = getCadSearch(data, key1, key2, key3);
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "single",
        collection: "cad",
        standaloneSearch: true,
        raw: true,
        search,
        addCadData,
        hideCadInfo: true
      }
    });
    const cad = result?.[0] as unknown as HoutaiCad | undefined;
    if (cad) {
      const name = this.cadNameMap[key3] || key3;
      cad.名字 = name;
      cad.json.name = name;
      if (!data[key1][key2][key3]) {
        data[key1][key2][key3] = {};
      }
      data[key1][key2][key3].cad = cad;
      updateMenjiaoData(this.formData);
    }
  }

  async selectCad(component: CadItemComponent<MenjiaoCadItemInfo>) {
    await this.selectCad0(component.customInfo);
  }

  async removeCad(component: CadItemComponent<MenjiaoCadItemInfo>) {
    const {key1, key2, key3} = component.customInfo;
    const data = this.formData[key1][key2][key3];
    if (!data.cad || !(await this.message.confirm(`确定删除【${data.cad.名字}】吗？`))) {
      return;
    }
    delete data.cad;
    if (data.企料分体CAD) {
      for (const key of keysOf(data.企料分体CAD)) {
        data.企料分体CAD[key] = null;
      }
    }
    updateMenjiaoData(this.formData);
  }

  async selectShiyituCad(key1: MenjiaoCadType | CadItemComponent<MenjiaoShiyituCadItemInfo>) {
    if (typeof key1 !== "string") {
      key1 = key1.customInfo.key1;
    }
    const data = this.formData[key1].示意图CAD;
    const checkedItems = data.算料单示意图.map((v) => v.json.id);
    const {component} = this.data;
    if (!component) {
      return;
    }
    const {search, addCadData} = getShiyituCadSearch(this.formData, key1);
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "multiple",
        collection: "cad",
        raw: true,
        hideCadInfo: true,
        search,
        checkedItems,
        addCadData
      }
    });
    if (result) {
      data.算料单示意图 = result as unknown as HoutaiCad[];
      updateMenjiaoData(this.formData);
    }
  }

  async removeShiyituCad(component: CadItemComponent<MenjiaoShiyituCadItemInfo>) {
    const {key1, index} = component.customInfo;
    const data = this.formData[key1].示意图CAD;
    const cad = data.算料单示意图[index];
    if (!cad || !(await this.message.confirm(`确定删除【${cad.名字}】吗？`))) {
      return;
    }
    data.算料单示意图.splice(index, 1);
    updateMenjiaoData(this.formData);
  }

  getMrbcjfzDialogInput(key1: MenjiaoCadType): MrbcjfzDialogInput {
    const {component} = this.data;
    if (!component) {
      return {id: -1, table: ""};
    }
    const data = this.formData;
    const morenbancai = cloneDeep(data[key1].板材分组);
    const cads = data[key1].算料CAD.map((v) => new CadData(v.json));
    const huajians = component.filterHuajians(data[key1]);
    return {
      id: -1,
      table: "",
      inputData: {
        xinghao: component.xinghaoName,
        morenbancai,
        cads,
        huajians,
        bancaiList: component.bancaiList,
        isLocal: true
      }
    };
  }

  async editBcfz(key1: MenjiaoCadType) {
    const result = await openMrbcjfzDialog(this.dialog, {
      data: this.getMrbcjfzDialogInput(key1)
    });
    if (result) {
      this.formData[key1].板材分组 = result.data.默认板材;
      await this.validate();
    }
  }

  getSuanliaoTables(key1: MenjiaoCadType) {
    return this.suanliaoTablesList?.find((v) => {
      const {包边方向, 开启} = v.suanliaoDataParams.选项;
      return key1 === `${包边方向}+${开启}`;
    });
  }

  async editSuanliaoData(key1: MenjiaoCadType) {
    const {component, isKailiao} = this.data;
    if (!component) {
      return;
    }
    const data = this.formData;
    const suanliaoData: SuanliaoDataInput["data"] = {
      算料公式: data[key1].算料公式,
      测试用例: data[key1].测试用例,
      算料CAD: data[key1].算料CAD,
      输入数据: data[key1].输入数据
    };
    const result = await openSuanliaoDataDialog(this.dialog, {
      data: {
        data: suanliaoData,
        varNames: component.varNames,
        suanliaoDataParams: this.key1Infos[key1].suanliaoDataParams,
        component,
        key1,
        isKailiao
      }
    });
    if (result) {
      Object.assign(data[key1], result.data);
      for (const key1 of menjiaoCadTypes) {
        if (this.key1Infos[key1]) {
          this.key1Infos[key1].suanliaogongshiInfo.data = {
            算料公式: data[key1].算料公式,
            测试用例: data[key1].测试用例,
            输入数据: data[key1].输入数据
          };
        }
      }
      this.getSuanliaoTables(key1)?.update();
    }
  }

  async copy(key1: MenjiaoCadType) {
    const {component} = this.data;
    if (!component) {
      return;
    }
    const data = this.formData;
    const suanliaoDataParams = this.key1Infos[key1].suanliaoDataParams;
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
    const {component} = this.data;
    if (!component) {
      return;
    }
    const data = this.formData[key1];
    for (const key2 in data.配合框CAD) {
      delete data.配合框CAD[key2].cad;
    }
    for (const key2 in data.企料CAD) {
      delete data.企料CAD[key2].cad;
    }
    data.算料CAD = [];
    data.算料公式 = [];
    data.测试用例 = [];
    data.输入数据 = [];
    for (const item of Object.values(data.板材分组)) {
      item.CAD = [];
    }
    const suanliaoDataParams = this.key1Infos[key1].suanliaoDataParams;
    await this.http.mongodbDelete("kailiaokongweipeizhi", {filter: suanliaoDataParams});
    await this.http.mongodbDelete("kailiaocanshu", {filter: suanliaoDataParams});
    await this.getSuanliaoTables(key1)?.update();
  }

  async validate() {
    const {inputs, formData: data} = this;
    const {errors: inputErrors} = await validateForm(inputs?.toArray() || []);

    const key1Errors = await Promise.all(
      menjiaoCadTypes.map(async (key1) => {
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
        for (const key2 of 算料数据2Keys) {
          for (const key3 in value[key2]) {
            if (!value[key2][key3].cad) {
              missingValues.push(key3);
            }
          }
        }
        const errors = [];
        if (missingValues.length > 0) {
          errors.push("选择" + missingValues.join("、"));
        }
        const mrbcjfzResult = await openMrbcjfzDialog(this.dialog, {
          width: "0",
          height: "0",
          data: {...this.getMrbcjfzDialogInput(key1), dryRun: true}
        });
        if (mrbcjfzResult && mrbcjfzResult.errors.length > 0) {
          errors.push("检查板材分组");
        }
        if (errors.length > 0) {
          const error = `请${errors.join("并")}`;
          this.key1Infos[key1].error = error;
          return {[error]: true};
        } else {
          this.key1Infos[key1].error = "";
          return null;
        }
      })
    );

    if (!isEmpty(inputErrors)) {
      return false;
    }
    if (key1Errors.some((v) => !isEmpty(v))) {
      return false;
    }
    return true;
  }

  getTableCadName(cad: HoutaiCad) {
    const name = cad.名字;
    if (["小扇铰企料", "小扇小锁料"].includes(name)) {
      return name.replace("小扇", "");
    }
    return name;
  }

  async addKwpz(component: CadItemComponent<MenjiaoCadItemInfo>) {
    const {cad} = component;
    const {key1} = component.customInfo;
    const suanliaoDataParams = this.key1Infos[key1].suanliaoDataParams;
    const response = await this.http.mongodbInsert("kailiaokongweipeizhi", {...suanliaoDataParams, 名字: this.getTableCadName(cad)});
    if (response) {
      this.getSuanliaoTables(key1)?.updateKlkwpzTable();
    }
  }

  async addKlcs(component: CadItemComponent<MenjiaoCadItemInfo>) {
    const {cad} = component;
    const {key1} = component.customInfo;
    const suanliaoDataParams = this.key1Infos[key1].suanliaoDataParams;
    const response = await this.http.mongodbInsert("kailiaocanshu", {
      ...suanliaoDataParams,
      名字: this.getTableCadName(cad) + "中空参数",
      分类: "切中空"
    });
    if (response) {
      this.getSuanliaoTables(key1)?.updateKlcsTable();
    }
  }

  getOpenCadOptions(key1: MenjiaoCadType): CadItemComponent["openCadOptions"] {
    return {
      suanliaogongshiInfo: this.key1Infos[key1].suanliaogongshiInfo,
      suanliaoTablesInfo: {params: this.key1Infos[key1].suanliaoDataParams}
    };
  }

  afterEditCad(key1: MenjiaoCadType) {
    this.getSuanliaoTables(key1)?.update();
  }

  onMenjiaoCadTabChange(event: MatTabChangeEvent) {
    const label = event.tab.textLabel;
    for (const key of menjiaoCadTypes) {
      if (label.startsWith(key)) {
        this.key1Infos[key].isLoaded = true;
      }
    }
  }

  getMenjiaoCadTabLabel(key1: MenjiaoCadType) {
    const item = this.formData[key1];
    const isEmpty = () => {
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
    if (!isEmpty()) {
      label += "（有数据）";
    }
    return label;
  }
}

export const openMenjiaoDialog = getOpenDialogFunc<MenjiaoDialogComponent, MenjiaoInput, MenjiaoOutput>(MenjiaoDialogComponent, {
  width: "100%",
  height: "100%"
});
