import {AbstractControlOptions} from "@angular/forms";
import {FloatLabelType} from "@angular/material/form-field";
import {CadListInput, CadListOutput} from "@components/dialogs/cad-list/cad-list.component";
import {ObjectOf} from "@lucilor/utils";
import Color from "color";
import csstype from "csstype";

export type Value<T> = T | (() => T) | (() => Promise<T>);

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
  class?: string | string[];
  validators?: AbstractControlOptions["validators"];
  initialValidate?: boolean;
  forceValidateNum?: number; // change this to trigger validation
  name?: string;
  styles?: csstype.Properties;
  hidden?: boolean;
}

export interface InputInfoString<T = any> extends InputInfoWithOptions<T, string> {
  type: "string";
  value?: Value<string>;
  displayValue?: Value<string>;
  optionKey?: string;
  textarea?: {autosize?: {minRows?: number; maxRows?: number}};
  onInput?: (val: string) => void;
  onChange?: (val: string) => void;
}

export interface InputInfoNumber<T = any> extends InputInfoWithOptions<T, number> {
  type: "number";
  value?: Value<number>;
  step?: number;
  min?: number;
  max?: number;
  onInput?: (val: number) => void;
  onChange?: (val: number) => void;
}

export interface InputInfoObject<T = any> extends InputInfoBase<T> {
  type: "object";
  value?: Value<ObjectOf<any>>;
  selectOptions?: boolean;
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

export interface InputInfoSelect<T = any, K = string> extends InputInfoBase<T> {
  type: "select";
  value?: Value<string>;
  options: Value<InputInfoOptions<K>>;
  optionText?: string | ((val: string) => string);
  onChange?: (val: string) => void;
}

export interface InputInfoSelectMulti<T = any, K = string> extends InputInfoBase<T> {
  type: "selectMulti";
  value?: Value<string[]>;
  options: Value<InputInfoOptions<K>>;
  optionText?: string | ((val: string[]) => string);
  onChange?: (val: string[]) => void;
}

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
  onChange?: (val: CadListOutput) => void;
}

export interface InputInfoGroup<T = any> extends InputInfoBase<T> {
  type: "group";
  infos?: InputInfo<T>[];
}

export type InputInfo<T = any> =
  | InputInfoString<T>
  | InputInfoNumber<T>
  | InputInfoObject<T>
  | InputInfoArray<T>
  | InputInfoBoolean<T>
  | InputInfoSelect<T>
  | InputInfoSelectMulti<T>
  | InputInfoCoordinate<T>
  | InputInfoColor<T>
  | InputInfoFile<T>
  | InputInfoImage<T>
  | InputInfoCad<T>
  | InputInfoGroup<T>;

export interface InputInfoTypeMap {
  string: InputInfoString;
  number: InputInfoNumber;
  object: InputInfoObject;
  array: InputInfoArray;
  boolean: InputInfoBoolean;
  select: InputInfoSelect;
  selectMulti: InputInfoSelectMulti;
  coordinate: InputInfoCoordinate;
  color: InputInfoColor;
  file: InputInfoFile;
  image: InputInfoImage;
  cad: InputInfoCad;
  group: InputInfoGroup;
}

export interface InputInfoWithOptions<T = any, K = any> extends InputInfoBase<T> {
  options?: Value<InputInfoOptions<K>>;
  optionValueType?: "string" | "array";
  filterValuesGetter?: (option: InputInfoOption<K>) => string[];
  fixedOptions?: string[];
  optionInputOnly?: boolean;
  optionsDisplayLimit?: number;
  isSingleOption?: boolean;
  optionsUseId?: boolean;
  optionField?: string;
  optionDialog?: boolean;
}

export type InputInfoOption<T = string> = {value: T; label?: string; disabled?: boolean} | T;

export type InputInfoOptions<T = string> = InputInfoOption<T>[];
