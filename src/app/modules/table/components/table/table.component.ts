import {SelectionModel} from "@angular/cdk/collections";
import {FlatTreeControl} from "@angular/cdk/tree";
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  DoCheck,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  KeyValueChanges,
  KeyValueDiffer,
  KeyValueDiffers,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  viewChild,
  ViewChild,
  viewChildren
} from "@angular/core";
import {FormControl, ValidationErrors} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectChange, MatSelectModule} from "@angular/material/select";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {MatTable, MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatTreeFlatDataSource, MatTreeFlattener} from "@angular/material/tree";
import {getArray, getFilepathUrl, joinOptions, splitOptions} from "@app/app.common";
import {getValueString} from "@app/utils/get-value";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {CadOptionsInput} from "@components/dialogs/cad-options/cad-options.types";
import {CadData} from "@lucilor/cad-viewer";
import {downloadByString, isTypeOf, queryString, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import {Properties} from "csstype";
import {cloneDeep, debounce, intersection, isEmpty, isEqual, uniqueId} from "lodash";
import {Subscription} from "rxjs";
import {ImageComponent} from "../../../image/components/image/image.component";
import {
  CellChangeEvent,
  CellEvent,
  ColumnInfo,
  FilterAfterEvent,
  InfoKey,
  ItemGetter,
  RowButtonEvent,
  RowButtonEventBase,
  RowSelectionChange,
  TableButton,
  TableRenderInfo,
  ToolbarButtonEvent
} from "./table.types";
import {getInputInfosFromTableColumns} from "./table.utils";

@Component({
  selector: "app-table",
  templateUrl: "./table.component.html",
  styleUrls: ["./table.component.scss"],
  imports: [
    forwardRef(() => CadImageComponent),
    forwardRef(() => InputComponent),
    ImageComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule
  ]
})
export class TableComponent<T> implements AfterViewInit, OnChanges, DoCheck {
  @HostBinding("class") class: string | string[] | undefined;

  @Input() info: TableRenderInfo<T> = {data: [], columns: []};
  @Output() rowButtonClick = new EventEmitter<RowButtonEvent<T>>();
  @Output() rowSelectionChange = new EventEmitter<RowSelectionChange<T>>();
  @Output() cellFocus = new EventEmitter<CellEvent<T>>();
  @Output() cellBlur = new EventEmitter<CellEvent<T>>();
  @Output() cellChange = new EventEmitter<CellChangeEvent<T>>();
  @Output() cellClick = new EventEmitter<CellEvent<T>>();
  @Output() toolbarButtonClick = new EventEmitter<ToolbarButtonEvent>();
  @Output() filterAfter = new EventEmitter<FilterAfterEvent<T>>();

  protected _rowSelection: SelectionModel<T>;
  columnFields: (keyof T | "select")[] = [];
  @ViewChild(MatTable) table?: MatTable<T>;
  @ViewChild(MatSort) sort?: MatSort;
  private infoDiffer: KeyValueDiffer<string, any>;
  treeControl = new FlatTreeControl<any>(
    (node) => node.level,
    (node) => node.expandable
  );
  treeFlattener = new MatTreeFlattener(
    (node: any, level: number) => {
      node.expandable = !!node.children && node.children.length > 0;
      node.level = level;
      return node;
    },
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children
  );

  dataSource: MatTreeFlatDataSource<any, any> | MatTableDataSource<T> = new MatTableDataSource();

  editing: {colIdx: number; rowIdx: number; value: string};
  filterForm = new Map<keyof T, string>();
  filterInputInfosFlag = signal(0);
  filterInputInfos = computed(() => {
    this.filterInputInfosFlag();
    const info = this.info;
    const filterable = info.filterable;
    if (!filterable) {
      return null;
    }
    let fields: (keyof T)[] | undefined;
    if (typeof filterable === "object") {
      fields = filterable.fields;
    }
    const columns = this.info.columns;
    if (!fields) {
      fields = columns.map((v) => v.field);
    }
    const form = this.filterForm;
    return fields.map((field) => {
      const column = columns.find((v) => v.field === field);
      let label = "搜索";
      if (column) {
        label += `：${column.name || String(column.field)}`;
      }
      const options = new Set<string>();
      for (const item of info.data) {
        const value = getValueString(item[field]);
        if (value) {
          options.add(value);
        }
      }
      const onChange = (val: string) => {
        form.set(field, val);
        this.filterTable();
      };
      const info2: InputInfo = {
        type: "string",
        label,
        clearable: true,
        value: form.get(field) || "",
        options: Array.from(options),
        onInput: debounce(onChange, 100),
        onChange,
        style: {width: "150px"}
      };
      return info2;
    });
  });

  get toolbarButtons() {
    return this.info.toolbarButtons || {};
  }
  get haveToolbarButtons() {
    return Object.keys(this.toolbarButtons).length > 0 || this.info.filterable;
  }
  get haveData() {
    return this.info.data.length > 0;
  }

  constructor(
    private message: MessageService,
    private differs: KeyValueDiffers,
    private dialog: MatDialog,
    private http: CadDataService,
    private status: AppStatusService,
    private cd: ChangeDetectorRef
  ) {
    this.editing = {colIdx: -1, rowIdx: -1, value: ""};
    this.infoDiffer = this.differs.find(this.info).create();
    this._rowSelection = this._initRowSelection();
  }
  private _rowSelectionSubscription?: Subscription;
  private _initRowSelection() {
    this._rowSelectionSubscription?.unsubscribe();
    const rowSelection = this.info.rowSelection;
    const model = new SelectionModel<T>(rowSelection?.mode === "multiple", []);
    this._rowSelectionSubscription = model.changed.subscribe(() => {
      this.rowSelectionChange.emit({items: model.selected});
    });
    this._rowSelection = model;
    if (rowSelection?.selectedItems) {
      model.select(...rowSelection.selectedItems);
    }
    return model;
  }

  ngAfterViewInit() {
    if (this.dataSource instanceof MatTableDataSource) {
      this.dataSource.sort = this.sort || null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.info) {
      this.infoDiffer = this.differs.find(this.info).create();
    }
  }

  ngDoCheck() {
    const changes = this.infoDiffer.diff(this.info) as KeyValueChanges<InfoKey, any>;
    if (changes) {
      this.infoChanged(changes);
    }
  }

  infoChanged(changes: KeyValueChanges<InfoKey, any>) {
    const changedKeys: InfoKey[] = [];
    changes.forEachChangedItem((v) => {
      changedKeys.push(v.key);
    });
    changes.forEachAddedItem((v) => {
      changedKeys.push(v.key);
    });
    changes.forEachRemovedItem((v) => {
      changedKeys.push(v.key);
    });

    this.filterInputInfosFlag.update((v) => v + 1);

    if (intersection<InfoKey>(changedKeys, ["columns", "rowSelection"]).length > 0) {
      this.columnFields = [...this.info.columns.filter((v) => !v.hidden).map((v) => v.field)];
      const rowSelection = this.info.rowSelection;
      if (rowSelection) {
        if (changedKeys.includes("rowSelection")) {
          this._initRowSelection();
        }
        if (!rowSelection.hideCheckBox) {
          this.columnFields.unshift("select");
        }
      }
    }
    if (intersection<InfoKey>(changedKeys, ["data", "isTree"]).length > 0) {
      const data = this.info.data;
      if (this.info.isTree) {
        this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener, data);
      } else {
        this.dataSource = new MatTableDataSource(data);
      }
      this.filterTable();
    }
    if (intersection<InfoKey>(changedKeys, ["class"]).length > 0) {
      this.class = this.info.class;
    }
    if (intersection<InfoKey>(changedKeys, ["columns"]).length > 0) {
      this.updateCellInputInfos();
    }
  }

  get filteredData() {
    const {dataSource} = this;
    if (dataSource instanceof MatTableDataSource) {
      return dataSource.filteredData;
    } else {
      return dataSource.data;
    }
  }
  isAllSelected() {
    const numSelected = this._rowSelection.selected.length;
    const numRows = this.filteredData.length;
    return numSelected > 0 && numSelected >= numRows;
  }
  isPartiallySelected() {
    const numSelected = this._rowSelection.selected.length;
    const numRows = this.filteredData.length;
    return numSelected > 0 && numSelected < numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.setSelectedItems([]);
    } else {
      this.setSelectedItems(this.filteredData);
    }
  }
  toggleRowSelection(item: T) {
    this._rowSelection.toggle(item);
    this.rowSelectionChange.emit({items: this._rowSelection.selected});
  }
  getSelectedItems() {
    const rows: T[] = [];
    for (const item of this._rowSelection.selected) {
      rows.push(item);
    }
    return rows;
  }
  setSelectedItems(items: T[]) {
    this._rowSelection.setSelection(...items);
    this.cd.detectChanges();
    this.rowSelectionChange.emit({items: this._rowSelection.selected});
  }
  selectAllRows() {
    this.setSelectedItems(this.info.data);
  }
  deselectAllRows() {
    this.setSelectedItems([]);
  }

  refresh() {
    this.updateCellInputInfos();
  }

  async addItem(rowIdx?: number) {
    const {onlineMode, isTree, newItem, data} = this.info;
    if (onlineMode) {
      const infos = getInputInfosFromTableColumns(this.info.columns.filter((v) => v.required));
      const values = await this.message.form(infos);
      if (values) {
        const {tableName, refresh} = onlineMode;
        const insertResult = await this.http.tableInsert({table: tableName, data: values});
        if (insertResult) {
          await refresh();
        }
      }
    } else {
      if (isTree) {
        this.message.error("树形表格不支持添加");
      }
      if (!newItem) {
        console.warn("no newItem to add");
        return;
      }
      if (typeof rowIdx !== "number") {
        rowIdx = data.length;
      }
      if (typeof newItem === "function") {
        let result = (newItem as ItemGetter<T>)(rowIdx);
        if (result instanceof Promise) {
          result = await result;
        }
        if (result) {
          data.splice(rowIdx, 0, cloneDeep(result));
        }
      } else {
        data.splice(rowIdx, 0, cloneDeep(newItem));
      }
      this.dataSource.data = data;
      this.updateCellInputInfos();
    }
  }

  async removeItem(index?: number) {
    const {info, _rowSelection: rowSelection} = this;
    const {onlineMode, isTree, data} = info;
    if (onlineMode) {
      const vids = rowSelection.selected.map((v) => Number((v as any).vid));
      if (vids.length < 1) {
        this.message.error("未选中任何数据");
        return;
      } else if (await this.message.confirm(`确定删除选中的${vids.length}条数据？`)) {
        const {tableName, refresh} = onlineMode;
        const deleteResult = await this.http.tableDelete({table: tableName, vids});
        if (deleteResult) {
          await refresh();
        }
      }
    } else {
      if (isTree) {
        this.message.error("树形表格不支持删除");
      }
      if (typeof index === "number") {
        data.splice(index, 1);
      } else {
        const toRemove: number[] = [];
        data.forEach((item, i) => {
          if (rowSelection.isSelected(item)) {
            toRemove.unshift(i);
          }
        });
        toRemove.forEach((v) => data.splice(v, 1));
        this.setSelectedItems([]);
      }
      this.dataSource.data = data;
      this.updateCellInputInfos();
    }
  }

  setCellValue(event: any, colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    const {field, type} = column;
    const {onlineMode} = this.info;
    const valueBefore = item[field];
    if (event instanceof MatSelectChange) {
      item[field] = event.value;
    } else if (event instanceof MatSlideToggleChange) {
      item[field] = event.checked as any;
      if (onlineMode) {
        item[field] = (event.checked ? 1 : 0) as any;
      } else {
        item[field] = event.checked as any;
      }
    } else if (event instanceof Event) {
      const value = (event.target as HTMLInputElement).value;
      if (type === "number") {
        item[field] = Number(value) as any;
      } else {
        item[field] = value as any;
      }
    } else {
      item[field] = event;
    }
    const valueAfter = item[field];
    if (!isEqual(valueBefore, valueAfter)) {
      const errors: ValidationErrors = {};
      const control = new FormControl(valueAfter, column.validators);
      for (const validator of getArray(column.validators2)) {
        const errors2 = validator({column, item, rowIdx, colIdx});
        Object.assign(errors, errors2);
      }
      const item2 = item as TableDataBase;
      if (onlineMode && isEmpty(control.errors) && isEmpty(errors)) {
        this.http.tableUpdate({table: onlineMode.tableName, data: {vid: item2.vid, [field]: valueAfter}});
      }
      this.cellChange.emit({column, item, colIdx, rowIdx, value: valueAfter});
    }
  }

  onCellFocus(_event: FocusEvent, colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    this.cellFocus.emit({column, item, colIdx, rowIdx});
  }

  onCellBlur(_event: FocusEvent, colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    this.cellBlur.emit({column, item, colIdx, rowIdx});
  }

  async onCellClick(event: CellEvent<T>) {
    this.cellClick.emit(event);
  }

  onRowButtonClick(button: TableButton<RowButtonEventBase<T>>, event: RowButtonEventBase<T>) {
    button.onClick?.(event);
    this.rowButtonClick.emit({button, ...event});
  }

  export() {
    let selectedItems = this._rowSelection.selected;
    if (selectedItems.length < 1) {
      selectedItems = this.info.data;
    }
    if (typeof this.info.dataTransformer === "function") {
      selectedItems = this.info.dataTransformer("export", selectedItems);
    }
    downloadByString(JSON.stringify(selectedItems), {filename: (this.info.title ?? "table") + ".json"});
  }

  async import() {
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      this.message.alert("没有选择文件");
      return;
    }
    const text = await file.text();
    let data: T[] | undefined;
    try {
      data = JSON.parse(text);
    } catch {
      this.message.alert("读取文件失败");
    }
    if (Array.isArray(data)) {
      if (typeof this.info.dataTransformer === "function") {
        data = this.info.dataTransformer("import", data);
      }
      if (Array.isArray(data)) {
        data.forEach((v) => this.info.data.push(v));
      } else {
        this.message.alert("数据格式错误");
      }
    } else {
      this.message.alert("数据格式错误");
    }
  }

  isColumnEditable(event: CellEvent<T>, forgetEditMode = false) {
    const {type, editable} = event.column;
    if (type === "cad" && !this.getIsTypeCadEnabled(event)) {
      return false;
    }
    return !!((forgetEditMode || this.info.editMode) && editable);
  }

  getColumnOptions(column: ColumnInfo<T>) {
    if (column.type === "select") {
      return column.options;
    }
    return [];
  }

  getColumnButtons(column: ColumnInfo<T>) {
    if (column.type === "button") {
      return column.buttons;
    }
    return [];
  }

  cellInputs = viewChildren<InputComponent>("cellInput");
  cellInputInfos = signal<InputInfo[][]>([]);
  updateCellInputInfos() {
    const cellInputInfos: InputInfo[][] = [];
    for (const [rowIdx, item] of this.filteredData.entries()) {
      const group: InputInfo[] = [];
      for (const [colIdx, column] of this.info.columns.entries()) {
        group.push(this.getCellInputInfo({column, item, colIdx, rowIdx}));
      }
      cellInputInfos.push(group);
    }
    this.cellInputInfos.set(cellInputInfos);
  }
  isVaild() {
    for (const input of this.cellInputs()) {
      const errors = input.validateValue();
      if (!isEmpty(errors)) {
        return false;
      }
    }
    return true;
  }

  toTypeString(str: any) {
    return str as string;
  }

  getCheckBoxStyle() {
    const style: Properties = {};
    const checkBoxSize = 50;
    style.flex = `0 0 ${checkBoxSize}px`;
    return style;
  }

  getCellClass(column: ColumnInfo<T>, item: T | null, rowIdx: number, colIdx: number) {
    const classes = new Set(["column-type-" + column.type]);
    const {activeRows, rowSelection, getCellClass} = this.info;
    let active = activeRows?.includes(rowIdx);
    if (!active && rowSelection && !rowSelection.noActive && item && this._rowSelection.isSelected(item)) {
      active = true;
    }
    if (active) {
      classes.add("active");
    }
    if (item && getCellClass) {
      const classes2 = getCellClass({column, item, rowIdx, colIdx});
      if (classes2 && typeof classes2 === "string") {
        for (const cls of classes2.split(" ")) {
          classes.add(cls);
        }
      } else if (Array.isArray(classes2)) {
        for (const cls of classes2) {
          classes.add(cls);
        }
      }
    }
    return Array.from(classes);
  }

  getCellStyle(column: ColumnInfo<T>, item: T | null, rowIdx: number, colIdx: number) {
    const {getCellStyle} = this.info;
    const style = {...column.style};
    if (item && getCellStyle) {
      Object.assign(style, getCellStyle({column, item, rowIdx, colIdx}));
    }
    if (column.width) {
      style.flex = `0 0 ${column.width}`;
    } else if (!style.flex) {
      style.flex = "1 1 0";
    }
    return style;
  }

  getItemImgSmall(item: T, column: ColumnInfo<T>) {
    const {type} = column;
    if (type === "image") {
      const {hasSmallImage} = column;
      const value = item[column.field] as string;
      if (hasSmallImage) {
        return getFilepathUrl(value, {prefix: "s_"});
      } else {
        return getFilepathUrl(value);
      }
    } else {
      return "";
    }
  }

  getItemImgLarge(item: T, column: ColumnInfo<T>) {
    const {type} = column;
    if (type === "image") {
      const value = item[column.field] as string;
      return getFilepathUrl(value);
    } else {
      return "";
    }
  }

  // TODO: 提高效率
  getItemCadImgId(item: T, column: ColumnInfo<T>) {
    const value = item[column.field];
    let id: string;
    if (typeof value === "string") {
      try {
        id = JSON.parse(value).id;
      } catch {
        id = "";
      }
    } else if (value instanceof CadData) {
      id = value.id;
    } else {
      return "";
    }
    return id;
  }

  async uploadFile(colIdx: number, rowIdx: number, item: T) {
    const {onlineMode} = this.info;
    if (!onlineMode) {
      return;
    }
    const column = this.info.columns[colIdx];
    const vid = Number((item as any).vid);
    const field = column.field as any;
    let accept: string | undefined;
    switch (column.type) {
      case "image":
        accept = "image/*";
        break;
      case "file":
        accept = column.mime;
        break;
      default:
        return;
    }
    const file = (await selectFiles({accept}))?.[0];
    if (!file) {
      return;
    }
    await this.http.tableUploadFile({table: onlineMode.tableName, vid, field, file});
  }

  async deleteFile(colIdx: number, rowIdx: number, item: T) {
    const {onlineMode} = this.info;
    if (!onlineMode) {
      return;
    }
    const column = this.info.columns[colIdx];
    const vid = Number((item as any).vid);
    const field = column.field as any;
    await this.http.tableDeleteFile({table: onlineMode.tableName, vid, field});
  }

  onToolbarBtnClick(button: TableButton) {
    button.onClick?.();
    this.toolbarButtonClick.emit({button});
  }

  toggleEditMode() {
    this.info.editMode = !this.info.editMode;
  }

  async selectOptions(colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    const {type, field} = column;
    if (type !== "link") {
      return;
    }
    const {linkedTable, multiSelect} = column;
    const checkedVids = splitOptions(item[field] as string).map((v) => Number(v));
    const data: CadOptionsInput = {name: linkedTable, checkedVids, multi: multiSelect};
    const result = await openCadOptionsDialog(this.dialog, {data});
    if (result) {
      const value = joinOptions(result.options.map((v) => String(v.vid)));
      this.setCellValue(value, colIdx, rowIdx, item);
    }
  }

  async openCad(colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    if (column.type === "cad" && this.isColumnEditable({column, item, colIdx, rowIdx}, true)) {
      let cadData: CadData | undefined;
      try {
        cadData = new CadData(JSON.parse(item[column.field] as string));
      } catch {}
      if (cadData) {
        const data: OpenCadOptions = {data: cadData, isLocal: true, center: true};
        const result = await openCadEditorDialog(this.dialog, {data});
        if (result?.savedData) {
          const cadData2 = result?.savedData;
          this.setCellValue(JSON.stringify(cadData2.export()), colIdx, rowIdx, item);
        }
      }
    }
  }

  async uploadCad(colIdx: number, rowIdx: number, item: T) {
    const file = (await selectFiles({accept: ".dxf"}))?.[0];
    if (!file) {
      return;
    }
    const data = await this.http.uploadDxf(file);
    if (data) {
      this.setCellValue(JSON.stringify(data.export()), colIdx, rowIdx, item);
    }
  }

  async deleteCad(colIdx: number, rowIdx: number, item: T) {
    this.setCellValue("", colIdx, rowIdx, item);
  }

  getIsTypeCadEnabled(event: CellEvent<T>) {
    const {type} = event.column;
    if (type !== "cad") {
      return false;
    }
    const {filterFn} = event.column;
    if (filterFn) {
      return filterFn(event);
    }
    return true;
  }

  exportExcel(opts?: {filename?: string}) {
    const data: string[][] = [];
    if (this.info.title) {
      data.push([this.info.title]);
    }
    const columns = this.info.columns.filter((v) => !v.hidden);
    data.push(columns.map((v) => v.name || (v.field as string)));
    const addRows = (source: any[]) => {
      for (const [i, item] of source.entries()) {
        const row: string[] = [];
        for (const column of columns) {
          let value = item[column.field];
          if (column.type === "link") {
            value = this.getValueString(item, column, i);
          }
          if (typeof value === "string") {
            row.push(value);
          } else if (value instanceof CadData) {
            row.push(JSON.stringify(value.export()));
          } else if (value === null || value === undefined) {
            row.push("");
          } else if (typeof value === "object") {
            row.push(JSON.stringify(value));
          } else {
            row.push(String(value));
          }
        }
        data.push(row);
        if (Array.isArray(item.children)) {
          addRows(item.children);
        }
      }
    };
    addRows(this.info.data);
    this.http.downloadExcel(data, this.info.title, opts?.filename);
  }

  getCellInputInfo(event: CellEvent<T>): InputInfo<T> {
    let info: InputInfo = {type: "string", label: ""};
    const onChange = (value: any) => {
      this.cellChange.emit({...event, value});
    };
    const column = event.column;
    switch (column.type) {
      case "string":
      case "boolean":
      case "image":
        info = {type: column.type, label: "", onChange};
        break;
      case "number":
        info = {type: column.type, label: "", onChange, ndigits: column.ndigits};
        break;
      case "select":
        info = {type: column.type, label: "", options: column.options, onChange};
    }
    const {item} = event;
    let descriptor = Object.getOwnPropertyDescriptor(item, event.column.field);
    if (!descriptor && item instanceof Object) {
      descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(item), event.column.field);
    }
    if (!descriptor || descriptor?.set || descriptor?.writable) {
      info.model = {data: item, key: column.field};
    } else {
      info.value = item[column.field];
    }
    const {rowIdx, colIdx} = event;
    info.validators = [
      ...getArray(column.validators),
      ...getArray(column.validators2).map((validator) => {
        return () => validator({column, item, rowIdx, colIdx});
      })
    ];
    info.style = {width: "0", flex: "1 1 0"};
    return info;
  }

  getValueString(item: T, column: ColumnInfo<T>, index: number) {
    const {getString} = column;
    if (typeof getString === "function") {
      return getString(item, index);
    }
    const value = item[column.field];

    switch (column.type) {
      case "link":
        if (typeof value === "string") {
          const vals = splitOptions(value);
          return joinOptions(vals.map((v) => column.links[v]));
        } else {
          return String(value);
        }
      case "boolean":
        return getValueString(value, {forceBoolean: true});
      case "number":
        return getValueString(value, {ndigits: column.ndigits});
      default:
        return getValueString(value);
    }
  }

  filterTable() {
    const {filterable} = this.info;
    const dataSource = this.dataSource;
    if (!filterable || !(dataSource instanceof MatTableDataSource)) {
      return;
    }
    dataSource.filterPredicate = (data: T) => {
      if (!filterable || !isTypeOf(data, "object")) {
        return true;
      }
      const form = this.filterForm;
      let valid = true;
      for (const [k, v] of form) {
        const dataVal = getValueString(data[k]);
        if (!queryString(v.trim(), dataVal)) {
          valid = false;
        }
      }
      if (!valid) {
        this._rowSelection.deselect(data);
      }
      return valid;
    };
    dataSource.filter = uniqueId("tableFilter");
    this.filterAfter.emit({dataSource});
    this.updateCellInputInfos();
  }

  tableEl = viewChild("tableComponent", {read: ElementRef<HTMLElement>});
  scrollToRow(index: number) {
    const tableEl = this.tableEl()?.nativeElement;
    if (tableEl) {
      const row = tableEl.querySelectorAll("app-table mat-table mat-row")[index];
      if (row) {
        row.scrollIntoView({block: "center"});
      }
    }
  }
}
