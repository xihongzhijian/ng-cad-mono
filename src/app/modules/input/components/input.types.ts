import {AbstractControl, AbstractControlOptions, ValidationErrors} from "@angular/forms";
import {FloatLabelType} from "@angular/material/form-field";
import {OptionSeparator, StyledItem} from "@app/app.common";
import {Formulas} from "@app/utils/calc";
import {Value} from "@app/utils/get-value";
import {CadOptionsInput, CadOptionsOutput} from "@components/dialogs/cad-options/cad-options.types";
import {EditFormulasInput} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {MaybePromise, ObjectOf} from "@lucilor/utils";
import {GetOptionsResultItem} from "@modules/http/services/cad-data.service.types";
import {ColorInstance} from "color";
import {Properties} from "csstype";

export interface InputInfoBase<T = any> extends StyledItem {
  label: string;
  floatLabel?: FloatLabelType;
  model?: {data: T | (() => T); key: keyof T};
  value?: Value<any>;
  readonly?: boolean;
  clearable?: boolean;
  copyable?: boolean;
  disabled?: boolean;
  suffixIcons?: InputInfoButtonInfo[];
  suffixTexts?: InputInfoTextInfo[];
  hint?: string;
  autocomplete?: "on" | "off";
  autoFocus?: boolean;
  placeholder?: string;
  validators?: AbstractControlOptions["validators"];
  noInitialValidate?: boolean;
  forceValidateNum?: number; // change this to trigger validation
  name?: string;
  inputTextAlign?: Properties["textAlign"];
  hidden?: boolean;
  filterValuesGetter?: (option: InputInfoOption<T>) => string[];
  onChange?: (val: any, info: this) => void;
  onClick?: (info: this) => void;
  onFocus?: (info: this) => void;
  onBlur?: (info: this) => void;
  info?: ObjectOf<any>;
}

export interface InputInfoString<T = any> extends InputInfoBase<T> {
  type: "string";
  value?: Value<string>;
  textarea?: {autosize?: {minRows?: number; maxRows?: number}};
  onInput?: (val: string, info: this) => void;
  onChange?: (val: string, info: this) => void;
  options?: Value<InputInfoOptions<string>>;
  selectOnly?: boolean;
  optionValueType?: "string" | "array";
  fixedOptions?: string[];
  optionRequired?: boolean;
  optionsDisplayLimit?: number;
  optionMultiple?: boolean;
  optionSeparator?: OptionSeparator;
  optionsDialog?: OptionsDialog;
}

export interface InputInfoNumber<T = any> extends InputInfoBase<T> {
  type: "number";
  value?: Value<number>;
  step?: number;
  min?: number;
  max?: number;
  ndigits?: number;
  onInput?: (val: number, info: this) => void;
  onChange?: (val: number, info: this) => void;
}

export type KeyValidatorFn = (control: AbstractControl, objValue: string) => ValidationErrors | null;
export type ValueValidatorFn = (control: AbstractControl, objKey: string) => ValidationErrors | null;
export interface InputInfoObject<T = any, K = string, R = any> extends InputInfoBase<T> {
  type: "object";
  value?: Value<ObjectOf<R>>;
  options?: Value<InputInfoOptions<K>>;
  optionValueType?: "string" | "array";
  optionsDialog?: OptionsDialog;
  optionMultiple?: boolean;
  optionSeparator?: OptionSeparator;
  keyLabel?: string;
  valueLabel?: string;
  keyValidators?: KeyValidatorFn | KeyValidatorFn[] | null;
  valueValidators?: ValueValidatorFn | ValueValidatorFn[] | null;
  keysReadonly?: boolean;
  parseString?: boolean;
  requiredKeys?: string[];
  optionType?: "选项" | "模块选项";
  onChange?: (val: ObjectOf<R>, info: this) => void;
}

export interface InputInfoArray<T = any> extends InputInfoBase<T> {
  type: "array";
  value?: Value<any[]>;
  valueLabel?: string;
  valueValidators?: AbstractControlOptions["validators"];
  onChange?: <R>(val: R[], info: this) => void;
}

export interface InputInfoBoolean<T = any> extends InputInfoBase<T> {
  type: "boolean";
  value?: Value<boolean>;
  allowEmpty?: boolean;
  appearance?: "select" | "radio" | "checkbox" | "switch";
  indeterminate?: boolean;
  onChange?: (val: boolean, info: this) => void;
}

