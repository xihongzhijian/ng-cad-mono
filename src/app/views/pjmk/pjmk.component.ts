import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianOutput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {exportZixuanpeijian, importZixuanpeijian} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";

@Component({
  selector: "app-pjmk",
  templateUrl: "./pjmk.component.html",
  styleUrls: ["./pjmk.component.scss"],
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PjmkComponent implements OnInit {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);

  table = "";
  tableName = "";
  id = "";
  name = signal("");
  data: ZixuanpeijianOutput = importZixuanpeijian();

  async ngOnInit() {
    setGlobal("pjmk", this);
    await this.fetch();
    this.openDialog();
  }

  async fetch() {
    const {table, id} = this.route.snapshot.queryParams;
    if (id) {
      this.id = id;
    } else {
      this.message.error("缺少参数: id");
      return;
    }
    if (table) {
      this.table = table;
    } else {
      this.message.error("缺少参数: table");
      return;
    }
    const records = await this.http.queryMySql<{peijianmokuai: string} & TableDataBase>({
      table,
      filter: {where: {vid: id}},
      fields: ["mingzi", "peijianmokuai"]
    });
    if (records.length > 0) {
      this.name.set(records[0].mingzi || "");
      try {
        this.data = importZixuanpeijian(JSON.parse(records[0].peijianmokuai));
      } catch {}
    }
    const struct = await this.http.getXiaodaohangStructure(table);
    this.tableName = struct?.mingzi || "";
    document.title = `${this.tableName}配件模块 - ${this.name}`;
  }

  async openDialog() {
    const result = await openZixuanpeijianDialog(this.dialog, {
      data: {step: 1, stepFixed: true, checkEmpty: true, data: this.data, 可替换模块: true}
    });
    if (result) {
      this.data = result;
      await this.submit();
    }
  }

  async editTestData() {
    const result = await this.message.json(this.data.测试数据);
    if (result) {
      this.data.测试数据 = result;
      await this.submit();
    }
  }

  async submit() {
    const {table, id, data} = this;
    await this.http.post<void>("ngcad/setTableZixuanpeijian", {table, id, data: exportZixuanpeijian(data)});
  }
}
