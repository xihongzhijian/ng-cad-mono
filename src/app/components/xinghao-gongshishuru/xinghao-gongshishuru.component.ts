import {Component, computed, effect, ElementRef, HostBinding, inject, OnDestroy, OnInit, signal, viewChild} from "@angular/core";
import {toSignal} from "@angular/core/rxjs-interop";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute, Params, Router} from "@angular/router";
import {session} from "@app/app.common";
import {tryParseJson} from "@app/utils/json-helper";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {ShuruTableDataSorted} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.types";
import {getShuruItem, getShuruTable} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.utils";
import {XinghaoData} from "@components/lurushuju/services/lrsj-status.types";
import {输入} from "@components/lurushuju/xinghao-data";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEventBase} from "@modules/table/components/table/table.types";
import {isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {WindowMessageManager} from "packages/utils/lib";
import {createJSONEditor, JsonEditor, JSONEditorPropsOptional, Mode, OnChangeStatus} from "vanilla-jsoneditor";

@Component({
  selector: "app-xinghao-gongshishuru",
  imports: [MatButtonModule, NgScrollbarModule, TableComponent],
  templateUrl: "./xinghao-gongshishuru.component.html",
  styleUrl: "./xinghao-gongshishuru.component.scss"
})
export class XinghaoGongshishuruComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @HostBinding("class") class = "ng-page";

  async ngOnInit() {
    this.initJsonEditor();
    const isFromIFrame = window.parent !== window;
    this.isFromIFrame.set(isFromIFrame);
    if (isFromIFrame) {
      this.wmm = new WindowMessageManager("型号公式输入", this, window.parent);
      this.wmm.postMessage("getItemStart");
      const xinghao = await this.wmm.waitForMessage<XinghaoData>("getItemEnd");
      this.xinghao.set(xinghao);
    }
  }
  ngOnDestroy() {
    this.jsonEditor?.destroy();
    this.jsonEditor = null;
  }

  isFromIFrame = signal(false);
  wmm: WindowMessageManager | null = null;

  table = "p_xinghao";
  xinghao = signal<XinghaoData | null>(null);
  xinghaoEff = effect(() => {
    this.initJsonEditor();
  });

  getDefaultShuru(): 输入 {
    return {
      名字: "",
      可以修改: true,
      下单显示请输入: false,
      默认值: "",
      取值范围: "0-9000",
      生效条件: ""
    };
  }
  shurus = computed(() => {
    const text = this.xinghao()?.gongshishuru ?? "";
    const json = tryParseJson<输入[]>(text, [this.getDefaultShuru()]);
    return json;
  });
  setShurus(shurus: 输入[]) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    this.xinghao.set({...xinghao, gongshishuru: JSON.stringify(shurus)});
  }

  queryParams = toSignal(this.route.queryParams, {initialValue: {} as Params});
  queryParamsEff = effect(async () => {
    if (this.isFromIFrame()) {
      return;
    }
    let id: string | undefined = this.queryParams().id;
    if (!id) {
      const result = await openCadOptionsDialog(this.dialog, {data: {name: "型号"}});
      const option = result?.options?.[0];
      if (option) {
        id = String(option.vid);
        this.router.navigate([], {queryParams: {id}, queryParamsHandling: "merge"});
        return;
      }
    }
    if (typeof id !== "string" || !id) {
      return;
    }
    const xinghaos = await this.http.queryMySql<XinghaoData>({table: this.table, filter: {where: {vid: id}}});
    const xinghao = xinghaos?.[0];
    if (!xinghao) {
      return;
    }
    this.xinghao.set(xinghao);
  });

  private _editTypeKey = "xinghao-gongshishuru-edit-type";
  editType = signal(session.load<"json" | "table">(this._editTypeKey) ?? "table");
  editTypeEff = effect(() => {
    session.save(this._editTypeKey, this.editType());
    this.initJsonEditor();
  });

  jsonEditorContainer = viewChild<ElementRef<HTMLElement>>("jsonEditorContainer");
  jsonEditor: JsonEditor | null = null;
  initJsonEditor() {
    const el = this.jsonEditorContainer()?.nativeElement;
    if (!el) {
      return;
    }
    if (!this.jsonEditor) {
      const props: Partial<JSONEditorPropsOptional> = {mode: Mode.tree, onChange: this.jsonEditorOnChange.bind(this)};
      this.jsonEditor = createJSONEditor({target: el, props});
    }
    const text = this.xinghao()?.gongshishuru ?? "";
    const json = tryParseJson<输入[]>(text, [
      {名字: "", 可以修改: true, 下单显示请输入: false, 默认值: "", 取值范围: "0-9000", 生效条件: ""}
    ]);
    this.jsonEditor.set({json});
  }
  jsonEditorOnChange(content: any, previousContent: any, status: OnChangeStatus) {
    if (!isEmpty(status.contentErrors)) {
      return;
    }
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    if (content.text) {
      this.xinghao.set({...xinghao, gongshishuru: content.text});
    } else if (content.json) {
      this.setShurus(content.json);
    }
  }

  shuruTable = computed(() =>
    getShuruTable(
      this.shurus(),
      {add: this.addShuru.bind(this), edit: this.editShuru.bind(this), delete: this.deleteShuru.bind(this)},
      {title: "型号输入"}
    )
  );
  addShuru() {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const shurus = this.shurus();
    shurus.push(this.getDefaultShuru());
    this.setShurus(shurus);
  }
  async editShuru(params: RowButtonEventBase<ShuruTableDataSorted>) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const shurus = this.shurus();
    const item = await getShuruItem(this.message, shurus, params.item);
    if (item) {
      shurus[params.item.originalIndex] = item;
      this.setShurus(shurus);
    }
  }
  async deleteShuru(params: RowButtonEventBase<ShuruTableDataSorted>) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    if (await this.message.confirm(`确定删除【${params.item.名字}】吗？`)) {
      const shurus = this.shurus();
      shurus.splice(params.item.originalIndex, 1);
      this.setShurus(shurus);
    }
  }

  async submit(close = false) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    if (this.wmm) {
      this.wmm.postMessage("submitStart", {field: "gongshishuru", value: xinghao.gongshishuru, close});
    } else {
      await this.http.tableUpdate<XinghaoData>({table: this.table, data: {vid: xinghao.vid, gongshishuru: xinghao.gongshishuru}});
    }
  }
}