export interface InputInfoSelectBase<T = any, K = any> extends InputInfoBase<T> {
  type: "select";
  appearance?: "select" | "list";
  options: Value<InputInfoOptions<K>>;
  optionsDialog?: OptionsDialog;
  openInNewTab?: {optionKey: string; onOptionsChange: (options: GetOptionsResultItem[]) => void};
}
export interface InputInfoSelectSingle<T = any, K = any> extends InputInfoSelectBase<T, K> {
  value?: Value<K>;
  optionText?: string | ((val: string) => string);
  multiple?: false;
  onChange?: (val: K, info: this) => void;
}
export interface InputInfoSelectMultiple<T = any, K = string> extends InputInfoSelectBase<T, K> {
  value?: Value<K[]>;
  optionText?: string | ((val: string[]) => string);
  multiple: true;
  onChange?: (val: K[], info: this) => void;
}
export type InputInfoSelect<T = any, K = any> = InputInfoSelectSingle<T, K> | InputInfoSelectMultiple<T, K>;

export interface InputInfoCoordinate<T = any> extends InputInfoBase<T> {
  type: "coordinate";
  value?: Value<[number, number]>;
  compact?: boolean;
  labelX?: string;
  labelY?: string;
  onChange?: (val: {anchor: [number, number]}, info: this) => void;
}

export interface InputInfoColor<T = any> extends InputInfoBase<T> {
  type: "color";
  value?: Value<ColorInstance>;
  options?: ColorInstance[];
  optionsOnly?: boolean;
  onChange?: (val: ColorInstance, info: this) => void;
}

export interface InputInfoFile<T = any> extends InputInfoBase<T> {
  type: "file";
  accept?: string;
  multiple?: boolean;
  model?: never;
  onChange?: (val: FileList | null, info: this) => void;
}

export interface InputInfoImage<T = any> extends InputInfoBase<T> {
  type: "image";
  accept?: string;
  multiple?: boolean;
  bigPicSrc?: string;
  prefix?: string;
  model?: never;
  onChange?: (val: File | null, info: this) => void;
}

export interface InputInfoFormulas<T = any> extends InputInfoBase<T> {
  type: "formulas";
  value?: Value<Formulas>;
  params?: Value<Omit<EditFormulasInput, "formulas">>;
  onChange?: (val: Formulas, info: this) => void;
}

export interface InputInfoButtonInfo extends StyledItem {
  name: string;
  onClick?: () => MaybePromise<{isValueChanged?: boolean} | void | null>;
  isDefault?: boolean;
}
export interface InputInfoTextInfo extends StyledItem {
  name: string;
}
export interface InputInfoButton<T = any> extends InputInfoBase<T> {
  type: "button";
  buttons: InputInfoButtonInfo[];
}

export interface InputInfoList<T = any> extends InputInfoBase<T> {
  type: "list";
  value?: Value<string[]>;
}

export interface InputInfoGroup<T = any> extends InputInfoBase<T> {
  type: "group";
  infos?: InputInfo<T>[];
  groupStyle?: Properties;
}

export type InputInfo<T = any> =
  | InputInfoString<T>
  | InputInfoNumber<T>
  | InputInfoObject<T>
  | InputInfoArray<T>
  | InputInfoBoolean<T>
  | InputInfoSelect<T>
  | InputInfoCoordinate<T>
  | InputInfoColor<T>
  | InputInfoFile<T>
  | InputInfoImage<T>
  | InputInfoFormulas<T>
  | InputInfoButton<T>
  | InputInfoList<T>
  | InputInfoGroup<T>;
export type InputInfoCommon<R extends InputInfo = InputInfo> = Omit<R, "type" | "onChange" | "onClick" | "onFocus" | "onBlur">;
export type InputInfoPart<R extends InputInfo = InputInfo> = Partial<InputInfoCommon<R>> & {
  onChange?: (val: any, info: R) => void;
  onClick?: (info: R) => void;
  onFocus?: (info: R) => void;
  onBlur?: (info: R) => void;
};

export type InputInfoOption<T = string> = {value: T; label?: string; disabled?: boolean; img?: string; vid?: number};

export type InputInfoOptions<T = string> = (InputInfoOption<T> | string)[] | readonly (InputInfoOption<T> | string)[];

export interface OptionsDialog {
  optionKey?: string;
  optionsUseId?: boolean;
  optionsUseObj?: boolean;
  optionField?: string;
  defaultValue?: CadOptionsInput["defaultValue"];
  optionOptions?: CadOptionsInput["optionOptions"];
  openInNewTab?: CadOptionsInput["openInNewTab"];
  useLocalOptions?: CadOptionsInput["useLocalOptions"];
  nameField?: CadOptionsInput["nameField"];
  info?: CadOptionsInput["info"];
  noImage?: CadOptionsInput["noImage"];
  onChange?: (val: CadOptionsOutput) => void;
}
