import {animate, state, style, transition, trigger} from "@angular/animations";
import {Component, effect, inject, signal, untracked, viewChild} from "@angular/core";
import {toSignal} from "@angular/core/rxjs-interop";
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
  imports: [FormsModule, MatButtonModule, MatSlideToggleModule, TableComponent]
})
export class BomGongyiluxianComponent {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  table = "b_dingdanbom";
  dataRaw: DingdanBomDataResponseData | null = null;
  info = signal<TableRenderInfo<DingdanBomData>>({data: [], columns: []});
  private _cacheKey = "bomGongyiluxianCache";
  environment = environment;

  private _noCadKey = "bomGongyiluxianNoCad";
  noCad = signal(session.load(this._noCadKey) ?? false);
  noCadEff = effect(() => {
    session.save(this._noCadKey, this.noCad());
  });

  tableComponent = viewChild(TableComponent<DingdanBomData>);

  constructor() {
    setGlobal("bomGongyiluxian", this);
  }

  queryParams = toSignal(this.route.queryParams);
  queryParamsEff = effect(() => {
    this.queryParams();
    untracked(() => this.refresh());
  });

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
      dataRaw = await this.http.getData<DingdanBomDataResponseData>("ngcad/getDingdanBomData", {table, code});
      this.dataRaw = dataRaw;
      this.saveCache();
    }
    if (!dataRaw) {
      return;
    }
    const info: TableRenderInfo<DingdanBomData> = {
      data: [],
      columns: [{type: "string", field: "mingzi", name: "名称"}],
      toolbarButtons: {editModeToggle: true},
      isTree: true,
      onlineMode: {tableName: this.table, refresh: () => this.refresh(true)}
    };
    info.data = dataRaw.data;
    info.title = dataRaw.title;
    if (dataRaw.tableData) {
      convertTableRenderData(dataRaw.tableData, info);
      for (const column of info.columns) {
        if (["suanliaocad"].includes(column.field)) {
          column.type = "cad";
          column.hidden = this.noCad();
          if (column.type === "cad") {
            column.filterFn = (event) => !!event.item.shicadjiegouliao;
          }
        }
      }
      // this.info.columns[0].sticky = true;
      info.columns.splice(1, 0, {
        type: "button",
        field: "children",
        name: "操作",
        buttons: [{event: "add", title: "添加", class: "primary"}],
        width: "80px"
      });
    }
    this.info.set(info);
    await timeout(0);
    const treeControl = this.tableComponent()?.treeControl;
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
    const info = this.info();
    const columns = info.columns.filter((v) => v.required && !keys.includes(v.field));
    const values = await this.message.form(getInputInfosFromTableColumns(columns));
    const item = this.dataRaw?.data[0];
    if (values) {
      for (const key of keys) {
        (values as any)[key] = fromItem[key];
      }
      const data: TableInsertParams<DingdanBomData> = {
        table: this.table,
        data: values
      };
      await this.http.tableInsert(data);
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
    const info = this.info();
    const columnsBefore = cloneDeep(info.columns);
    this.info.update((v) => ({
      ...v,
      columns: info.columns.map((col) => {
        col.hidden = !columnNames.includes(col.name || col.field);
        return col;
      })
    }));
    return columnsBefore;
  }

  private _restoreColumns(columnsBefore: ReturnType<BomGongyiluxianComponent["_setColumns"]>) {
    this.info.update((v) => ({...v, columns: columnsBefore}));
  }

  async print() {
    const columnsBefore = this._setColumns();
    await timeout(0);
    this.tableComponent()?.treeControl.expandAll();
    await timeout(0);
    window.print();
    this._restoreColumns(columnsBefore);
  }

  async exportExcel() {
    const columnsBefore = this._setColumns();
    this.tableComponent()?.exportExcel();
    this._restoreColumns(columnsBefore);
  }
}
