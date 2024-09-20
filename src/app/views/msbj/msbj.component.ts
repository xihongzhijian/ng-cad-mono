import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  model,
  output,
  signal,
  viewChild
} from "@angular/core";
import {ValidatorFn, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {BjmkStatusService} from "@components/bujumokuai/services/bjmk-status.service";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {MkdxpzEditorComponent} from "@components/mkdxpz-editor/mkdxpz-editor.component";
import {GenerateRectsOpts, MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo, MsbjRectInfoRaw, 模块大小配置} from "@components/msbj-rects/msbj-rects.types";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep, debounce} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {InputComponent} from "../../modules/input/components/input.component";
import {MsbjCloseEvent, MsbjData, MsbjFenlei} from "./msbj.types";
import {getEmpty模块大小配置, MsbjInfo} from "./msbj.utils";

@Component({
  selector: "app-msbj",
  templateUrl: "./msbj.component.html",
  styleUrls: ["./msbj.component.scss"],
  standalone: true,
  imports: [
    CadImageComponent,
    FloatingDialogModule,
    InputComponent,
    MatButtonModule,
    MkdxpzEditorComponent,
    MsbjRectsComponent,
    NgScrollbar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MsbjComponent {
  private bjmkStatus = inject(BjmkStatusService);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  tableIn = input("", {alias: "table"});
  idIn = input(0, {alias: "id"});
  dataFieldIn = input("", {alias: "dataField"});
  msbjInfoModel = model(null as MsbjInfo | null, {alias: "msbjInfo"});
  closable = input(false, {transform: booleanAttribute});
  closeOut = output<MsbjCloseEvent>({alias: "close"});

  production = environment.production;
  table = signal("");
  msbjInfo = signal<MsbjInfo | null>(null);
  dataField = signal<keyof Omit<MsbjData, keyof TableDataBase>>("peizhishuju");
  fenleiListDataType!: {$implicit: MsbjFenlei[]; class: string};
  cads = signal<{data: CadData}[]>([]);
  msbjRects = viewChild(MsbjRectsComponent);

  constructor() {
    setGlobal("msbj", this);
  }

  refreshEff = effect(() => this.refresh(), {allowSignalWrites: true});
  async refresh() {
    let msbjInfo: MsbjInfo | null = null;
    const msbjInfoIn = this.msbjInfoModel();
    if (msbjInfoIn) {
      msbjInfo = msbjInfoIn;
    } else {
      const {table: table0 = "", id: id0 = "", field: field0} = this.route.snapshot.queryParams;
      const id = this.idIn() || Number(id0);
      if (!(id > 0)) {
        return;
      }
      const field = this.dataFieldIn() || field0 || "peizhishuju";
      const table = this.tableIn() || table0 || "p_menshanbuju";
      this.table.set(table);
      this.dataField.set(field === "peizhishuju" ? field : "menshanbujumorenfenlei");
      const msbjData = await this.http.queryMySql<MsbjData>({table, filter: {where: {vid: id}}});
      if (msbjData[0]) {
        msbjInfo = new MsbjInfo(msbjData[0]);
      }
    }
    if (msbjInfo) {
      this.msbjInfo.set(msbjInfo);
      if (msbjInfo.isVersion2024) {
        this.cads.set([]);
      } else {
        const getCadResult = await this.http.getCad({collection: "cad", options: {门扇布局: msbjInfo.name}});
        this.cads.set(getCadResult.cads.map<ReturnType<MsbjComponent["cads"]>[number]>((data) => ({data})));
      }
    } else {
      this.msbjInfo.set(null);
      this.cads.set([]);
    }
  }

  generateRects(opts?: GenerateRectsOpts) {
    this.msbjRects()?.generateRects(opts);
  }

  rectInfos = signal<MsbjRectInfoRaw[]>([]);
  rectInfosEff = effect(
    () => {
      const msbjInfo = this.msbjInfo();
      this.rectInfos.set(msbjInfo?.peizhishuju?.["模块节点"] || []);
    },
    {allowSignalWrites: true}
  );

  activeRectInfo = signal<MsbjRectInfo | null>(null);
  private _generateRectsEnd = 0;
  generateRectsEnd() {
    const msbjInfo = this.msbjInfo();
    if (!msbjInfo) {
      return;
    }
    if (this._generateRectsEnd++ < 1) {
      msbjInfo.justify();
      this.msbjInfo.set(cloneDeep(msbjInfo));
    }
  }
  inputInfos = computed(() => {
    const rectInfo = this.activeRectInfo();
    const isBuju = rectInfo?.raw.isBuju;
    const validators: ValidatorFn[] = [];
    if (rectInfo) {
      if (isBuju) {
        validators.push(Validators.required);
      }
      validators.push((control) => {
        const rects = this.msbjInfo()?.peizhishuju.模块节点 || [];
        const name = control.value;
        for (const rect of rects) {
          if (!rect.isBuju || rect.vid === rectInfo.raw.vid) {
            continue;
          }
          if (name && rect.选项名称 === name) {
            return {选项名称重复: true};
          }
        }
        return null;
      });
    }
    const infos: InputInfo[] = [
      {
        type: "string",
        label: "节点名字",
        readonly: true,
        value: rectInfo?.name || ""
      },
      {
        type: "string",
        label: "节点对应下单选项名称",
        readonly: !rectInfo,
        model: rectInfo ? {data: rectInfo, key: "选项名称"} : undefined,
        onInput: debounce((val: string) => {
          const msbjInfo = this.msbjInfo();
          if (rectInfo && msbjInfo) {
            const rectInfo2 = msbjInfo.peizhishuju.模块节点.find((v) => v.vid === rectInfo.raw.vid);
            if (rectInfo2) {
              rectInfo2.选项名称 = val;
            }
            this.rectInfos.update((v) => [...v]);
          }
        }, 200),
        validators
      }
    ];
    return infos;
  });

  isSubmited = signal(false);
  async submit() {
    const msbjInfo = this.msbjInfo();
    if (!msbjInfo) {
      return;
    }
    const table = this.table();
    const data: TableUpdateParams<MsbjData>["data"] = {vid: msbjInfo.vid};
    const rectInfos =
      this.msbjRects()
        ?.rectInfosRelative()
        .map((v) => v.raw) || [];

    const errors = new Set<string>();
    const namesInfo = new Map<string, {nodeNames: string[]; count: number}>();
    for (const info of rectInfos) {
      if (info.isBuju) {
        if (info.选项名称 && info.name) {
          const nameInfo = namesInfo.get(info.选项名称) || {nodeNames: [], count: 0};
          nameInfo.nodeNames.push(info.name);
          nameInfo.count++;
          namesInfo.set(info.选项名称, nameInfo);
        } else {
          errors.add(`模块【${info.name}】选项名称不能为空`);
        }
      }
    }
    for (const [name, nameInfo] of namesInfo) {
      if (nameInfo.count > 1) {
        errors.add(`模块【${nameInfo.nodeNames.join(", ")}】的选项名称【${name}】重复`);
      }
    }
    if (errors.size > 0) {
      await this.message.error([...errors].join("<br>"));
      return;
    }

    msbjInfo.peizhishuju.模块节点 = rectInfos;
    data[this.dataField()] = JSON.stringify(msbjInfo.peizhishuju);
    this.msbjInfo.set(cloneDeep(msbjInfo));
    await this.http.tableUpdate({table, data});
    this.isSubmited.set(true);
  }

  async editMokuaidaxiao() {
    const info = this.msbjInfo();
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

  async close(submit = false) {
    if (submit) {
      await this.submit();
    }
    if (!this.closable()) {
      return;
    }
    this.closeOut.emit({isSubmited: this.isSubmited()});
  }

  mkdxpz = signal<模块大小配置>(getEmpty模块大小配置());
  varNameItem = computed(() => this.bjmkStatus.varNames().at(0) || {});
  mkdxpzEff = effect(
    () => {
      let mkdxpz = this.msbjInfo()?.peizhishuju.模块大小配置;
      if (!mkdxpz) {
        mkdxpz = getEmpty模块大小配置();
      }
      this.mkdxpz.set(mkdxpz);
    },
    {allowSignalWrites: true}
  );
  onMkdxpzChange(mkdxpz: 模块大小配置) {
    const info = this.msbjInfo();
    if (info) {
      info.peizhishuju.模块大小配置 = mkdxpz;
      // this.msbjInfo.set(cloneDeep(info));
    }
  }
}
