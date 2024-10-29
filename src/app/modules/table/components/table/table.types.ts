import {AbstractControlOptions} from "@angular/forms";
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
  rowSelection?: RowSelection;
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
}
export interface TableRenderInfoFilterable<T> {
  fields?: (keyof T)[];
}

export interface RowSelection {
  mode: "single" | "multiple";
  hideCheckBox?: boolean;
  noActive?: boolean;
}

export interface TableButton {
  event: string;
  title?: string;
  color?: "" | "primary" | "accent" | "warn";
  class?: string | string[];
  style?: Properties;
  hidden?: boolean;
}

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
  getString?: (value: T) => string;
  validators?: AbstractControlOptions["validators"];
}

export interface ColumnInfoNormal<T> extends ColumnInfoBase<T> {
  type: "string" | "number" | "boolean" | "checkbox";
}

export interface ColumnInfoTime<T> extends ColumnInfoBase<T> {
  type: "time";
}

export interface ColumnInfoSelect<T> extends ColumnInfoBase<T> {
  type: "select";
  options: InputInfoOptions;
}

export interface ColumnInfoButton<T> extends ColumnInfoBase<T> {
  type: "button";
  buttons: TableButton[];
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
  | ColumnInfoSelect<T>
  | ColumnInfoButton<T>
  | ColumnInfoLink<T>
  | ColumnInfoImage<T>
  | ColumnInfoFile<T>
  | ColumnInfoCad<T>;

export interface ToolbarButtonEvent {
  button: TableButton;
}

export interface RowButtonEvent<T> {
  button: TableButton;
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}
export interface RowSelectionChange {
  indexs: number[];
}

export interface CellEvent<T> {
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}

export interface FilterAfterEvent<T> {
  dataSource: MatTableDataSource<T>;
}

export type ItemGetter<T> = ((rowIdx: number) => T | null) | ((rowIdx: number) => Promise<T | null>);

export type DataTransformer<T, K = any> = (type: "import" | "export", data: T[]) => K[];

export type InfoKey<T = any> = keyof TableRenderInfo<T>;
