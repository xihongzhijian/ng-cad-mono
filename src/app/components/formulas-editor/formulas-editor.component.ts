import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {KeyValuePipe, NgTemplateOutlet} from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  HostBinding,
  inject,
  input,
  model,
  output,
  signal
} from "@angular/core";
import {FormControl, ValidationErrors} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {replaceChars, setGlobal} from "@app/app.common";
import {CalcResult, Formulas} from "@app/utils/calc";
import {ResultWithErrors} from "@app/utils/error-message";
import {CustomValidators} from "@app/utils/input-validators";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {FormulasComponent} from "@components/formulas/formulas.component";
import {FormulaInfo} from "@components/formulas/formulas.types";
import {VarNamesComponent} from "@components/var-names/var-names.component";
import {VarNameItem} from "@components/var-names/var-names.types";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {isEmpty} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {InputComponent} from "../../modules/input/components/input.component";
import {FormulasCompactConfig, FormulasValidatorFn} from "./formulas-editor.types";

@Component({
  selector: "app-formulas-editor",
  templateUrl: "./formulas-editor.component.html",
  styleUrls: ["./formulas-editor.component.scss"],
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    FloatingDialogModule,
    FormulasComponent,
    forwardRef(() => InputComponent),
    KeyValuePipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    NgScrollbar,
    NgTemplateOutlet,
    VarNamesComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormulasEditorComponent {
  private calc = inject(CalcService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  formulas = model<Formulas | null | undefined>({alias: "formulas"});
  formulasTextIn = input("", {alias: "formulasText"});
  vars = input<Formulas>({});
  varNameItem = input<VarNameItem>();
  menshanweizhi = input("");
  extraInputInfosIn = input<InputInfo[]>([], {alias: "extraInputInfos"});
  validator = input<FormulasValidatorFn>();
  noFormulasText = input(false, {transform: booleanAttribute});
  noScroll = input(false, {transform: booleanAttribute});
  compact = model<FormulasCompactConfig>();
  dataName = input("公式");
  closable = input(false, {transform: booleanAttribute});
  close = output<Formulas | null>();

  constructor() {
    setGlobal("formulasEditor", this);
  }

  extraInputInfos = signal<InputInfo[]>([]);
  extraInputInfosEff = effect(() => {
    this.extraInputInfos.set(this.extraInputInfosIn());
  });
  refreshExtraInputInfos() {
    this.extraInputInfos.update((v) => [...v]);
  }

  formulaList = computed(() => Object.entries(this.formulas() || {}).map(([k, v]) => [k, String(v)]));
  formulaListInputInfos = computed(() => {
    const list = this.formulaList();
    const onChange = () => {
      this.justifyFormulas(list);
      this.parseFormulaList(list);
    };
    return list.map<InputInfo[]>((arr) => [
      {type: "string", label: "", model: {key: "0", data: arr}, onChange, validators: () => this.validateVarName(arr[0], list)},
      {
        type: "string",
        label: "",
        textarea: {autosize: {minRows: 1, maxRows: 5}},
        model: {key: "1", data: arr},
        onChange,
        validators: () => this.validateVarExpr(arr[1])
      }
    ]);
  });
  formulasText = signal("");
  formulasTextEff = effect(() => {
    const text = this.formulasTextIn();
    if (this.compact() && !text) {
      this.formulasText.set(this.stringifyFormulaList());
    } else {
      this.formulasText.set(text);
    }
  });

  toggleCompactEditOn() {
    this.compact.update((v) => (v ? {...v, editOn: !v.editOn} : undefined));
  }
  formulasInputInfo = computed(() => {
    const compact = this.compact();
    const errors = this.submitResult().getValidationErrors();
    const info: InputInfo = {
      type: "string",
      label: "",
      textarea: {autosize: {minRows: compact?.minRows, maxRows: compact?.maxRows}},
      value: this.formulasText(),
      // autoFocus: !!compact,
      validators: () => errors,
      onChange: (val) => {
        this.formulasText.set(val);
        if (compact) {
          const result = this.parseFormulasText();
          if (result.data) {
            this.justifyFormulas(result.data);
            this.parseFormulaList(result.data);
          }
          this.submitFormulas(this.formulaList(), true);
        }
      }
    };
    return info;
  });
  formulaInfos = computed(() =>
    this.formulaList().map<FormulaInfo>(([key, value]) => ({keys: [{eq: true, name: key}], values: [{eq: true, name: value}]}))
  );
  async openEditFormulasDialog() {
    const result = await openEditFormulasDialog(this.dialog, {data: {formulas: this.formulas()}});
    console.log(result);
  }

  parseFormulasTextResult = signal(new ResultWithErrors<string[][] | null>(null));
  parseFormulasText(text = this.formulasText()) {
    const list = text
      .split(/；|;|\n/)
      .filter((v) => v)
      .map<string[]>((v) => {
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
    this.justifyFormulas(list);

    const result = new ResultWithErrors<string[][] | null>(null);
    const list2: typeof list = [];
    for (const arr of list) {
      const errors2 = {...this.validateVarName(arr[0], list), ...this.validateVarExpr(arr[1])};
      if (isEmpty(errors2)) {
        list2.push(arr);
      } else {
        result.addErrorStr(`公式【${arr[0]}】有错：${Object.keys(errors2).join(", ")}`);
      }
    }
    if (result.fulfilled) {
      result.data = list2;
    }
    this.parseFormulasTextResult.set(result);
    return result;
  }
  parseFormulaList(list: string[][]) {
    const formulas: Formulas = {};
    for (const arr of list) {
      formulas[arr[0]] = arr[1];
    }
    this.formulas.set(formulas);
  }

  stringifyFormulaList() {
    return this.formulaList()
      .map((v) => `${v[0]} = ${v[1]}`)
      .join("\n\n");
  }

  addFormulas() {
    const result = this.parseFormulasText();
    if (result.data) {
      this.parseFormulaList(this.formulaList().concat(result.data));
    }
    this.submitFormulas();
  }

  validateVarName(varName: string, formulaList: string[][]) {
    const control = new FormControl(varName);
    const varNames = formulaList.map((v) => v[0]);
    return CustomValidators.varName(varNames)(control);
  }
  validateVarExpr(varExp: string): ValidationErrors | null {
    const control = new FormControl(varExp);
    return CustomValidators.varExpr()(control);
  }
  justifyFormulas(formulaList: string[][]) {
    for (const arr of formulaList) {
      arr[0] = replaceChars(arr[0]).toUpperCase();
      arr[1] = replaceChars(arr[1]).toUpperCase();
      arr[0] = arr[0].replace(/ /g, "");
      arr[1] = arr[1].replace(/[+\-*/÷×]+$/, "");
    }
  }

  submitResult = signal(new ResultWithErrors<Formulas>({}));
  async submitFormulas(formulaList = this.formulaList(), silent?: boolean) {
    const result = new ResultWithErrors<Formulas>({});
    const validator = this.validator();
    if (validator) {
      const errors = validator(formulaList);
      for (const key in errors) {
        result.addErrorStr(key);
      }
    }
    const parseFormulasTextResult = this.parseFormulasTextResult();
    if (!parseFormulasTextResult.fulfilled) {
      result.learnFrom(parseFormulasTextResult);
    } else {
      this.justifyFormulas(formulaList);
      const calcPreResult = await this.calc.calcFormulasPre(this.formulas() || {});
      if (calcPreResult.error) {
        result.addErrorStr("<br>" + calcPreResult.error);
      }
    }
    if (!silent) {
      await result.alertError(this.message);
    }
    for (const arr of formulaList) {
      result.data[arr[0]] = arr[1];
    }
    this.submitResult.set(result);
    return result;
  }

  addFormula(i?: number) {
    const list = this.formulaList().slice();
    if (typeof i === "number") {
      list.splice(i, 0, ["", ""]);
    } else {
      list.push(["", ""]);
    }
    this.parseFormulaList(list);
  }
  removeFormula(i: number) {
    const list = this.formulaList().slice();
    list.splice(i, 1);
    this.parseFormulaList(list);
  }
  dropFormula(event: CdkDragDrop<typeof this.formulaList>) {
    const list = this.formulaList().slice();
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.parseFormulaList(list);
  }

  testResult = signal<CalcResult | null>(null);
  async test(parseText: boolean) {
    let list: string[][];
    if (parseText) {
      const parseFormulasTextResult = this.parseFormulasText();
      if (!parseFormulasTextResult.data) {
        return;
      }
      list = parseFormulasTextResult.data;
    } else {
      list = this.formulaList();
    }
    const submitResult = await this.submitFormulas(list);
    if (submitResult.errors.length > 0) {
      return;
    }
    const result = await this.calc.calcFormulas(submitResult.data, this.vars());
    if (result) {
      this.testResult.set(result);
    }
  }
  closeTestResult() {
    this.testResult.set(null);
  }

  returnZero() {
    return 0;
  }

  async import(replace: boolean) {
    await this.message.importData<string[][]>(
      replace,
      (data) => {
        if (replace) {
          this.parseFormulaList(data);
        } else {
          this.parseFormulaList(this.formulaList().concat(data));
        }
      },
      this.dataName()
    );
  }
  export() {
    this.message.exportData(this.formulaList(), this.dataName());
  }

  async submit() {
    const result = await this.submitFormulas();
    if (!result.fulfilled) {
      return;
    }
    this.close.emit(result.data);
  }
  cancel() {
    this.close.emit(null);
  }
}
