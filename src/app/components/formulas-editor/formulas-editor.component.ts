import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {KeyValuePipe} from "@angular/common";
import {Component, ElementRef, forwardRef, Input, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {replaceChars, setGlobal} from "@app/app.common";
import {CalcResult, Formulas} from "@app/utils/calc";
import {timeout} from "@lucilor/utils";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {isEmpty} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {InputComponent} from "../../modules/input/components/input.component";

@Component({
  selector: "app-formulas-editor",
  templateUrl: "./formulas-editor.component.html",
  styleUrls: ["./formulas-editor.component.scss"],
  standalone: true,
  imports: [
    forwardRef(() => InputComponent),
    MatButtonModule,
    NgScrollbar,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatIconModule,
    KeyValuePipe
  ]
})
export class FormulasEditorComponent {
  private _formulas?: Formulas;
  @Input()
  get formulas() {
    return this._formulas;
  }
  set formulas(value) {
    this._formulas = value;
    this.updateFormulas(value);
  }
  @Input() vars?: Formulas;
  @Input() formulasText = "";
  @Input() varNames?: {names?: string[]; width?: number};
  formulaList: [string, string][] = [];
  formulaListInputInfos: InputInfo[][] = [];
  formulasInputInfo: InputInfo = {
    type: "string",
    label: "",
    textarea: {autosize: {minRows: 5}},
    model: {key: "formulasText", data: this}
  };
  testResult: CalcResult | null = null;
  @ViewChild("testResultEl", {read: ElementRef}) testResultEl?: ElementRef<HTMLDivElement>;
  @ViewChildren(forwardRef(() => InputComponent)) inputs?: QueryList<InputComponent>;

  constructor(
    private message: MessageService,
    private calc: CalcService
  ) {
    setGlobal("formulasEditor", this);
  }

  updateFormulas(formulas?: Formulas) {
    if (formulas) {
      this.formulaList = Object.entries(formulas).map(([k, v]) => [k, String(v)]);
    }
    this.formulaListInputInfos = this.formulaList.map<InputInfo[]>((arr) => [
      {type: "string", label: "", model: {key: "0", data: arr}, validators: () => this.validateVarName(arr[0])},
      {type: "string", label: "", textarea: {autosize: {minRows: 1, maxRows: 5}}, model: {key: "1", data: arr}}
    ]);
  }

  parseTextarea() {
    const formulas = replaceChars(this.formulasText)
      .split(/;|\n/)
      .filter((v) => v)
      .map<(typeof this.formulaList)[number]>((v) => {
        const index1 = v.indexOf("=");
        const index2 = v.indexOf(":");
        let index = -1;
        if (index1 > -1 && index2 > -1) {
          index = Math.min(index1, index2);
        } else if (index1 === -1) {
          index = index2;
        } else {
          index = index1;
        }
        if (index > -1) {
          return [v.slice(0, index).replace(/ /g, ""), v.slice(index + 1).replace(/ /g, "")];
        }
        return ["", ""];
      })
      .filter((v) => v);
    this.justifyFormulas(formulas);
    return formulas;
  }

  addFormulas() {
    const errorMsgs: string[] = [];
    let isAdded = false;
    for (const arr of this.parseTextarea()) {
      const errors = this.validateVarName(arr[0], [...this.formulaList, arr]);
      if (isEmpty(errors)) {
        this.formulaList.push([arr[0], arr[1]]);
        isAdded = true;
      } else {
        errorMsgs.push(`公式 ${arr[0]} = ${arr[1]} 有错：${Object.keys(errors).join(", ")}`);
      }
    }
    if (isAdded) {
      this.updateFormulas();
    }
    if (errorMsgs.length) {
      this.message.error(errorMsgs.join("\n"));
    }
  }

  validateVarName(varName: string, formulas = this.formulaList): ValidationErrors | null {
    if (!varName) {
      return {公式名不能为空: true};
    }
    if (!isNaN(Number(varName))) {
      return {公式名不能是纯数字: true};
    }
    const varNames = formulas.filter((v) => v[0] === varName);
    if (varNames.length > 1) {
      return {公式名重复: true};
    }
    if (/^[0-9]/.test(varName)) {
      return {公式名不能以数字开头: true};
    }
    return null;
  }

  justifyFormulas(formulaList = this.formulaList) {
    for (const arr of formulaList) {
      arr[0] = replaceChars(arr[0]).toUpperCase();
      arr[1] = replaceChars(arr[1]).toUpperCase();
      arr[0] = arr[0].replace(/ /g, "");
      arr[1] = arr[1].replace(/[+\-*/÷×]+$/, "");
    }
  }

  submitFormulas(formulaList = this.formulaList) {
    const inputs = this.inputs;
    if (!inputs) {
      return null;
    }
    this.justifyFormulas(formulaList);
    for (const input of inputs) {
      const errors = input.validateValue();
      if (!isEmpty(errors)) {
        this.message.error("输入数据有误");
        return null;
      }
    }
    const result: Formulas = {};
    for (const arr of formulaList) {
      result[arr[0]] = arr[1];
    }
    return result;
  }

  addFormula(i?: number) {
    if (typeof i === "number") {
      this.formulaList.splice(i, 0, ["", ""]);
    } else {
      this.formulaList.push(["", ""]);
    }
    this.updateFormulas();
  }

  removeFormula(i: number) {
    this.formulaList.splice(i, 1);
    this.updateFormulas();
  }

  dropFormula(event: CdkDragDrop<typeof this.formulaList>) {
    moveItemInArray(this.formulaList, event.previousIndex, event.currentIndex);
    this.updateFormulas();
  }

  async test(formulas: Formulas | null | undefined) {
    if (!formulas) {
      return;
    }
    const result = await this.calc.calcFormulas(formulas, this.vars);
    if (result) {
      this.testResult = result;
      await timeout(200);
      this.message.alert({title: "计算结果", content: this.testResultEl?.nativeElement.innerHTML});
      this.testResult = null;
    }
  }

  returnZero() {
    return 0;
  }

  clickVarName(name: string) {
    this.formulasText += name;
  }
}
