import {ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked} from "@angular/core";
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
  templateUrl: "./suanliao-tables.component.html",
  styleUrl: "./suanliao-tables.component.scss",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuanliaoTablesComponent {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  suanliaoDataParams = input.required<SuanliaoDataParams>();

  suanliaoDataParamsEff = effect(() => {
    this.suanliaoDataParams();
    untracked(() => {
      this.update();
    });
  });

  klkwpzCollection: CadCollection = "kailiaokongweipeizhi";
  klkwpzTable = signal<TableRenderInfo<KlkwpzData>>({
    title: "开料孔位配置",
    inlineTitle: true,
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "孔位配置",
        width: "150px",
        buttons: [{event: "界面编辑"}, {event: "JSON编辑", hidden: true}, {event: "删除"}]
      }
    ],
    toolbarButtons: {
      extra: [{event: "编辑"}, {event: "刷新"}]
    }
  });
  async getKlkwpzData(params: SuanliaoDataParams) {
    const info = this.klkwpzTable();
    return await this.http.queryMongodb<KlkwpzData>(
      {
        collection: this.klkwpzCollection,
        where: getSuanliaoDataSearch(params),
        fields: info.columns.map((v) => v.field)
      },
      {spinner: false}
    );
  }
  async updateKlkwpzTable() {
    const data = await this.getKlkwpzData(this.suanliaoDataParams());
    this.klkwpzTable.update((v) => ({...v, data}));
  }

  klcsCollection: CadCollection = "kailiaocanshu";
  klcsTable = signal<TableRenderInfo<KlcsData>>({
    title: "开料参数",
    inlineTitle: true,
    data: [],
    columns: [
      {type: "string", field: "名字"},
      {
        type: "button",
        field: "参数",
        width: "150px",
        buttons: [{event: "界面编辑"}, {event: "JSON编辑", hidden: true}, {event: "删除"}]
      }
    ],
    toolbarButtons: {
      extra: [{event: "编辑"}, {event: "刷新"}]
    }
  });
  async getKlcsData(params: SuanliaoDataParams) {
    const info = this.klcsTable();
    return await this.http.queryMongodb<KlcsData>(
      {
        collection: this.klcsCollection,
        where: getSuanliaoDataSearch(params),
        fields: info.columns.map((v) => v.field)
      },
      {spinner: false}
    );
  }
  async updateKlcsTable() {
    const data = await this.getKlcsData(this.suanliaoDataParams());
    this.klcsTable.update((v) => ({...v, data}));
  }

  update() {
    return Promise.all([this.updateKlkwpzTable(), this.updateKlcsTable()]);
  }

  async onKlkwpzToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "编辑":
        {
          const params = this.suanliaoDataParams();
          const search2 = getSuanliaoDataSearch(params);
          const url = await this.http.getShortUrl("开料孔位配置", {search2, extraData: params});
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
          const params = this.suanliaoDataParams();
          const search2 = getSuanliaoDataSearch(params);
          const url = await this.http.getShortUrl("开料参数", {search2, extraData: params});
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
