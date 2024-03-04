import {CommonModule} from "@angular/common";
import {Component, HostBinding, OnInit} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {ActivatedRoute} from "@angular/router";
import {ObjectOf, timeout} from "@lucilor/utils";
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
  @HostBinding("class") class = ["ng-page"];

  title = "";
  tableInfos: TableRenderInfo<TableData>[] = [];
  xikongTableInfo: TableRenderInfo<XikongData> | null = null;
  xikongTableWidth = 0;
  xikongColWidths: ObjectOf<number> = {};

  constructor(
    private http: CadDataService,
    private route: ActivatedRoute,
    private message: MessageService
  ) {}

  async ngOnInit() {
    await this.getData();
  }

  async print() {
    const {tableInfos} = this;
    const columnsAll: ColumnInfo<TableData>[][] = [];
    const dataAll: (TableData[] | null)[] = [];
    const tableBreakIndex1 = 21;
    for (const info of tableInfos) {
      columnsAll.push(info.columns);
      info.columns = info.columns.map((col) => {
        if (col.type === "button") {
          return {...col, hidden: true};
        } else {
          return {...col};
        }
      });
      if (info.title === "型材" && info.data.length > tableBreakIndex1) {
        dataAll.push(info.data);
        const data = [...info.data];
        data.splice(tableBreakIndex1, 0, {});
        info.data = data;
      } else {
        dataAll.push(null);
      }
    }
    await timeout(1000);
    window.print();
    for (let i = 0; i < tableInfos.length; i++) {
      tableInfos[i].columns = columnsAll[i];
      const data = dataAll[i];
      if (data) {
        tableInfos[i].data = data;
      }
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
      info.class = info.title;
      this.tableInfos.push({noCheckBox: true, noScroll: true, ...info});
    }
    this.xikongColWidths = data.铣孔信息列宽;
  }

  async onRowButtonClick(tableInfo: TableRenderInfo<TableData>, event: RowButtonEvent<TableData>) {
    const {button, item, rowIdx} = event;
    switch (button.event) {
      case "查看铣孔信息":
        {
          this.xikongTableInfo = null;
          if (tableInfo.activeRows?.includes(rowIdx)) {
            tableInfo.activeRows = [];
            return;
          }
          let xikongData: XikongDataRaw[] | null = null;
          const field = "铣孔";
          try {
            xikongData = JSON.parse(item[field]);
          } catch (e) {
            const content = `${field}=${JSON.stringify(item[field])}`;
            this.message.error({title: "数据格式错误", content});
          }
          if (!xikongData) {
            return;
          }
          const xikongColWidths = this.xikongColWidths;
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
        break;
      case "查看型材信息":
        {
          const url = await this.http.getShortUrl("铝型材CNC加工", {search2: {where: {vid: item.vid}}});
          if (url) {
            window.open(url);
          }
        }
        break;
    }
  }
}
