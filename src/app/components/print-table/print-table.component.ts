import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  OnInit,
  signal,
  untracked,
  viewChildren
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {ActivatedRoute} from "@angular/router";
import {getValueString, setGlobal} from "@app/app.common";
import {environment} from "@env";
import {ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {ColumnInfo, RowButtonEvent, TableRenderInfo} from "@modules/table/components/table/table.types";
import {Properties} from "csstype";
import {toDataURL} from "qrcode";
import {LvxingcaiyouhuaInfo, TableData, TableInfoData, TableInfoDataTable, XikongData, XikongDataRaw, 型材信息} from "./print-table.types";

@Component({
  selector: "app-print-table",
  imports: [ImageComponent, MatButtonModule, MatDividerModule, TableComponent],
  templateUrl: "./print-table.component.html",
  styleUrl: "./print-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintTableComponent<T = any> implements OnInit {
  private elRef = inject(ElementRef<HTMLElement>);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);

  @HostBinding("class") class = ["ng-page"];

  lvxingcaiyouhuaInfo = input<LvxingcaiyouhuaInfo | null>(null);
  lvxingcaiyouhuaInfoEff = effect(() => {
    this.lvxingcaiyouhuaInfo();
    untracked(() => this.getData());
  });

  async ngOnInit() {
    setGlobal("printTable", this);
  }

  export() {
    const {小导航, vid} = this.data() || {};
    window.open(this.http.getUrl("order/lvxingcai/exportBOM", {小导航, vid}));
  }

  async print() {
    const tableInfos = this.tableInfos();
    const {表换行索引 = {}} = this.data() || {};
    const columnsAll: ColumnInfo<TableData>[][] = [];
    for (const info of this.tableInfos()) {
      columnsAll.push(info.columns);
      info.columns = info.columns.map((col) => {
        if (col.type === "button") {
          return {...col, hidden: true};
        } else {
          return {...col};
        }
      });
    }
    this.tableInfos.set([...tableInfos]);
    await timeout(1000);
    const toRemove: HTMLElement[] = [];
    const toRemovePageBreak: HTMLElement[] = [];
    for (const info of tableInfos) {
      const title = info.title;
      if (!title) {
        continue;
      }
      const tableEl = this.elRef.nativeElement.querySelector(`app-table.${title}`);
      if (!(tableEl instanceof HTMLElement)) {
        continue;
      }
      let indexs = 表换行索引[title];
      if (!indexs && info.换行索引) {
        indexs = 表换行索引[info.换行索引];
      }
      const rowEls = tableEl.querySelectorAll(`app-table.${title} mat-row`);
      const rowCount = rowEls.length;
      if (Array.isArray(indexs) && indexs.length > 0) {
        for (const i of indexs) {
          if (i > rowCount) {
            break;
          }
          const rowEl = rowEls.item(i - 1);
          if (rowEl instanceof HTMLElement) {
            const dummyRowEl = document.createElement("div");
            rowEl.after(dummyRowEl);
            dummyRowEl.classList.add("page-break");
            toRemove.push(dummyRowEl);
            tableEl.classList.add("page-break");
            toRemovePageBreak.push(tableEl);
          }
        }
      }
    }
    window.print();
    for (let i = 0; i < tableInfos.length; i++) {
      tableInfos[i].columns = columnsAll[i];
    }
    this.tableInfos.set([...tableInfos]);
    for (const el of toRemove) {
      el.remove();
    }
    for (const el of toRemovePageBreak) {
      el.classList.remove("page-break");
    }
  }

  tables = viewChildren("tables", {read: TableComponent<T>});

  title = signal("");
  titleEff = effect(() => {
    if (!this.lvxingcaiyouhuaInfo()) {
      document.title = this.title();
    }
  });
  tableInfos = signal<TableInfoDataTable[]>([]);
  xikongTableInfo = signal<TableRenderInfo<XikongData> | null>(null);
  xikongTableWidth = signal(0);
  xikongColWidths = signal<ObjectOf<number>>({});
  data = signal<TableInfoData | null>(null);
  qrCodeImg = signal<string | null>(null);
  async getData() {
    const lvxingcaiyouhuaInfo = this.lvxingcaiyouhuaInfo();
    let data: TableInfoData | null;
    if (lvxingcaiyouhuaInfo) {
      data = lvxingcaiyouhuaInfo.tableInfoData;
    } else {
      const {action} = this.route.snapshot.queryParams;
      if (!action) {
        this.message.error("缺少参数: action");
        return;
      }
      data = await this.http.getData<TableInfoData>(action);
    }
    if (!data) {
      return;
    }
    const tableInfos: TableInfoDataTable[] = [];
    for (const [i, value] of data.表头.entries()) {
      const 表头列: ColumnInfo<TableData>[] = [];
      let 表头列i = 0;
      const headerStyle: Properties = {};
      if (i < data.表头.length - 1) {
        headerStyle.borderBottom = "none";
      }
      for (const value2 of value) {
        if (!value2.value) {
          value2.value = Array(++表头列i).fill(" ").join("");
        }
        const value3 = getValueString(value2.value);
        表头列.push({
          type: "string",
          field: value2.label,
          name: value2.label,
          style: {...headerStyle, flex: `1 1 ${value2.width[1]}`}
        });
        表头列.push({
          type: "string",
          field: value3,
          name: value3,
          style: {...headerStyle, flex: `1 1 calc(${value2.width[0]} - ${value2.width[1]})`}
        });
      }
      tableInfos.push({
        isHeader: true,
        noScroll: true,
        columns: 表头列,
        data: []
      });
    }
    for (const info of data.表数据) {
      info.class = info.title;
      if (!environment.production) {
        for (const [i, item] of info.data.entries()) {
          item.序号 = i + 1;
        }
      }
      tableInfos.push({noScroll: true, ...info, titleStyle: {display: "none"}});
    }
    this.title.set(data.标题);
    this.data.set(data);
    this.tableInfos.set(tableInfos);
    this.xikongColWidths.set(data.铣孔信息列宽);

    if (data.二维码) {
      try {
        const img = await toDataURL(data.二维码, {width: 55, margin: 0});
        this.qrCodeImg.set(img);
      } catch (error) {
        console.error(error);
        this.message.error("二维码生成失败");
      }
    } else {
      this.qrCodeImg.set(null);
    }
  }

  async onRowButtonClick(tableInfo: TableRenderInfo<TableData>, event: RowButtonEvent<TableData>) {
    const {button, item, rowIdx} = event;
    switch (button.event) {
      case "查看铣孔信息":
        {
          this.xikongTableInfo.set(null);
          if (tableInfo.activeRows?.includes(rowIdx)) {
            tableInfo.activeRows = [];
            return;
          }
          let xikongData: XikongDataRaw[] | null = null;
          const field = "铣孔";
          try {
            xikongData = JSON.parse(item[field]);
          } catch {
            const content = `${field}=${JSON.stringify(item[field])}`;
            this.message.error({title: "数据格式错误", content});
          }
          if (!xikongData) {
            return;
          }
          const xikongColWidths = this.xikongColWidths();
          this.xikongTableWidth.set(10 + Object.values(xikongColWidths).reduce((a, b) => a + b, 0));
          this.xikongTableInfo.set({
            filterable: {fields: ["加工孔名字"]},
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
          });
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

  getLlyqStr(item: 型材信息["领料要求"][number]) {
    let str: string;
    if (item.型材类型 === "标准型材") {
      str = `标准${item.物料长度}，${item.支数}支`;
    } else {
      str = `余料${item.物料长度}，${item.支数}支`;
      if (item.库存码) {
        str += `，库存码${item.库存码}`;
      }
      if (item.库存位置编码) {
        str += `，${item.库存位置编码}`;
      }
    }
    return str;
  }

  openQrCodeUrl() {
    const {二维码} = this.data() || {};
    if (二维码) {
      window.open(二维码);
    }
  }
}
