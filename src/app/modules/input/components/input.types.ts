import {AbstractControlOptions} from "@angular/forms";
import {FloatLabelType} from "@angular/material/form-field";
import {Formulas} from "@app/utils/calc";
import {CadListInput, CadListOutput} from "@components/dialogs/cad-list/cad-list.types";
import {CadOptionsInput, CadOptionsOutput} from "@components/dialogs/cad-options/cad-options.component";
import {EditFormulasInput} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {CadViewer, CadViewerConfig} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import Color from "color";
import csstype from "csstype";

export type Value<T> = T | (() => T);

export interface InputInfoBase<T = any> {
  label: string;
  floatLabel?: FloatLabelType;
  model?: {data: T | (() => T); key: keyof T};
  value?: Value<any>;
  readonly?: boolean;
  clearable?: boolean;
  copyable?: boolean;
  disabled?: boolean;
  suffixIcons?: {name: string; onClick: () => void}[];
  hint?: Value<string>;
  autocomplete?: "on" | "off";
  showEmpty?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  validators?: AbstractControlOptions["validators"];
  initialValidate?: boolean;
  forceValidateNum?: number; // change this to trigger validation
  name?: string;
  class?: string | string[];
  style?: csstype.Properties;
  hidden?: boolean;
  displayValue?: Value<string>;
  filterValuesGetter?: (option: InputInfoOption<T>) => string[];
}

export interface InputInfoString<T = any, K = string> extends InputInfoBase<T> {
  type: "string";
  value?: Value<string>;
  textarea?: {autosize?: {minRows?: number; maxRows?: number}};
  onInput?: (val: string) => void;
  onChange?: (val: string) => void;
  options?: Value<InputInfoOptions<K>>;
  optionValueType?: "string" | "array";
  fixedOptions?: string[];
  optionInputOnly?: boolean;
  optionsDisplayLimit?: number;
  optionMultiple?: boolean;
  optionsDialog?: OptionsDialog;
}

export interface InputInfoNumber<T = any> extends InputInfoBase<T> {
  type: "number";
  value?: Value<number>;
  step?: number;
  min?: number;
  max?: number;
  onInput?: (val: number) => void;
  onChange?: (val: number) => void;
}

export interface InputInfoObject<T = any, K = string> extends InputInfoBase<T> {
  type: "object";
  value?: Value<ObjectOf<any>>;
  options?: Value<InputInfoOptions<K>>;
  optionValueType?: "string" | "array";
  optionsDialog?: OptionsDialog;
  optionMultiple?: boolean;
  keyLabel?: string;
  valueLabel?: string;
  keyValidators?: AbstractControlOptions["validators"];
  valueValidators?: AbstractControlOptions["validators"];
}

export interface InputInfoArray<T = any> extends InputInfoBase<T> {
  type: "array";
  value?: Value<any[]>;
  valueLabel?: string;
  valueValidators?: AbstractControlOptions["validators"];
}

export interface InputInfoBoolean<T = any> extends InputInfoBase<T> {
  type: "boolean";
  onChange?: (val: boolean) => void;
}

export interface InputInfoSelectBase<T = any, K = string> extends InputInfoBase<T> {
  type: "select";
  options: Value<InputInfoOptions<K>>;
  optionsDialog?: OptionsDialog;
}
export interface InputInfoSelectSingle<T = any, K = string> extends InputInfoSelectBase<T, K> {
  value?: Value<string>;
  optionText?: string | ((val: string) => string);
  multiple?: false;
  onChange?: (val: string) => void;
}
export interface InputInfoSelectMultiple<T = any, K = string> extends InputInfoSelectBase<T, K> {
  value?: Value<string[]>;
  optionText?: string | ((val: string[]) => string);
  multiple: true;
  onChange?: (val: string[]) => void;
}
export type InputInfoSelect<T = any, K = any> = InputInfoSelectSingle<T, K> | InputInfoSelectMultiple<T, K>;

export interface InputInfoCoordinate<T = any> extends InputInfoBase<T> {
  type: "coordinate";
  value?: Value<[number, number]>;
  compact?: boolean;
  labelX?: string;
  labelY?: string;
  onChange?: (val: {anchor: [number, number]}) => void;
}

export interface InputInfoColor<T = any> extends InputInfoBase<T> {
  type: "color";
  value?: Value<Color>;
  options?: Color[];
  optionsOnly?: boolean;
  onChange?: (val: Color) => void;
}

export interface InputInfoFile<T = any> extends InputInfoBase<T> {
  type: "file";
  accept?: string;
  multiple?: boolean;
  model?: never;
  onChange?: (val: FileList) => void;
}

export interface InputInfoImage<T = any> extends InputInfoBase<T> {
  type: "image";
  accept?: string;
  multiple?: boolean;
  bigPicSrc?: string;
  prefix?: string;
  model?: never;
  onChange?: (val: FileList) => void;
}

export interface InputInfoCad<T = any> extends InputInfoBase<T> {
  type: "cad";
  params: Value<CadListInput>;
  openable?: boolean;
  showName?: boolean;
  config?: Partial<CadViewerConfig>;
  showCadViewer?: {onInit?: (cadViewer: CadViewer) => void};
  onChange?: (val: CadListOutput) => void;
}

export interface InputInfoFormulas<T = any> extends InputInfoBase<T> {
  type: "formulas";
  value?: Value<Formulas>;
  formulasText?: EditFormulasInput["formulasText"];
  varNames?: EditFormulasInput["varNames"];
  onChange?: (val: Formulas) => void;
}

export interface InputInfoButtonInfo {
  name: string;
  color?: "" | "primary" | "accent" | "warn";
  onClick?: () => void;
}
export interface InputInfoButton<T = any> extends InputInfoBase<T> {
  type: "button";
  buttons: InputInfoButtonInfo[];
}

export interface InputInfoGroup<T = any> extends InputInfoBase<T> {
  type: "group";
  infos?: InputInfo<T>[];
  groupStyle?: csstype.Properties;
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
  | InputInfoCad<T>
  | InputInfoFormulas<T>
  | InputInfoButton<T>
  | InputInfoGroup<T>;

export type InputInfoOption<T = any> = {value: T; label?: string; disabled?: boolean; img?: string};

export type InputInfoOptions<T = any> = (InputInfoOption<T> | string)[];

export interface OptionsDialog {
  optionKey?: string;
  optionsUseId?: boolean;
  optionField?: string;
  defaultValue?: CadOptionsInput["defaultValue"];
  openInNewTab?: CadOptionsInput["openInNewTab"];
  noImage?: CadOptionsInput["noImage"];
  onChange?: (val: CadOptionsOutput) => void;
}
