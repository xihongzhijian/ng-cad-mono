import {Component, effect, ElementRef, HostBinding, inject, input, OnInit, signal, untracked, viewChildren} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {getValueString} from "@app/utils/get-value";
import {ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {ColumnInfo, RowButtonEvent, TableRenderInfo} from "@modules/table/components/table/table.types";
import {uniqueId} from "lodash";
import {toDataURL} from "qrcode";
import {
  LvxingcaiyouhuaInfo,
  TableData,
  TableInfoData,
  TableInfoDataSideTable,
  TableInfoDataTable,
  XikongData,
  XikongDataRaw,
  型材信息
} from "./print-table.types";

@Component({
  selector: "app-print-table",
  imports: [ImageComponent, MatButtonModule, MatDividerModule, TableComponent],
  templateUrl: "./print-table.component.html",
  styleUrl: "./print-table.component.scss"
})
export class PrintTableComponent<T = any> implements OnInit {
  private elRef = inject<ElementRef<HTMLElement>>(ElementRef);
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
    const toRemove: HTMLElement[] = [];
    const toResetDisplay: HTMLElement[] = [];
    const toResetBorderRight: HTMLElement[] = [];
    const toRemovePageBreak: HTMLElement[] = [];
    const tableEls = this.elRef.nativeElement.querySelectorAll(".table-container app-table");
    for (const [i, info] of tableInfos.entries()) {
      const title = info.title;
      if (!title) {
        continue;
      }
      const tableEl = tableEls[i];
      if (!(tableEl instanceof HTMLElement)) {
        continue;
      }
      let indexs = 表换行索引[title];
      if (!indexs && info.换行索引) {
        indexs = 表换行索引[info.换行索引];
      }
      const buttonColIndexs = new Set<number>();
      for (const [j, col] of info.columns.entries()) {
        if (col.type === "button") {
          buttonColIndexs.add(j);
        }
      }

      const headerRowEls = tableEl.querySelectorAll("mat-header-row");
      const rowEls = tableEl.querySelectorAll("mat-row");
      const updateCells = (rowElList: NodeListOf<Element>, selector: string) => {
        rowElList.forEach((rowEl) => {
          const cells = rowEl.querySelectorAll(selector);
          cells.forEach((cell, k) => {
            if (cell instanceof HTMLElement) {
              if (buttonColIndexs.has(k)) {
                toResetDisplay.push(cell);
                cell.style.display = "none";
                if (k === info.columns.length - 1 && k > 0) {
                  const prevCellContent = cells.item(k - 1).querySelector(".cell-content");
                  if (prevCellContent instanceof HTMLElement) {
                    toResetBorderRight.push(prevCellContent);
                    prevCellContent.style.borderRight = "var(--border)";
                  }
                }
              }
            }
          });
        });
      };
      updateCells(headerRowEls, "mat-header-cell");
      updateCells(rowEls, "mat-cell");
      const rowCount = rowEls.length;
      if (Array.isArray(indexs) && indexs.length > 0) {
        for (const j of indexs) {
          if (j > rowCount) {
            break;
          }
          const rowEl = rowEls.item(j - 1);
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
    await timeout(0);
    window.print();
    for (const el of toRemove) {
      el.remove();
    }
    for (const el of toResetDisplay) {
      el.style.display = "";
    }
    for (const el of toResetBorderRight) {
      el.style.borderRight = "";
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
    const addSideTable = (
      type: "header" | "footer",
      sideTable: TableInfoDataSideTable | undefined,
      labelWidth?: string,
      noBorder = false
    ) => {
      if (!Array.isArray(sideTable) || sideTable.length < 1) {
        return;
      }
      for (const [i, value] of sideTable.entries()) {
        const cols: ColumnInfo<TableData>[] = [];
        let colIdx = 0;
        const headerCls: string[] = [];
        if (i < sideTable.length - 1) {
          headerCls.push("no-border-bottom");
        }
        const style: TableInfoDataTable["style"] = {};
        if (type === "footer" && i === 0) {
          style.marginTop = "10px";
        }
        for (const value2 of value) {
          if (!value2.value) {
            value2.value = Array(++colIdx).fill(" ").join("");
          }
          const value3 = getValueString(value2.value);
          let labelFlex = "1 1 0";
          let valueFlex = "1 1 0";
          if (Array.isArray(value2.width)) {
            labelFlex = `0 0 ${value2.width[1]}`;
            valueFlex = `0 0 calc(${value2.width[0]} - ${value2.width[1]})`;
          } else {
            if (labelWidth && value2.width) {
              labelFlex = `0 0 ${labelWidth}`;
              valueFlex = `0 0 calc(${value2.width} - ${labelWidth})`;
            } else if (value2.width) {
              labelFlex = `0 0 calc(${value2.width} / 2)`;
              valueFlex = `0 0 calc(${value2.width} / 2)`;
            } else if (labelWidth) {
              labelFlex = `0 0 ${labelWidth}`;
            }
          }
          let labelName = value2.label;
          if (noBorder && labelName) {
            labelName += "：";
          }
          cols.push({
            type: "string",
            field: uniqueId(),
            name: labelName,
            class: headerCls,
            style: {flex: labelFlex},
            align: noBorder ? "right" : "center"
          });
          cols.push({
            type: "string",
            field: uniqueId(),
            name: value3,
            class: headerCls,
            style: {flex: valueFlex},
            align: noBorder ? "left" : "center"
          });
        }
        tableInfos.push({type, noScroll: true, columns: cols, data: [], noBorder, style});
      }
    };
    addSideTable("header", data.表头, data.表头标题宽度);
    for (const info of data.表数据) {
      info.class = info.title;
      info.compactColumnButton = true;
      const sumCols: {i: number}[] = [];
      for (const [i, col] of info.columns.entries()) {
        if (col.type === "image") {
          col.noLazy = true;
        }
        if (col.sum) {
          sumCols.push({i});
        }
      }
      if (sumCols.length > 0) {
        const item: TableData = {};
        for (const {i} of sumCols) {
          const col = info.columns[i];
          const colPrev = info.columns[i - 1];
          let sum = 0;
          for (const item2 of info.data) {
            const n = Number(item2[col.field]);
            if (isNaN(n)) {
              item2[col.field] = 0;
            } else {
              sum += n;
            }
          }
          item[colPrev.field] = `${col.name || col.field}汇总`;
          item[col.field] = `${sum}`;
        }
        info.data.push(item);
      }
      tableInfos.push({type: "main", noScroll: true, ...info, titleStyle: {display: "none"}, hasSum: sumCols.length > 0});
    }
    addSideTable("footer", data.表尾, data.表尾标题宽度, data.表尾无边框);
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
