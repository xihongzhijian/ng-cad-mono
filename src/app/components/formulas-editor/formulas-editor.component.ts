import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {KeyValuePipe} from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {replaceChars, setGlobal} from "@app/app.common";
import {CalcResult, Formulas} from "@app/utils/calc";
import {ObjectOf, timeout} from "@lucilor/utils";
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
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    forwardRef(() => InputComponent),
    KeyValuePipe,
    MatButtonModule,
    MatIconModule,
    NgScrollbar
  ]
})
export class FormulasEditorComponent implements OnChanges {
  @Input() formulas?: Formulas;
  @Input() vars?: Formulas;
  @Input() formulasText = "";
  @Input() varNames?: {names?: ObjectOf<string[]>; width?: number};
  @Input() extraInputInfos?: InputInfo[];
  @Input() required?: boolean;
  @Input() compact?: {minRows: number; maxRows: number};
  @Output() formulasChange = new EventEmitter<Formulas | null>();
  formulaList: [string, string][] = [];
  formulaListInputInfos: InputInfo[][] = [];
  formulasInputInfo: InputInfo;
  testResult: CalcResult | null = null;
  @ViewChild("testResultEl", {read: ElementRef}) testResultEl?: ElementRef<HTMLDivElement>;
  @ViewChildren(forwardRef(() => InputComponent)) inputs?: QueryList<InputComponent>;

  constructor(
    private message: MessageService,
    private calc: CalcService
  ) {
    setGlobal("formulasEditor", this);
    this.formulasInputInfo = {type: "string", label: ""};
    this.updateFormulasInfo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.formulas) {
      this.updateFormulas(this.formulas);
    }
    if (changes.compact) {
      this.updateFormulasInfo();
    }
  }

  updateFormulasInfo() {
    this.formulasInputInfo = {
      type: "string",
      label: "",
      textarea: {autosize: {minRows: this.compact?.minRows, maxRows: this.compact?.maxRows}},
      model: {key: "formulasText", data: this},
      onChange: () => this.onFormulasTextChange()
    };
  }

  updateFormulas(formulas?: Formulas, lock = false) {
    if (formulas) {
      this.formulaList = Object.entries(formulas).map(([k, v]) => [k, String(v)]);
    }
    this.formulaListInputInfos = this.formulaList.map<InputInfo[]>((arr) => [
      {type: "string", label: "", model: {key: "0", data: arr}, validators: () => this.validateVarName(arr[0])},
      {type: "string", label: "", textarea: {autosize: {minRows: 1, maxRows: 5}}, model: {key: "1", data: arr}}
    ]);
    if (!lock && this.compact) {
      this.formulasText = this.stringifyFormulas();
    }
  }

  parseFormulas() {
    const formulas = this.formulasText
      .split(/；|;|\n/)
      .filter((v) => v)
      .map<(typeof this.formulaList)[number]>((v) => {
        v = replaceChars(v);
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

    const errorMsgs: string[] = [];
    const formulas2: typeof formulas = [];
    for (const arr of formulas) {
      const errors = this.validateVarName(arr[0]);
      if (isEmpty(errors)) {
        formulas2.push(arr);
      } else {
        errorMsgs.push(`公式 ${arr[0]} = ${arr[1]} 有错：${Object.keys(errors).join(", ")}`);
      }
    }
    if (errorMsgs.length) {
      this.message.error(errorMsgs.join("<br>"));
    }
    return formulas2;
  }

  stringifyFormulas() {
    return this.formulaList.map((v) => `${v[0]} = ${v[1]}`).join("\n\n");
  }

  addFormulas() {
    const formulas = this.parseFormulas();
    if (formulas.length > 0) {
      this.formulaList.push(...formulas);
      this.updateFormulas();
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

  submitFormulas(formulaList = this.formulaList, silent?: boolean) {
    const errors: string[] = [];
    if (this.required && formulaList.length < 1) {
      errors.push("公式不能为空");
    }
    this.justifyFormulas(formulaList);
    for (const arr of formulaList) {
      const errors2 = this.validateVarName(arr[0]);
      if (!isEmpty(errors2)) {
        errors.push(`公式 ${arr[0]} = ${arr[1]} 有错：${Object.keys(errors2).join(", ")}`);
      }
    }
    const inputs = this.inputs || [];
    if (inputs.some((v) => !isEmpty(v.validateValue()))) {
      errors.push("输入数据有误");
    }
    if (errors.length) {
      if (!silent) {
        this.message.error(errors.join("<br>"));
      }
      return null;
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
    this.message.copyText(name);
  }

  openDoc() {
    window.open("https://www.kdocs.cn/l/ckbuWeJhOajS");
  }

  onFormulasTextChange() {
    if (!this.compact) {
      return;
    }
    const formulas = this.parseFormulas();
    if (formulas.length > 0) {
      this.formulaList = formulas;
      this.updateFormulas(undefined, true);
    }
    this.formulasChange.emit(this.submitFormulas(this.formulaList, true));
  }
}
