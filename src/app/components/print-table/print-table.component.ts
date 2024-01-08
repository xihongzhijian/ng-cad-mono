import {CommonModule} from "@angular/common";
import {Component, HostBinding, OnInit} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {ActivatedRoute} from "@angular/router";
import {timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {ColumnInfo, RowButtonEvent, TableRenderInfo} from "@modules/table/components/table/table.types";
import csstype from "csstype";
import {TableData, TableInfoData, XikongData, XikongDataRaw} from "./print-table.types";

@Component({
  selector: "app-print-table",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, TableComponent],
  templateUrl: "./print-table.component.html",
  styleUrl: "./print-table.component.scss"
})
export class PrintTableComponent implements OnInit {
  @HostBinding("class.ng-page") isPage = true;
  title = "";
  tableInfos: TableRenderInfo<TableData>[] = [];
  xikongTableInfo: TableRenderInfo<XikongData> | null = null;
  xikongTableWidth = 0;

  constructor(
    private http: CadDataService,
    private route: ActivatedRoute,
    private message: MessageService
  ) {}

  async ngOnInit() {
    await this.getData();
  }

  async print() {
    const columnsAll: ColumnInfo<TableData>[][] = [];
    for (const info of this.tableInfos) {
      columnsAll.push(info.columns);
      info.columns = info.columns.map((col) => {
        if (col.type === "button") {
          return {...col, hidden: true};
        } else {
          return {...col};
        }
      });
    }
    await timeout(1000);
    window.print();
    for (let i = 0; i < this.tableInfos.length; i++) {
      this.tableInfos[i].columns = columnsAll[i];
    }
  }

  async getData() {
    const {action} = this.route.snapshot.queryParams;
    if (!action) {
      this.message.error("缺少参数: action");
      return;
    }
    const data = await this.http.getData<TableInfoData>(action);
    if (!data) {
      return;
    }
    this.title = data.标题;
    document.title = data.标题;
    this.tableInfos = [];
    for (const [i, value] of data.表头.entries()) {
      const 表头列: ColumnInfo<TableData>[] = [];
      let 表头列i = 0;
      const headerStyle: csstype.Properties = {};
      if (i < data.表头.length - 1) {
        headerStyle.borderBottom = "none";
      }
      for (const value2 of value) {
        if (!value2.value) {
          value2.value = Array(++表头列i).fill(" ").join("");
        }
        表头列.push({
          type: "string",
          field: value2.label,
          name: value2.label,
          style: {...headerStyle, flex: `1 1 ${value2.width[1]}`}
        });
        表头列.push({
          type: "string",
          field: value2.value,
          name: value2.value,
          style: {...headerStyle, flex: `1 1 calc(${value2.width[0]} - ${value2.width[1]})`}
        });
      }
      this.tableInfos.push({
        noCheckBox: true,
        noScroll: true,
        columns: 表头列,
        data: []
      });
    }
    for (const info of data.表数据) {
      this.tableInfos.push({noCheckBox: true, noScroll: true, ...info});
    }
    console.log(this.tableInfos);
  }

  onRowButtonClick(tableInfo: TableRenderInfo<TableData>, event: RowButtonEvent<TableData>) {
    const {button, column, item, rowIdx} = event;
    if (button.event === "查看铣孔信息") {
      this.xikongTableInfo = null;
      if (tableInfo.activeRows?.includes(rowIdx)) {
        tableInfo.activeRows = [];
        return;
      }
      let xikongData: XikongDataRaw[] | null = null;
      try {
        xikongData = JSON.parse(item[column.field]);
      } catch (e) {
        const content = `${column.field}=${JSON.stringify(item[column.field])}`;
        this.message.error({title: "数据格式错误", content});
      }
      if (!xikongData) {
        return;
      }
      const xikongColWidths: Record<keyof XikongData, number> = {
        序号: 30,
        加工面: 60,
        加工孔名字: 150,
        X: 60,
        Y: 60,
        Z: 60
      };
      this.xikongTableWidth = 10 + Object.values(xikongColWidths).reduce((a, b) => a + b, 0);
      this.xikongTableInfo = {
        noCheckBox: true,
        columns: [
          {type: "number", field: "序号", width: `${xikongColWidths.序号}px`},
          {type: "string", field: "加工面", width: `${xikongColWidths.加工面}px`},
          {type: "string", field: "加工孔名字", width: `${xikongColWidths.加工孔名字}px`},
          {type: "string", field: "X", width: `${xikongColWidths.X}px`},
          {type: "string", field: "Y", width: `${xikongColWidths.Y}px`},
          {type: "string", field: "Z", width: `${xikongColWidths.Z}px`}
        ],
        data: xikongData.map((value, index) => {
          return {序号: index + 1, ...value};
        })
      };
      tableInfo.activeRows = [rowIdx];
    }
  }
}
