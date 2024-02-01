import {Component, Input, OnInit} from "@angular/core";
import {CadCollection} from "@app/cad/collections";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {AppStatusService} from "@services/app-status.service";
import {SuanliaoDataParams} from "../xinghao-data";

@Component({
  selector: "app-suanliao-tables",
  standalone: true,
  imports: [TableComponent],
  templateUrl: "./suanliao-tables.component.html",
  styleUrl: "./suanliao-tables.component.scss"
})
export class SuanliaoTablesComponent implements OnInit {
  @Input({required: true}) suanliaoDataParams!: SuanliaoDataParams;
  klkwpzCollection: CadCollection = "kailiaokongweipeizhi";
  klcsCollection: CadCollection = "kailiaocanshu";
  klkwpzTable: TableRenderInfo<any> = {
    title: "开料孔位配置",
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "孔位配置",
        buttons: [
          {event: "界面编辑", color: "primary"},
          {event: "JSON编辑", color: "primary"},
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
  klcsTable: TableRenderInfo<any> = {
    title: "开料参数",
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "参数",
        buttons: [
          {event: "界面编辑", color: "primary"},
          {event: "JSON编辑", color: "primary"},
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

  constructor(
    private http: CadDataService,
    private message: MessageService,
    private status: AppStatusService
  ) {}

  ngOnInit(): void {
    this.update();
  }

  async update() {
    await Promise.all([this.updateKlkwpzTable(), this.updateKlcsTable()]);
  }

  async updateKlkwpzTable() {
    this.klkwpzTable.data = await this.http.queryMongodb(
      {
        collection: this.klkwpzCollection,
        where: this.suanliaoDataParams,
        fields: this.klkwpzTable.columns.map((v) => v.field)
      },
      {spinner: false}
    );
  }

  async updateKlcsTable() {
    this.klcsTable.data = await this.http.queryMongodb(
      {
        collection: this.klcsCollection,
        where: this.suanliaoDataParams,
        fields: this.klcsTable.columns.map((v) => v.field)
      },
      {spinner: false}
    );
  }

  async onKlkwpzToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "编辑":
        {
          const {suanliaoDataParams} = this;
          const url = await this.http.getShortUrl("开料孔位配置", {search2: suanliaoDataParams, extraData: suanliaoDataParams});
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
          const url = await this.http.getShortUrl("开料参数", {search2: suanliaoDataParams, extraData: suanliaoDataParams});
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
          const response = await this.http.mongodbDelete(this.klkwpzCollection, item._id);
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
          const response = await this.http.mongodbDelete(this.klcsCollection, item._id);
          if (response) {
            this.updateKlcsTable();
          }
        }
        break;
    }
  }
}
