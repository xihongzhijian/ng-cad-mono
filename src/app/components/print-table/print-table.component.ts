import {CommonModule} from "@angular/common";
import {Component, HostBinding, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {ColumnInfo, TableRenderInfo} from "@modules/table/components/table/table.types";
import {TableData, TableInfoData} from "./print-table.types";

@Component({
  selector: "app-print-table",
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: "./print-table.component.html",
  styleUrl: "./print-table.component.scss"
})
export class PrintTableComponent implements OnInit {
  @HostBinding("class.ng-page") isPage = true;
  title = "";
  tableInfos: TableRenderInfo<TableData>[] = [];

  constructor(
    private http: CadDataService,
    private route: ActivatedRoute,
    private message: MessageService
  ) {}

  async ngOnInit() {
    await this.getData();
  }

  async getData() {
    const {action} = this.route.snapshot.queryParams;
    if (!action) {
      this.message.error("缺少参数: action");
      return;
    }
    const data = this.http.getData<TableInfoData>(await this.http.post(action));
    if (!data) {
      return;
    }
    console.log(data);
    this.title = data.标题;
    this.tableInfos = [];
    for (const value of data.表头) {
      const 表头列: ColumnInfo<TableData>[] = [];
      let 表头列i = 0;
      for (const value2 of value) {
        if (!value2.value) {
          value2.value = Array(++表头列i).fill(" ").join("");
        }
        表头列.push({
          type: "string",
          field: value2.label,
          name: value2.label,
          style: {flex: `1 1 ${value2.width[1]}`}
        });
        表头列.push({
          type: "string",
          field: value2.value,
          name: value2.value,
          style: {flex: `1 1 calc(${value2.width[0]} - ${value2.width[1]})`}
        });
      }
      this.tableInfos.push({
        noCheckBox: true,
        noScroll: true,
        columns: 表头列,
        data: []
      });
    }
    for (const key in data.表数据) {
      const value = data.表数据[key];
      const widths = data.列宽[key];
      this.tableInfos.push({
        title: key,
        noCheckBox: true,
        noScroll: true,
        columns: value[0].map((v) => {
          let info: ColumnInfo<TableData>;
          if (v === "型材图") {
            info = {type: "image", field: v, name: v, style: {flex: `1 1 ${widths[v]}px`}};
          } else {
            info = {type: "string", field: v, name: v, style: {flex: `1 1 ${widths[v]}px`}};
          }
          return info;
        }),
        data: value.slice(1).map((v) => {
          const obj: TableData = {};
          for (const [i, k] of value[0].entries()) {
            obj[k] = v[i];
          }
          return obj;
        })
        // data: data.表数据[key],
      });
    }
    console.log(this.tableInfos);
  }
}
