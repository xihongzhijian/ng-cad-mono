import {animate, state, style, transition, trigger} from "@angular/animations";
import {NgIf} from "@angular/common";
import {Component, OnInit, ViewChild} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {ActivatedRoute, Router} from "@angular/router";
import {session, setGlobal} from "@app/app.common";
import {environment} from "@env";
import {timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableInsertParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo} from "@modules/table/components/table/table.types";
import {convertTableRenderData, getInputInfosFromTableColumns} from "@modules/table/components/table/table.utils";
import {cloneDeep} from "lodash";
import {DingdanBomCacheData, DingdanBomData, DingdanBomDataResponseData} from "./bom-gongyiluxian.types";

@Component({
  selector: "app-bom-gongyiluxian",
  templateUrl: "./bom-gongyiluxian.component.html",
  styleUrls: ["./bom-gongyiluxian.component.scss"],
  animations: [
    trigger("detailExpand", [
      state("collapsed", style({height: "0px", minHeight: "0"})),
      state("expanded", style({height: "*"})),
      transition("expanded <=> collapsed", animate("225ms cubic-bezier(0.4, 0.0, 0.2, 1)"))
    ])
  ],
  standalone: true,
  imports: [MatButtonModule, NgIf, MatSlideToggleModule, FormsModule, TableComponent]
})
export class BomGongyiluxianComponent implements OnInit {
  table = "b_dingdanbom";
  dataRaw: DingdanBomDataResponseData | null = null;
  info: TableRenderInfo<DingdanBomData> = {
    data: [],
    columns: [{type: "string", field: "mingzi", name: "名称"}],
    toolbarButtons: {editModeToggle: true},
    noCheckBox: true,
    isTree: true,
    onlineMode: {tableName: this.table, refresh: () => this.refresh(true)}
  };
  private _cacheKey = "bomGongyiluxianCache";
  environment = environment;
  private _noCad = session.load("bomGongyiluxianNoCad") ?? false;
  get noCad() {
    return this._noCad;
  }
  set noCad(value) {
    this._noCad = value;
    session.save("bomGongyiluxianNoCad", value);
  }

  @ViewChild("table") tableComponent?: TableComponent<DingdanBomData>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private message: MessageService,
    private dataService: CadDataService,
    private spinner: SpinnerService
  ) {
    setGlobal("bomGongyiluxian", this);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(() => {
      this.refresh();
    });
  }

  async refresh(clearCache = false) {
    let {code} = this.route.snapshot.queryParams;
    if (!code) {
      code = await this.message.prompt({type: "string", label: "订单编号", validators: Validators.required});
      if (code) {
        this.router.navigate([], {queryParams: {code}, queryParamsHandling: "merge"});
      }
    }
    if (!code) {
      return;
    }
    if (clearCache) {
      this.clearCache();
    }
    const {table} = this;
    let dataRaw: typeof this.dataRaw;
    if (this.loadCache()) {
      dataRaw = this.dataRaw;
    } else {
      const response = await this.dataService.post<DingdanBomDataResponseData>("ngcad/getDingdanBomData", {table, code});
      dataRaw = this.dataService.getData(response);
      this.dataRaw = dataRaw;
      this.saveCache();
    }
    if (!dataRaw) {
      return;
    }
    this.info.data = dataRaw.data;
    this.info.title = dataRaw.title;
    if (dataRaw.tableData) {
      convertTableRenderData(dataRaw.tableData, this.info);
      for (const column of this.info.columns) {
        if (["suanliaocad"].includes(column.field)) {
          column.type = "cad";
          column.hidden = this.noCad;
          if (column.type === "cad") {
            column.filterFn = (event) => !!event.item.shicadjiegouliao;
          }
        }
      }
      // this.info.columns[0].sticky = true;
      this.info.columns.splice(1, 0, {
        type: "button",
        field: "children",
        name: "操作",
        buttons: [{event: "add", title: "添加", color: "primary"}],
        width: "80px"
      });
    }
    await timeout(0);
    const treeControl = this.tableComponent?.treeControl;
    if (treeControl) {
      treeControl.expand(treeControl.dataNodes[0]);
    }
  }

  loadCache() {
    if (environment.production) {
      return false;
    }
    const cachedData = session.load<DingdanBomCacheData>(this._cacheKey);
    if (cachedData) {
      this.dataRaw = cachedData.dataRaw;
      return true;
    }
    return false;
  }

  saveCache() {
    if (environment.production) {
      return;
    }
    session.save<DingdanBomCacheData>(this._cacheKey, {dataRaw: this.dataRaw});
  }

  clearCache() {
    session.remove(this._cacheKey);
  }

  async addItem(fromItem: DingdanBomData) {
    const keys: (keyof DingdanBomData)[] = ["dingdanbianhao", "fuji", "xinghaobianma"];
    const columns = this.info.columns.filter((v) => v.required && !keys.includes(v.field));
    const values = await this.message.form(getInputInfosFromTableColumns(columns));
    const item = this.dataRaw?.data[0];
    if (values) {
      for (const key of keys) {
        values[key] = fromItem[key];
      }
      const data: TableInsertParams<DingdanBomData> = {
        table: this.table,
        data: values
      };
      await this.dataService.tableInsert(data);
      this.refresh(true);
    }
    return item;
  }

  onRowButtonClick(event: RowButtonEvent<DingdanBomData>) {
    switch (event.button.event) {
      case "add":
        this.addItem(event.item);
        break;
    }
  }

  private _setColumns() {
    if (!this.dataRaw) {
      return [];
    }
    const columnNames = this.dataRaw.printColumns;
    const columnsBefore = cloneDeep(this.info.columns);
    this.info.columns = this.info.columns.map((col) => {
      col.hidden = !columnNames.includes(col.name || col.field);
      return col;
    });
    return columnsBefore;
  }

  private _restoreColumns(columnsBefore: ReturnType<BomGongyiluxianComponent["_setColumns"]>) {
    this.info.columns = columnsBefore;
  }

  async print() {
    const columnsBefore = this._setColumns();
    await timeout(0);
    this.tableComponent?.treeControl.expandAll();
    await timeout(0);
    window.print();
    this._restoreColumns(columnsBefore);
  }

  async exportExcel() {
    const columnsBefore = this._setColumns();
    this.tableComponent?.exportExcel();
    this._restoreColumns(columnsBefore);
  }
}
