import {CdkDragDrop, CdkDropListGroup, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, Component, ViewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {GenerateRectsOpts, MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {NgScrollbar} from "ngx-scrollbar";
import {InputComponent} from "../../modules/input/components/input.component";
import {MsbjData, MsbjFenlei, MsbjInfo} from "./msbj.types";

@Component({
  selector: "app-msbj",
  templateUrl: "./msbj.component.html",
  styleUrls: ["./msbj.component.scss"],
  standalone: true,
  imports: [CadImageComponent, CdkDropListGroup, InputComponent, MatButtonModule, MsbjRectsComponent, NgScrollbar]
})
export class MsbjComponent implements AfterViewInit {
  production = environment.production;
  table = "";
  id = "";
  msbjInfo: MsbjInfo | null = null;
  dataField: keyof Omit<MsbjData, keyof TableDataBase> = "peizhishuju";
  fenleiListDataType!: {$implicit: MsbjFenlei[]; class: string};
  nameInputInfo: InputInfo = {
    type: "string",
    label: "名字",
    readonly: true
  };
  cads: {data: CadData}[] = [];
  @ViewChild(MsbjRectsComponent) msbjRects?: MsbjRectsComponent;

  constructor(
    private route: ActivatedRoute,
    private http: CadDataService,
    private message: MessageService,
    private status: AppStatusService
  ) {
    setGlobal("msbj", this);
  }

  async ngAfterViewInit() {
    const {table, id, field} = this.route.snapshot.queryParams;
    this.table = table || "";
    this.id = id || "";
    this.dataField = field === "peizhishuju" ? field : "menshanbujumorenfenlei";
    const msbjData = await this.http.queryMySql<MsbjData>({table, filter: {where: {vid: this.id}}});
    if (msbjData[0]) {
      this.msbjInfo = new MsbjInfo(msbjData[0]);
      const getCadResult = await this.http.getCad({collection: "cad", search: {"选项.门扇布局": msbjData[0].mingzi}});
      this.cads = getCadResult.cads.map((data) => {
        const item: MsbjComponent["cads"][number] = {data};
        return item;
      });
    } else {
      this.msbjInfo = null;
    }
  }

  generateRects(opts: GenerateRectsOpts) {
    this.msbjRects?.generateRects(opts);
  }

  setCurrRectInfo(info: MsbjRectInfo | null) {
    const {nameInputInfo} = this;
    if (info?.raw.isBuju) {
      nameInputInfo.model = {data: info, key: "name"};
    } else {
      delete nameInputInfo.model;
    }
  }

  updateCurrRectInfo() {
    const currRectInfo = this.msbjRects?.currRectInfo;
    if (!currRectInfo) {
      return;
    }
  }

  dropFenlei(event: CdkDragDrop<MsbjFenlei[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.updateCurrRectInfo();
  }

  async submit() {
    const {msbjInfo, table} = this;
    if (!msbjInfo) {
      return;
    }
    const data: TableUpdateParams<MsbjData>["data"] = {vid: msbjInfo.vid};
    const rectInfos = this.msbjRects?.rectInfosRelative.map((v) => v.raw);
    msbjInfo.peizhishuju.模块节点 = rectInfos || [];
    data[this.dataField] = JSON.stringify(msbjInfo.peizhishuju);
    await this.http.tableUpdate({table, data});
  }

  async editMokuaidaxiao() {
    const info = this.msbjInfo;
    if (!info) {
      return;
    }
    const result = await this.message.json(info.peizhishuju.模块大小关系);
    if (result) {
      info.peizhishuju.模块大小关系 = result;
    }
  }

  openCad(data: CadData) {
    this.status.openCadInNewTab(data.id, "cad");
  }
}
