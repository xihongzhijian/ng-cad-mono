import {TextFieldModule} from "@angular/cdk/text-field";
import {CommonModule} from "@angular/common";
import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  HostBinding,
  Input,
  KeyValueDiffer,
  KeyValueDiffers,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from "@angular/core";
import {FormControl, FormsModule, ValidationErrors} from "@angular/forms";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {ErrorStateMatcher, MatOptionModule} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatTooltipModule} from "@angular/material/tooltip";
import {SafeUrl} from "@angular/platform-browser";
import {joinOptions, splitOptions} from "@app/app.common";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadListOutput} from "@components/dialogs/cad-list/cad-list.types";
import {CadOptionsInput, openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {isTypeOf, ObjectOf, sortArrayByLevenshtein, timeout, ValueOf} from "@lucilor/utils";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {OptionsDataData} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import Color from "color";
import csstype from "csstype";
import {isEmpty, isEqual} from "lodash";
import {Color as NgxColor} from "ngx-color";
import {ChromeComponent, ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {BehaviorSubject} from "rxjs";
import {ClickStopPropagationDirective} from "../../directives/click-stop-propagation.directive";
import {AnchorSelectorComponent} from "./anchor-selector/anchor-selector.component";
import {InputInfo, InputInfoBase, InputInfoOptions, InputInfoString, InputInfoTypeMap} from "./input.types";
import {getValue} from "./input.utils";

@Component({
  selector: "app-input",
  templateUrl: "./input.component.html",
  styleUrls: ["./input.component.scss"],
  standalone: true,
  imports: [
    AnchorSelectorComponent,
    ClickStopPropagationDirective,
    ColorChromeModule,
    ColorCircleModule,
    CommonModule,
    FormsModule,
    ImageComponent,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MatTooltipModule,
    TextFieldModule
  ]
})
export class InputComponent extends Utils() implements AfterViewInit, OnChanges, DoCheck {
  suffixIconsType!: SuffixIconsType;
  @Input() info: InputInfo = {type: "string", label: ""};
  infoDiffer: KeyValueDiffer<keyof InputInfo, ValueOf<InputInfo>>;
  onChangeDelayTime = 200;
  onChangeDelay: {timeoutId: number} | null = null;
  cadInfos: {id: string; name: string; img: SafeUrl}[] = [];
  @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;
  @ViewChildren(InputComponent) inputs?: QueryList<InputComponent>;

  private _model: NonNullable<Required<InputInfo["model"]>> = {data: {key: ""}, key: "key"};
  get model() {
    let model = {...this.info.model};
    if (!model || !("data" in model) || !("key" in model)) {
      model = this._model;
    }
    if (typeof model.data === "function") {
      model.data = model.data();
    }
    return model;
  }

  get value() {
    const {data, key} = this.model;
    if (data && typeof data === "object" && key) {
      return data[key];
    }
    return "";
  }
  set value(val) {
    const {data, key} = this.model;
    if (data && typeof data === "object" && key) {
      data[key] = val;
    }
    const type = this.info.type;
    if (type === "color") {
      this.setColor(val);
    }
  }

  get editable() {
    return !this.info.readonly && !this.info.disabled;
  }

  get optionsDialog() {
    switch (this.info.type) {
      case "string":
      case "select":
      case "object":
        return this.info.optionsDialog;
      default:
        return undefined;
    }
  }

  get suffixIcons() {
    return this.info.suffixIcons || [];
  }

  get hint() {
    const hint = this.info.hint;
    if (typeof hint === "function") {
      return hint();
    }
    return hint || "";
  }

  options: {value: string; label: string; disabled?: boolean; img?: string}[] = [];

  get optionText() {
    const info = this.info;
    if (info.type === "select") {
      if (typeof info.optionText === "function") {
        return info.optionText(this.value);
      }
      return info.optionText;
    }
    return "";
  }

  get anchorStr() {
    const value = this.value;
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return "";
  }

  colorBg = "";
  colorText = "";
  get colorStr() {
    const value = this.value;
    if (typeof value === "string") {
      return value;
    } else if (value instanceof Color) {
      return value.hex();
    }
    return "";
  }
  get colorOptions() {
    const {info} = this;
    if (info.type !== "color" || !info.options) {
      return [];
    }
    return info.options.map((v) => (typeof v === "string" ? v : new Color(v).hex()));
  }

  get fileAccept() {
    const {info} = this;
    if (info.type === "file") {
      return info.accept;
    } else if (info.type === "image") {
      return info.accept || "image/*";
    }
    return undefined;
  }

  get isCadMultiple() {
    const {info} = this;
    if (info.type === "cad") {
      const params = getValue(info.params, this.message);
      return params?.selectMode === "multiple";
    }
    return false;
  }

  displayValue: string | null = null;

  @HostBinding("class") class: string[] = [];
  @HostBinding("style") style: csstype.Properties = {};

  @ViewChild("formField", {read: ElementRef}) formField?: ElementRef<HTMLElement>;
  @ViewChild("colorChrome") colorChrome?: ChromeComponent;
  errors: ValidationErrors | null = null;
  errors2: ValidationErrors | null = null;
  errorsKey: ObjectOf<ValidationErrors | null> = {};
  errorsValue: ObjectOf<ValidationErrors | null> = {};

  valueChange$ = new BehaviorSubject<any>(null);
  filteredOptions$ = new BehaviorSubject<InputComponent["options"]>([]);

  private _validateValueLock = false;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private differs: KeyValueDiffers,
    private http: CadDataService,
    private status: AppStatusService
  ) {
    super();
    this.valueChange$.subscribe((val) => {
      const info = this.info;
      const {filterValuesGetter} = info;
      let sortOptions: boolean;
      const getFilterValues = (option: (typeof this.options)[number]) => {
        let values: string[] = [];
        if (typeof filterValuesGetter === "function") {
          values = filterValuesGetter(option);
        } else {
          values = [option.label];
          if (typeof option.value === "string") {
            values.push(option.value);
          }
        }
        return values;
      };
      let fixedOptions: string[] | undefined;
      let optionsDisplayLimit: number | undefined;
      if (info.type === "string") {
        fixedOptions = info.fixedOptions;
        optionsDisplayLimit = info.optionsDisplayLimit;
      }
      let options: typeof this.options;
      if (val) {
        options = this.options.filter((option) => {
          const values = getFilterValues(option);
          for (const v of values) {
            if (v.includes(val) || (fixedOptions && fixedOptions.includes(v))) {
              return true;
            }
          }
          return false;
        });
        sortOptions = true;
      } else {
        options = this.options;
        sortOptions = false;
      }
      if (typeof optionsDisplayLimit === "number") {
        options = options.slice(0, optionsDisplayLimit);
      }
      if (sortOptions) {
        sortArrayByLevenshtein(options, getFilterValues, this.value);
      }
      if (this.optionsDialog) {
        this.filteredOptions$.next([]);
      } else {
        this.filteredOptions$.next(options);
      }
    });
    this.infoDiffer = differs.find(this.info).create();
  }

  async ngAfterViewInit() {
    if (this.info.autoFocus) {
      await timeout(100);
      const el = this.formField?.nativeElement.querySelector("input, textarea");
      if (el instanceof HTMLElement) {
        el.focus();
      }
    }
    if (this.colorChrome) {
      await timeout(0);
      this.setColor(this.colorChrome.hex);
    }
    this.infoDiffer = this.differs.find(this.info).create();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.info) {
      this.infoDiffer = this.differs.find(this.info).create();
    }
  }

  ngDoCheck() {
    const changes = this.infoDiffer.diff(this.info);
    if (changes) {
      this._onInfoChange(changes);
    }
  }

  private _getErrorMsg(errors: ValidationErrors | null, label?: string): string {
    if (!errors) {
      return "";
    }
    for (const key in errors) {
      const value = errors[key];
      let msg = "";
      if (typeof value === "string") {
        msg = value;
      } else {
        msg = key;
      }
      if (label && msg === "required") {
        return `${label}不能为空`;
      }
      return msg;
    }
    return "";
  }

  getErrorMsg() {
    return this._getErrorMsg(this.errors, this.info.label);
  }

  getErrorMsgKey(key: string) {
    if (this.info.type === "object") {
      return this._getErrorMsg(this.errorsKey[key], this.info.keyLabel);
    } else {
      return "";
    }
  }

  getErrorMsgValue(key: string) {
    if (this.info.type === "object" || this.info.type === "array") {
      return this._getErrorMsg(this.errorsValue[key], this.info.valueLabel);
    } else {
      return "";
    }
  }

  getErrorStateMatcher(): ErrorStateMatcher {
    return {isErrorState: () => !this.isValid()};
  }

  getErrorStateMatcherKey(key: string): ErrorStateMatcher {
    return {isErrorState: () => !this.isValidKey(key)};
  }

  getErrorStateMatcherValue(key: string): ErrorStateMatcher {
    return {isErrorState: () => !this.isValidValue(key)};
  }

  private async _onInfoChange(changes: NonNullable<ReturnType<typeof this.infoDiffer.diff>>) {
    const {info} = this;
    if (!info.autocomplete) {
      info.autocomplete = "off";
    }
    if ("value" in info) {
      this.value = getValue(info.value, this.message);
    }
    let options: InputInfoOptions | undefined | null;
    const type = info.type;
    if (type === "select" || type === "string") {
      options = getValue(info.options, this.message);
      this.options = (options || []).map<(typeof this.options)[number]>((v) => {
        if (typeof v === "string") {
          return {value: v, label: v};
        }
        if (typeof v === "number") {
          return {value: String(v), label: String(v)};
        }
        return {label: v.label || String(v.value), value: v.value, disabled: v.disabled, img: v.img};
      });
    } else if (type === "cad") {
      this.updateCadInfos();
    }
    this.displayValue = null;
    if (type === "string") {
      const {optionInputOnly} = info;
      if (optionInputOnly && !options) {
        info.readonly = true;
        this.displayValue = getValue(info.displayValue, this.message) || null;
      }
    }
    this.class = [type];
    if (typeof info.label === "string" && info.label && !info.label.includes(" ")) {
      this.class.push(info.label);
    }
    if (info.readonly) {
      this.class.push("readonly");
    }
    if (info.disabled) {
      this.class.push("disabled");
    }
    if (info.class) {
      if (Array.isArray(info.class)) {
        this.class.push(...info.class);
      } else {
        this.class.push(info.class);
      }
    }
    this.style = {...info.styles};
    if (info.hidden) {
      this.style.display = "none";
    }
    let validateValue = !!info.initialValidate;
    changes.forEachItem((item) => {
      if (item.key === "forceValidateNum") {
        if (item.currentValue !== item.previousValue) {
          validateValue = true;
        }
      }
    });
    if (validateValue) {
      this.validateValue();
    }
    this.valueChange$.next(this.value);
  }

  clear() {
    const value = this.value;
    if (value === undefined || value === null) {
      return;
    }
    let toChange: any;
    switch (typeof value) {
      case "string":
        toChange = "";
        break;
      case "number":
        toChange = 0;
        break;
      case "object":
        if (Array.isArray(value)) {
          toChange = [];
        } else {
          toChange = null;
        }
        break;
      default:
        toChange = null;
    }
    if (!isEqual(value, toChange)) {
      this.value = toChange;
      this.onInput(toChange);
      this.onChange(toChange);
    }
  }

  copy() {
    const copy = async (str: string) => {
      await navigator.clipboard.writeText(str);
      await this.message.snack(`${this.info.label}已复制`);
    };
    const value = this.value;
    switch (typeof value) {
      case "string":
        copy(value);
        break;
      case "number":
        copy(String(value));
        break;
      default:
        copy(JSON.stringify(value));
    }
  }

  async onChange(value = this.value, isAutocomplete = false) {
    const info = this.info;
    this.validateValue(value);
    this._validateValueLock = true;
    setTimeout(() => {
      this._validateValueLock = false;
    }, 100);
    switch (info.type) {
      case "string":
        {
          const {options, optionInputOnly} = info;
          if (value && options && !isAutocomplete) {
            const timeoutId = window.setTimeout(() => {
              if (optionInputOnly && !this.options.find((v) => v.value === value)) {
                this.value = "";
              }
              this.onChange(value, true);
            }, this.onChangeDelayTime);
            this.onChangeDelay = {timeoutId};
          } else {
            info.onChange?.(value);
          }
        }
        break;
      case "number":
        info.onChange?.(value);
        break;
      case "boolean":
        info.onChange?.(value);
        break;
      case "select":
        info.onChange?.(value);
        break;
      case "coordinate":
        info.onChange?.(value);
        break;
      case "color":
        info.onChange?.(value);
        break;
      default:
        break;
    }
  }

  onColorChange(ngxColor: NgxColor) {
    this.value = new Color(ngxColor.hex);
    this.onChange();
  }

  validateValue(value = this.value) {
    const {info, inputs} = this;
    const validators = info.validators;
    let errors: ValidationErrors | null = null;
    let errors2: ValidationErrors | null = null;
    if (validators) {
      const control = new FormControl(value, validators);
      errors = control.errors;
    }
    if (inputs) {
      for (const input of inputs.toArray()) {
        input.validateValue();
        if (input.errors && !input.info.hidden) {
          if (!errors2) {
            errors2 = {};
          }
          const errors3 = {...input.errors};
          Object.assign(errors2, errors3);
        }
      }
    }
    if (isEmpty(errors)) {
      errors = null;
    }
    if (isEmpty(errors2)) {
      errors2 = null;
    }
    this.errors = errors;
    this.errors2 = errors2;
    if (info.type === "object" && isTypeOf(value, "object")) {
      const {keyValidators} = info;
      const errorsKey: ObjectOf<ValidationErrors | null> = {};
      const errorsValue: ObjectOf<ValidationErrors | null> = {};
      for (const key in value) {
        const val = value[key];
        if (keyValidators) {
          const control = new FormControl(key, keyValidators);
          if (!isEmpty(control.errors)) {
            errorsKey[key] = control.errors;
          }
        }
        if (info.valueValidators) {
          const control = new FormControl(val, info.valueValidators);
          if (!isEmpty(control.errors)) {
            errorsValue[key] = control.errors;
          }
        }
      }
      this.errorsKey = errorsKey;
      this.errorsValue = errorsValue;
    } else if (info.type === "array" && Array.isArray(value)) {
      const {valueValidators} = info;
      const errorsValue: ObjectOf<ValidationErrors | null> = {};
      for (const [i, val] of value.entries()) {
        if (valueValidators) {
          const control = new FormControl(val, valueValidators);
          if (!isEmpty(control.errors)) {
            errorsValue[String(i)] = control.errors;
          }
        }
      }
      this.errorsValue = errorsValue;
    }
    return {...this.errors, ...this.errors2, ...this.errorsKey, ...this.errorsValue};
  }

  isValid() {
    return isEmpty(this.errors);
  }

  isValidKey(key: string) {
    return isEmpty(this.errorsKey[key]);
  }

  isValidValue(key: string) {
    return isEmpty(this.errorsValue[key]);
  }

  onAutocompleteChange(event: MatAutocompleteSelectedEvent) {
    if (this.onChangeDelay) {
      window.clearTimeout(this.onChangeDelay.timeoutId);
      this.onChangeDelay = null;
    }
    this.onChange(event.option.value, true);
  }

  onInput(value = this.value) {
    switch (this.info.type) {
      case "string":
        this.info.onInput?.(value);
        break;
      case "number":
        this.info.onInput?.(value);
        break;
      default:
        break;
    }
    this.valueChange$.next(value);
  }

  onBlur() {
    if (!this._validateValueLock) {
      this.validateValue();
    }
  }

  async selectOptions(key?: keyof any, optionKey?: string) {
    const data = this.model.data;
    const optionsDialog = this.optionsDialog;
    if (!optionsDialog) {
      return;
    }
    const {info} = this;
    const {optionField, optionsUseId, defaultValue, onChange} = optionsDialog;
    if (optionsDialog.optionKey) {
      optionKey = optionsDialog.optionKey;
    }
    let optionValueType: InputInfoString["optionValueType"];
    let optionInputOnly: InputInfoString["optionInputOnly"];
    let multiple: boolean | undefined;
    let hasOptions = false;
    if (info.type === "string") {
      optionInputOnly = !!info.optionInputOnly;
      optionValueType = info.optionValueType || "string";
      multiple = info.optionMultiple;
      hasOptions = !!info.options;
    } else if (info.type === "select") {
      multiple = info.multiple;
      hasOptions = !!info.options;
    } else if (info.type === "object") {
      multiple = info.optionMultiple;
      hasOptions = !!info.options;
    }
    const value = key ? data[key] : this.value;
    const isObject = isTypeOf(value, "object");
    let checked: string[] = isObject && optionKey ? value[optionKey] : value;
    if (optionValueType === "string") {
      checked = splitOptions(isObject && optionKey ? value[optionKey] : value);
    }
    if (!Array.isArray(checked)) {
      checked = [];
    }
    const fields = optionField ? [optionField] : [];
    const dialogData: CadOptionsInput = {
      data,
      name: optionKey || "",
      multi: multiple,
      defaultValue,
      fields,
      options: hasOptions
        ? this.options.map<OptionsDataData>((v, i) => ({
            vid: i,
            name: typeof v === "string" ? v : v.value,
            img: v.img || "",
            disabled: false
          }))
        : undefined
    };
    if (optionsUseId) {
      dialogData.checkedVids = checked.map((v) => Number(v));
    } else {
      dialogData.checkedItems = checked;
    }
    const result = await openCadOptionsDialog(this.dialog, {data: dialogData});
    if (result) {
      const options = result.options;
      let options2: string[];
      if (optionsUseId) {
        options2 = options.map((v) => String(v.vid));
      } else {
        options2 = options.map((v) => v.mingzi);
      }
      if (optionInputOnly || info.type === "select") {
        this.displayValue = joinOptions(options.map((v) => v.mingzi));
      }
      let resultValue: string | string[] = options2;
      if (optionValueType === "string") {
        resultValue = joinOptions(options2);
      }
      if (key) {
        if (isObject && optionKey) {
          data[key][optionKey] = resultValue;
        } else {
          data[key] = resultValue;
        }
      } else {
        this.value = resultValue;
      }
      if (typeof onChange === "function") {
        onChange(result);
      }
      this.validateValue();
    }
  }

  asObject(val: any): ObjectOf<any> {
    if (isTypeOf(val, "object")) {
      return val;
    }
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInfo<T extends InputInfo["type"]>(_: T) {
    return this.info as InputInfoTypeMap[T];
  }

  getAnchorValue(axis: "x" | "y") {
    if (axis === "x") {
      const value = this.value[0];
      switch (value) {
        case 0:
          return "左";
        case 0.5:
          return "中";
        case 1:
          return "右";
        default:
          return value;
      }
    } else if (axis === "y") {
      const value = this.value[1];
      switch (value) {
        case 0:
          return "下";
        case 0.5:
          return "中";
        case 1:
          return "上";
        default:
          return value;
      }
    }
    return "";
  }

  isEmpty(value: any) {
    if (!this.info.showEmpty) {
      return false;
    }
    return [null, undefined, ""].includes(value);
  }

  setColor(color: Color | string | undefined | null) {
    const value = typeof color === "string" ? color : color?.hex();
    try {
      const c = new Color(value);
      if (c.isLight()) {
        this.colorBg = "black";
      } else {
        this.colorBg = "white";
      }
    } catch (error) {
      this.colorBg = "white";
    }
  }

  returnZero() {
    return 0;
  }

  selectFile() {
    const input = this.fileInput?.nativeElement;
    if (!input) {
      return;
    }
    input.click();
  }

  onInputChange() {
    const input = this.fileInput?.nativeElement;
    if (!input) {
      return;
    }
    const files = input.files;
    if (!files || !files.length) {
      return;
    }
    const {info} = this;
    if (info.type === "file" || info.type === "image") {
      info.onChange?.(files);
    }
    input.value = "";
  }

  getCadName(val: any) {
    const {info} = this;
    if (info.type === "cad") {
      if (info.showName) {
        if (isTypeOf(val, "object")) {
          let name = "";
          for (const key of ["name", "名字"]) {
            if (isTypeOf(val[key], "string") && val[key].length > 0) {
              name = val[key];
              break;
            }
          }
          return name || "";
        }
      } else {
        if (this.isCadMultiple) {
          return "";
        } else {
          return info.label;
        }
      }
    }
    return "";
  }

  getCadId(value: any) {
    if (!isTypeOf(value, "object")) {
      return "";
    }
    let id = "";
    for (const key of ["id", "_id"]) {
      if (isTypeOf(value[key], "string") && value[key].length > 0) {
        id = value[key];
        break;
      }
    }
    return id || "";
  }

  updateCadInfos() {
    const {info} = this;
    if (info.type !== "cad") {
      return;
    }
    let {value} = this;
    const getInfo = (val: any): (typeof this.cadInfos)[number] | null => {
      const id = this.getCadId(val);
      if (!id) {
        return null;
      }
      const name = this.getCadName(val);
      const img = this.http.getCadImgUrl(this.getCadId(val));
      return {id, name, img};
    };
    this.cadInfos = [];
    if (!Array.isArray(value)) {
      value = [value];
    }
    for (const val of value) {
      const cadInfo = getInfo(val);
      if (cadInfo) {
        this.cadInfos.push(cadInfo);
      }
    }
  }

  async selectCad() {
    const {info} = this;
    if (info.type !== "cad") {
      return;
    }
    const params = getValue(info.params, this.message);
    if (!params) {
      return;
    }
    params.checkedItems = this.cadInfos.map((v) => v.id);
    const result = await openCadListDialog(this.dialog, {data: params});
    if (result) {
      if (this.isCadMultiple) {
        this.value = result;
      } else {
        this.value = result[0] || null;
      }
      info.onChange?.(result);
      this.updateCadInfos();
    }
  }

  async clearCad(i: number) {
    const {info} = this;
    if (info.type !== "cad") {
      return;
    }
    const {value, isCadMultiple} = this;
    let result: CadListOutput;
    if (isCadMultiple) {
      if (Array.isArray(value)) {
        value.splice(i, 1);
        result = value;
      } else {
        this.value = result = [];
      }
    } else {
      this.value = null;
      result = [];
    }
    info.onChange?.(result);
    this.updateCadInfos();
  }

  openCad(id: string) {
    this.status.openCadInNewTab(id, this.value?.collection || "cad");
  }

  changeObjectKey2(obj: ObjectOf<any>, oldKey: string, newKey: string | Event) {
    this.changeObjectKey(obj, oldKey, newKey);
    setTimeout(() => {
      this.validateValue();
    }, 0);
  }

  changeObjectValue2(obj: ObjectOf<any>, key: string, value: any) {
    this.changeObjectValue(obj, key, value);
    setTimeout(() => {
      this.validateValue();
    }, 0);
  }

  getFormulasStr() {
    const {info} = this;
    if (info.type !== "formulas") {
      return "";
    }
    const {value} = this;
    if (!isTypeOf(value, "object")) {
      return "";
    }
    return Object.entries(value)
      .map(([k, v]) => `${k}=${v}`)
      .join(";");
  }

  async editFormulas() {
    const {info} = this;
    if (info.type !== "formulas") {
      return;
    }
    let {value} = this;
    if (!isTypeOf(value, "object")) {
      value = {};
    }
    const result = await openEditFormulasDialog(this.dialog, {data: {formulas: value}});
    if (result) {
      this.value = result;
      info.onChange?.(result);
    }
  }
}

interface SuffixIconsType {
  $implicit: InputInfoBase["suffixIcons"];
}
