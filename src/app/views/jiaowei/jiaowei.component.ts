import {KeyValuePipe} from "@angular/common";
import {Component, OnInit} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbar} from "ngx-scrollbar";
import {Jiaowei, jiaoweiAnchorOptions, JiaoweiTableData} from "./jiaowei";

const table = "p_menjiao" as const;

@Component({
  selector: "app-jiaowei",
  templateUrl: "./jiaowei.component.html",
  styleUrls: ["./jiaowei.component.scss"],
  standalone: true,
  imports: [
    MatButtonModule,
    NgScrollbar,
    MatCheckboxModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    KeyValuePipe
  ]
})
export class JiaoweiComponent implements OnInit {
  jiaowei = new Jiaowei();
  jiaoweiAnchorOptions = jiaoweiAnchorOptions;

  constructor(
    private http: CadDataService,
    private router: ActivatedRoute,
    private message: MessageService
  ) {}

  async ngOnInit() {
    setGlobal("jiaowei", this);
    const {id} = this.router.snapshot.queryParams;
    const data = await this.http.queryMySql<JiaoweiTableData>({table, filter: {where: {vid: id}}});
    try {
      this.jiaowei.import(JSON.parse(data[0].jiaowei || ""));
    } catch (error) {
      console.error(error);
      this.message.error("数据格式错误");
    }
    for (const num of ["2", "3", "4", "5"]) {
      if (!this.jiaowei.data[num]) {
        this.jiaowei.addItem({条件: [`门铰数量==${num}`]});
      }
    }
  }

  submit() {
    const {id} = this.router.snapshot.queryParams;
    const data: TableUpdateParams<JiaoweiTableData>["data"] = {vid: id};
    data.jiaowei = JSON.stringify(this.jiaowei.export());
    this.http.tableUpdate({table, data});
  }
}
