import {Component, Input, OnChanges, OnInit, SimpleChanges} from "@angular/core";
import {CadCollection} from "@app/cad/collections";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {SuanliaoDataParams} from "../xinghao-data";
import {KlcsData, KlkwpzData} from "./suanliao-tables.types";
import {getSuanliaoDataSearch} from "./suanliao-tables.utils";

@Component({
  selector: "app-suanliao-tables",
  standalone: true,
  imports: [TableComponent],
  templateUrl: "./suanliao-tables.component.html",
  styleUrl: "./suanliao-tables.component.scss"
})
export class SuanliaoTablesComponent implements OnInit, OnChanges {
  @Input({required: true}) suanliaoDataParams!: SuanliaoDataParams;
  klkwpzCollection: CadCollection = "kailiaokongweipeizhi";
  klcsCollection: CadCollection = "kailiaocanshu";
  klkwpzTable: TableRenderInfo<KlkwpzData> = {
    title: "开料孔位配置",
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "孔位配置",
        width: "150px",
        buttons: [
          {event: "界面编辑", color: "primary"},
          {event: "JSON编辑", color: "primary", hidden: true},
          {event: "删除", color: "primary"}
        ]
      }
    ],
    noCheckBox: true,
    toolbarButtons: {
      extra: [
        {event: "编辑", color: "primary"},
        {event: "刷新", color: "primary"}
      ],
      inlineTitle: true
    }
  };
  klcsTable: TableRenderInfo<KlcsData> = {
    title: "开料参数",
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "参数",
        width: "150px",
        buttons: [
          {event: "界面编辑", color: "primary"},
          {event: "JSON编辑", color: "primary", hidden: true},
          {event: "删除", color: "primary"}
        ]
      }
    ],
    noCheckBox: true,
    toolbarButtons: {
      extra: [
        {event: "编辑", color: "primary"},
        {event: "刷新", color: "primary"}
      ],
      inlineTitle: true
    }
  };

  private _isInited = false;

  constructor(
    private http: CadDataService,
    private message: MessageService,
    private status: AppStatusService
  ) {}

  ngOnInit() {
    if (!this._isInited) {
      this._isInited = true;
      this.update();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.suanliaoDataParams) {
      this._isInited = true;
      this.update();
    }
  }

  async update() {
    await Promise.all([this.updateKlkwpzTable(), this.updateKlcsTable()]);
  }

  async getKlkwpzData(suanliaoDataParams: SuanliaoDataParams) {
    return await this.http.queryMongodb<KlkwpzData>(
      {
        collection: this.klkwpzCollection,
        where: getSuanliaoDataSearch(suanliaoDataParams),
        fields: this.klkwpzTable.columns.map((v) => v.field)
      },
      {spinner: false}
    );
  }

  async updateKlkwpzTable() {
    this.klkwpzTable.data = await this.getKlkwpzData(this.suanliaoDataParams);
  }

  async getKlcsTableData(suanliaoDataParams: SuanliaoDataParams) {
    return await this.http.queryMongodb<KlcsData>(
      {
        collection: this.klcsCollection,
        where: getSuanliaoDataSearch(suanliaoDataParams),
        fields: this.klcsTable.columns.map((v) => v.field)
      },
      {spinner: false}
    );
  }

  async updateKlcsTable() {
    this.klcsTable.data = await this.getKlcsTableData(this.suanliaoDataParams);
  }

  async onKlkwpzToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "编辑":
        {
          const {suanliaoDataParams} = this;
          const search2 = getSuanliaoDataSearch(suanliaoDataParams);
          const url = await this.http.getShortUrl("开料孔位配置", {search2, extraData: suanliaoDataParams});
          if (url) {
            window.open(url);
            if (await this.message.newTabConfirm()) {
              this.updateKlkwpzTable();
            }
          }
        }
        break;
      case "刷新":
        this.updateKlkwpzTable();
        break;
    }
  }

  async onKlcsToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "编辑":
        {
          const {suanliaoDataParams} = this;
          const search2 = getSuanliaoDataSearch(suanliaoDataParams);
          const url = await this.http.getShortUrl("开料参数", {search2, extraData: suanliaoDataParams});
          if (url) {
            window.open(url);
            if (await this.message.newTabConfirm()) {
              this.updateKlcsTable();
            }
          }
        }
        break;
      case "刷新":
        this.updateKlcsTable();
        break;
    }
  }

  async onKlkwpzRow(event: RowButtonEvent<any>) {
    const {item, column} = event;
    switch (event.button.event) {
      case "界面编辑":
        this.status.openInNewTab([this.klkwpzCollection], {queryParams: {id: item._id}});
        break;
      case "JSON编辑":
        {
          const json = item[column.field];
          const result = await this.message.json(json);
          if (result) {
            const response = await this.http.mongodbUpdate(this.klkwpzCollection, {_id: item._id}, {[column.field]: result});
            if (response) {
              this.updateKlkwpzTable();
            }
          }
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          const response = await this.http.mongodbDelete(this.klkwpzCollection, {id: item._id});
          if (response) {
            this.updateKlkwpzTable();
          }
        }
        break;
    }
  }

  async onKlcsRow(event: RowButtonEvent<any>) {
    const {item, column} = event;
    switch (event.button.event) {
      case "界面编辑":
        this.status.openInNewTab([this.klcsCollection], {queryParams: {id: item._id}});
        break;
      case "JSON编辑":
        {
          const json = item[column.field];
          const result = await this.message.json(json);
          if (result) {
            const response = await this.http.mongodbUpdate(this.klcsCollection, {_id: item._id}, {[column.field]: result});
            if (response) {
              this.updateKlcsTable();
            }
          }
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          const response = await this.http.mongodbDelete(this.klcsCollection, {id: item._id});
          if (response) {
            this.updateKlcsTable();
          }
        }
        break;
    }
  }
}
