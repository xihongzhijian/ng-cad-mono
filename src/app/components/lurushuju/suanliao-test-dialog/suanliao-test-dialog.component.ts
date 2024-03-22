import {KeyValue, KeyValuePipe} from "@angular/common";
import {Component, HostBinding, Inject, OnInit} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {getCopyName, timer} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {Calc, CalcResult, Formulas} from "@app/utils/calc";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {CalcZxpjResult, ZixuanpeijianCadItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {calcZxpj} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {SuanliaogongshiComponent} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {CalcService} from "@services/calc.service";
import {cloneDeep, difference} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {测试用例} from "../xinghao-data";
import {SuanliaoTestInfo, SuanliaoTestInput, SuanliaoTestOutput} from "./suanliao-test-dialog.types";
import {filterSlgsList} from "./suanliao-test-dialog.utils";

@Component({
  selector: "app-suanliao-test-dialog",
  standalone: true,
  imports: [ImageComponent, KeyValuePipe, MatButtonModule, MatDividerModule, NgScrollbarModule, SuanliaogongshiComponent],
  templateUrl: "./suanliao-test-dialog.component.html",
  styleUrl: "./suanliao-test-dialog.component.scss"
})
export class SuanliaoTestDialogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";

  infos: SuanliaoTestInfo[] = [];
  allSlgsInfo: SuanliaogongshiInfo | null = null;

  constructor(
    private dialog: MatDialog,
    private message: MessageService,
    private calc: CalcService,
    private spinner: SpinnerService,
    public dialogRef: MatDialogRef<SuanliaoTestDialogComponent, SuanliaoTestOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SuanliaoTestInput
  ) {}

  ngOnInit() {
    this.updateInfo();
  }

  async updateInfo() {
    const {测试用例, 算料公式} = this.data.data;
    this.infos = [];
    for (const testCase of 测试用例) {
      const cads = cloneDeep(this.data.data.算料CAD);
      const info: SuanliaoTestInfo = {slgsList: [], errors: [], allVars: [], cads, cadImgs: {}};
      this.infos.push(info);

      const isValueEmpty = (v: any) => v === "" || v === null || v === undefined;
      const testVars = {...testCase.测试数据};
      for (const [key, value] of Object.entries(testVars)) {
        if (isValueEmpty(value)) {
          delete testVars[key];
        }
      }
      const slgsList = await filterSlgsList(算料公式, testVars, this.calc);
      info.slgsList = slgsList;
      const formulas: Formulas = {};
      for (const slgs of slgsList) {
        for (const [key, value] of Object.entries(slgs.公式)) {
          if (isValueEmpty(value)) {
            continue;
          }
          if (formulas[key] === undefined) {
            formulas[key] = value;
          } else {
            info.errors.push(`算料公式【${key}】重复`);
          }
          if (typeof value === "string") {
            const vars = Calc.getVars(value);
            for (const v of vars) {
              if (!info.allVars.includes(v)) {
                info.allVars.push(v);
              }
            }
          }
        }
      }
      for (const key in testVars) {
        if (formulas[key] !== undefined) {
          info.errors.push(`测试变量【${key}】与算料公式重复`);
        }
      }
      const missingVars = difference(info.allVars, Object.keys(testVars), Object.keys(formulas));
      if (missingVars.length > 0) {
        const missingVarsStr = missingVars.map((v) => `【${v}】`).join("");
        info.errors.push(`缺少变量${missingVarsStr}`);
        for (const v of missingVars) {
          testCase.测试数据[v] = "";
        }
      }

      await this.updateCadImgs(info);
    }
  }

  async updateCadImgs(info: SuanliaoTestInfo) {
    info.cadImgs = {};
    for (const cad of info.cads) {
      if (info.cadImgs[cad._id]) {
        continue;
      }
      const data = new CadData(cad.json);
      info.cadImgs[cad._id] = await getCadPreview("cad", data);
    }
  }

  async getTestCaseItem(data0?: 测试用例) {
    const data: 测试用例 = {名字: "", 时间: 0, 测试数据: {}, 测试正确: false, ...data0};
    const result = await openEditFormulasDialog(this.dialog, {
      data: {
        formulas: data.测试数据,
        extraInputInfos: [
          {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
          {type: "boolean", label: "测试正确", model: {data, key: "测试正确"}}
        ]
      }
    });
    if (result) {
      data.测试数据 = result;
      data.时间 = Date.now();
      return data;
    }
    return null;
  }

  async addTestCase() {
    const data = this.data.data;
    if (!data.测试用例) {
      return;
    }
    const result = await this.getTestCaseItem();
    if (result) {
      data.测试用例.push(result);
      await this.updateInfo();
    }
  }

  async editTestCase(index: number) {
    const data = this.data.data;
    if (!data.测试用例) {
      return;
    }
    const result = await this.getTestCaseItem(data.测试用例[index]);
    if (result) {
      data.测试用例[index] = result;
      await this.updateInfo();
    }
  }

  async copyTestCase(index: number) {
    const data = this.data.data;
    if (!data.测试用例) {
      return;
    }
    if (!(await this.message.confirm(`确定复制【${data.测试用例[index].名字}】吗？`))) {
      return;
    }
    const item = cloneDeep(data.测试用例[index]);
    const names = data.测试用例.map((v) => v.名字);
    item.名字 = getCopyName(names, item.名字);
    item.时间 = Date.now();
    data.测试用例.push(item);
    await this.updateInfo();
  }

  async removeTestCase(index: number) {
    const data = this.data.data;
    if (!data.测试用例) {
      return;
    }
    if (!(await this.message.confirm(`确定删除【${data.测试用例[index].名字}】吗？`))) {
      return;
    }
    data.测试用例.splice(index, 1);
    await this.updateInfo();
  }

  async importTestCases() {
    const data = this.data.data;
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
      let data2: any;
      try {
        data2 = JSON.parse(reader.result as string);
      } catch (e) {}
      if (Array.isArray(data2)) {
        data.测试用例 = data2;
        this.updateInfo();
      } else {
        this.message.error("测试用例数据有误");
      }
    });
    reader.readAsText(file);
  }

  exportTestCases() {
    const data = this.data.data;
    downloadByString(JSON.stringify(data.测试用例), {filename: "测试用例.json"});
  }

  async calcTestCases() {
    const errors: string[] = [];
    for (const [i] of this.data.data.测试用例.entries()) {
      const result = await this.calcTestCase0(i);
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    }
    if (errors.length > 0) {
      this.message.error(errors.join("<br/>"));
    }
  }

  printTestCases() {
    this.message.alert({content: "暂未实现"});
  }

  getTimeStr(time: number) {
    return new Date(time).toLocaleString();
  }

  submit() {
    this.dialogRef.close({});
  }

  returnZero() {
    return 0;
  }

  getGongshiStr(item: KeyValue<string, string | number>) {
    return `${item.key} = ${item.value}`;
  }

  toggleSlgsAll() {
    if (this.allSlgsInfo) {
      this.allSlgsInfo = null;
    } else {
      this.allSlgsInfo = {data: {算料公式: this.data.data.算料公式}};
    }
  }

  async onSlgsChange() {
    await this.updateInfo();
  }

  async calcTestCase0(i: number) {
    const testCase = this.data.data.测试用例[i];
    const info = this.infos[i];
    const result = {
      fulfilled: false,
      errors: Array<string>(),
      calcResult: null as null | CalcResult,
      cads: null as null | ZixuanpeijianCadItem[],
      zxpjResult: null as null | CalcZxpjResult
    };
    if (!testCase || !info) {
      return result;
    }
    if (info.errors.length > 0) {
      result.errors.push(`测试用例【${testCase.名字}】存在错误`);
      return result;
    }

    const formulas: Formulas = {};
    for (const slgs of info.slgsList) {
      for (const [key, value] of Object.entries(slgs.公式)) {
        formulas[key] = value;
      }
    }

    this.spinner.show(this.spinner.defaultLoaderId, {text: "正在测试算料"});
    timer.start("测试算料");
    result.calcResult = await this.calc.calcFormulas(formulas, testCase.测试数据);
    if (result.calcResult) {
      const calcResult = result.calcResult;
      const cads = this.data.data.算料CAD.map((v) => {
        const data = new CadData(v.json);
        let zhankai = data.zhankai[0];
        if (!zhankai) {
          zhankai = new CadZhankai();
          zhankai.name = data.name;
        }
        const numResult = Calc.calcExpress(`(${zhankai.shuliang})*(${zhankai.shuliangbeishu})`, calcResult.succeed);
        const num = numResult.error ? 1 : numResult.value;
        return {
          data,
          info: {
            houtaiId: v._id,
            zhankai: [
              {
                width: zhankai.zhankaikuan,
                height: zhankai.zhankaigao,
                num,
                originalWidth: zhankai.zhankaikuan
              }
            ],
            calcZhankai: []
          }
        };
      });
      result.cads = cads;
      result.zxpjResult = await calcZxpj(this.dialog, this.message, this.calc, calcResult.succeed, [], cads);
    }
    if (result.cads) {
      info.cads = result.cads.map((v, i) => {
        const item = this.data.data.算料CAD[i];
        const json = item.json;
        item.json = {};
        const item2 = cloneDeep(item);
        item.json = json;
        item2.json = v.data.export();
        item2.json.calcZhankai = v.info.calcZhankai;
        return item2;
      });
      await this.updateCadImgs(info);
    }
    this.spinner.hide(this.spinner.defaultLoaderId);
    timer.end("测试算料", "测试算料");
    result.fulfilled = !!result.calcResult?.fulfilled && !!result.zxpjResult?.fulfilled;
    return result;
  }

  async calcTestCase(i: number) {
    const result = await this.calcTestCase0(i);
    if (result.errors.length > 0) {
      this.message.error(result.errors.join("<br/>"));
      return;
    }
    return result;
  }

  printTestCase(i: number) {
    console.log(i);
    this.message.alert({content: "暂未实现"});
  }
}

export const openSuanliaoTestDialog = getOpenDialogFunc<SuanliaoTestDialogComponent, SuanliaoTestInput, SuanliaoTestOutput>(
  SuanliaoTestDialogComponent,
  {width: "100%", height: "100%"}
);
