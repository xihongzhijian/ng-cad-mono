import {AbstractControlOptions, ValidationErrors} from "@angular/forms";
import {MatTableDataSource} from "@angular/material/table";
import {MaybePromise, ObjectOf} from "@lucilor/utils";
import {InputInfoOptions} from "@modules/input/components/input.types";
import {Properties} from "csstype";

export interface TableRenderInfo<T> {
  data: T[];
  columns: ColumnInfo<T>[];
  newItem?: T | ItemGetter<T>;
  title?: string;
  titleStyle?: Properties;
  subTitle?: string;
  subTitleStyle?: Properties;
  inlineTitle?: boolean;
  editMode?: boolean;
  sortable?: boolean;
  filterable?: boolean | TableRenderInfoFilterable<T>;
  rowSelection?: RowSelection<T>;
  activeRows?: number[];
  dataTransformer?: DataTransformer<T>;
  toolbarButtons?: {
    add?: boolean;
    remove?: boolean;
    import?: boolean;
    export?: boolean;
    editModeToggle?: boolean;
    extra?: TableButton[];
  };
  isTree?: boolean;
  onlineMode?: {tableName: string; refresh: () => MaybePromise<void>};
  noScroll?: boolean;
  class?: string | string[];
  style?: Properties;
  getCellClass?: (event: CellEvent<T>) => string | string[];
  getCellStyle?: (event: CellEvent<T>) => Properties;
  hideHeader?: boolean;
  compactColumnButton?: boolean;
}
export interface TableRenderInfoFilterable<T> {
  fields?: (keyof T | TableRenderInfoFilterableField<T>)[];
}
export interface TableRenderInfoFilterableField<T> {
  field: keyof T;
  valueGetter: (item: T) => string;
}

export interface RowSelection<T> {
  mode: "single" | "multiple";
  hideCheckBox?: boolean;
  noActive?: boolean;
  selectedItems?: T[];
}

export interface TableButton<T = void> {
  event: string;
  title?: string;
  class?: string | string[];
  style?: Properties;
  hidden?: boolean;
  onClick?: (params: T) => void;
}

export type TableItemValidator<T> = (data: RowButtonEventBase<T>) => ValidationErrors | null;

export interface ColumnInfoBase<T> {
  field: keyof T;
  name?: string;
  width?: string;
  editable?: boolean;
  required?: boolean;
  sticky?: boolean;
  stickyEnd?: boolean;
  hidden?: boolean;
  style?: Properties;
  getString?: (value: T, index: number) => string;
  validators?: AbstractControlOptions["validators"];
  validators2?: TableItemValidator<T> | TableItemValidator<T>[];
}

export interface ColumnInfoNormal<T> extends ColumnInfoBase<T> {
  type: "string" | "boolean" | "checkbox";
}

export interface ColumnInfoNumber<T> extends ColumnInfoBase<T> {
  type: "number";
  ndigits?: number;
}

export interface ColumnInfoTime<T> extends ColumnInfoBase<T> {
  type: "time";
}

export interface ColumnInfoSelect<T, K = any> extends ColumnInfoBase<T> {
  type: "select";
  options: InputInfoOptions<K>;
}

export interface ColumnInfoButton<T> extends ColumnInfoBase<T> {
  type: "button";
  buttons: TableButton<RowButtonEventBase<T>>[];
  showValue?: boolean;
}

export interface ColumnInfoLink<T> extends ColumnInfoBase<T> {
  type: "link";
  links: ObjectOf<string>;
  linkedTable: string;
  multiSelect?: boolean;
}

export interface ColumnInfoImage<T> extends ColumnInfoBase<T> {
  type: "image";
  hasSmallImage?: boolean;
  noLazy?: boolean;
}

export interface ColumnInfoFile<T> extends ColumnInfoBase<T> {
  type: "file";
  mime?: string;
}

export interface ColumnInfoCad<T> extends ColumnInfoBase<T> {
  type: "cad";
  filterFn?: (event: CellEvent<T>) => boolean;
}

export type ColumnInfo<T> =
  | ColumnInfoTime<T>
  | ColumnInfoNormal<T>
  | ColumnInfoNumber<T>
  | ColumnInfoSelect<T>
  | ColumnInfoButton<T>
  | ColumnInfoLink<T>
  | ColumnInfoImage<T>
  | ColumnInfoFile<T>
  | ColumnInfoCad<T>;

export interface ToolbarButtonEvent {
  button: TableButton;
}

export interface RowButtonEventBase<T> {
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}
export interface RowButtonEvent<T> {
  button: TableButton<RowButtonEventBase<T>>;
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}
export interface RowSelectionChange<T> {
  items: T[];
}

export interface CellEvent<T> {
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}

export interface CellChangeEvent<T> extends CellEvent<T> {
  value: any;
}

export interface FilterAfterEvent<T> {
  dataSource: MatTableDataSource<T>;
}

export type ItemGetter<T> = ((rowIdx: number) => T | null) | ((rowIdx: number) => Promise<T | null>);

export type DataTransformer<T, K = any> = (type: "import" | "export", data: T[]) => K[];

export type InfoKey<T = any> = keyof TableRenderInfo<T>;
