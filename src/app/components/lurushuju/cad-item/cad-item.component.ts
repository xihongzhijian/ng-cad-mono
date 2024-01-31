import {Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {exportCadData} from "@app/cad/utils";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadData, CadLineLike, CadMtext, CadViewer, CadZhankai, generateLineTexts} from "@lucilor/cad-viewer";
import {selectFiles} from "@lucilor/utils";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {CadItemButton} from "./cad-item.types";

@Component({
  selector: "app-cad-item",
  standalone: true,
  imports: [InputComponent, MatButtonModule, MatIconModule],
  templateUrl: "./cad-item.component.html",
  styleUrl: "./cad-item.component.scss"
})
export class CadItemComponent<T = undefined> implements OnChanges, OnDestroy {
  @Input() cadWidth = 360;
  cadHeight = 0;
  @Input({required: true}) cad: HoutaiCad = getHoutaiCad();
  @Input({required: true}) buttons: CadItemButton<T>[] = [];
  @Input({required: true}) customInfo: T = undefined as T;
  @Input() mubanExtraData: Partial<CadData> = {};
  @Input() suanliaogongshiInfo?: SuanliaogongshiInfo;
  @Input() noMuban?: boolean;
  @Input() noZhankai?: boolean;

  @ViewChild("cadContainer") cadContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("mubanContainer") mubanContainer?: ElementRef<HTMLDivElement>;
  cadViewer?: CadViewer;
  mubanViewer?: CadViewer;
  mubanData?: CadData;
  get mubanId() {
    return this.cad?.json?.zhankai?.[0]?.kailiaomuban || "";
  }
  set mubanId(value: string) {
    const {cad} = this;
    if (!cad) {
      return;
    }
    if (!cad.json) {
      cad.json = {};
    }
    if (!cad.json.zhankai) {
      cad.json.zhankai = [];
    }
    if (!cad.json.zhankai[0]) {
      cad.json.zhankai[0] = {};
    }
    cad.json.zhankai[0].kailiaomuban = value;
  }

  zhankaiInputs: {width: InputInfo; height: InputInfo; num: InputInfo}[] = [];
  mubanInputs: InputInfo[][] = [];
  showMuban: boolean;

  constructor(
    private message: MessageService,
    private dialog: MatDialog,
    private http: CadDataService,
    status: AppStatusService
  ) {
    this.showMuban = status.projectConfig.getBoolean("新版本做数据可以做激光开料");
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.cad) {
      setTimeout(() => {
        this.update();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.cadViewer?.destroy();
    this.mubanViewer?.destroy();
  }

  centerCad() {
    this.cadViewer?.center();
  }

  async editCad() {
    const {cad} = this;
    if (!cad) {
      return;
    }
    const cadData = new CadData(cad.json);
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        data: cadData,
        center: true,
        isLocal: true,
        suanliaogongshiInfo: this.suanliaogongshiInfo
      }
    });
    if (result?.isSaved) {
      Object.assign(cad, getHoutaiCad(cadData), {_id: cad._id});
      this.initCadViewer();
    }
  }

  centerMuban() {
    this.mubanViewer?.center();
  }

  async uploadMuban() {
    const files = await selectFiles({accept: ".dxf"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const cadData = await this.http.uploadDxf(file);
    if (!cadData) {
      return;
    }
    const {cad, mubanId, mubanExtraData} = this;
    if (mubanId) {
      cadData.id = mubanId;
    }
    cadData.name = cad?.名字 || "模板";
    if (mubanExtraData) {
      Object.assign(cadData, mubanExtraData);
    }
    const result = await this.http.setCad({collection: "kailiaocadmuban", cadData, force: true}, true);
    if (!result) {
      return;
    }
    this.mubanId = result.id;
    this.mubanData = cadData;
    this.initMubanViewer();
  }

  async editMuban() {
    const {mubanData} = this;
    if (!mubanData) {
      return;
    }
    const result = await openCadEditorDialog(this.dialog, {
      data: {
        data: mubanData,
        center: true,
        collection: "kailiaocadmuban",
        suanliaogongshiInfo: this.suanliaogongshiInfo
      }
    });
    if (result?.isSaved) {
      this.initMubanViewer();
    }
  }

  async removeMuban() {
    const {mubanData} = this;
    if (!mubanData) {
      return;
    }
    if (!(await this.message.confirm(`确定删除模板【${mubanData.name}】吗？`))) {
      return;
    }
    if (await this.http.mongodbDelete("kailiaocadmuban", mubanData.id)) {
      this.mubanId = "";
      this.mubanData = undefined;
      this.initMubanViewer();
    }
  }

  update() {
    delete this.mubanData;
    this.initCadViewer();
    this.initMubanViewer();
  }

  initCadViewer0(data: CadData, containerEl: HTMLDivElement, afterDblClickForm: () => void) {
    const width = this.cadWidth;
    const height = (width / 300) * 150;
    this.cadHeight = height;
    const cadViewer = new CadViewer(data, {
      width,
      height,
      backgroundColor: "black",
      enableZoom: true,
      dragAxis: "xy",
      selectMode: "single",
      entityDraggable: false,
      lineGongshi: 24
    });
    cadViewer.appendTo(containerEl);
    cadViewer.on("entitydblclick", async (_, entity) => {
      if (entity instanceof CadMtext && entity.parent) {
        entity = entity.parent;
      }
      if (!(entity instanceof CadLineLike)) {
        return;
      }
      const form: InputInfo<typeof entity>[] = [
        {type: "string", label: "名字", model: {data: entity, key: "mingzi"}},
        {type: "string", label: "公式", model: {data: entity, key: "gongshi"}}
      ];
      const result = await this.message.form(form);
      if (result) {
        await cadViewer.render();
        afterDblClickForm();
      }
    });
    setTimeout(() => {
      cadViewer.center();
    }, 0);
    return cadViewer;
  }

  initCadViewer() {
    this.cadViewer?.destroy();
    const {cad, cadContainer} = this;
    if (!cad || !cadContainer) {
      return;
    }
    const containerEl = cadContainer.nativeElement;
    containerEl.innerHTML = "";
    const data = new CadData(cad.json);
    generateLineTexts(data);
    const cadViewer = this.initCadViewer0(data, containerEl, () => {
      cad.json = exportCadData(data, true);
    });
    this.cadViewer = cadViewer;
    this.updateZhankaiInputs();
  }

  async initMubanViewer() {
    this.mubanViewer?.destroy();
    if (!this.showMuban) {
      return;
    }
    const {cad, mubanContainer, mubanId} = this;
    let {mubanData} = this;
    if (!cad || !mubanContainer) {
      return;
    }
    if (!mubanData && mubanId) {
      const resultData = await this.http.getCad({collection: "kailiaocadmuban", id: mubanId}, {silent: true});
      mubanData = resultData?.cads[0];
      this.mubanData = mubanData;
    }
    if (!mubanData) {
      this.mubanId = "";
      return;
    }
    const containerEl = mubanContainer.nativeElement;
    containerEl.innerHTML = "";
    const cadViewer = this.initCadViewer0(mubanData, containerEl, () => {});
    this.mubanViewer = cadViewer;
    this.updateMubanInputs();
  }

  updateZhankaiInputs() {
    const zhankais = this.cad?.json?.zhankai;
    this.zhankaiInputs = [];
    if (!Array.isArray(zhankais)) {
      return;
    }
    if (zhankais.length < 1) {
      zhankais.push(new CadZhankai().export());
    }
    for (const zhankai of zhankais) {
      this.zhankaiInputs.push({
        width: {type: "string", label: "宽", model: {data: zhankai, key: "zhankaikuan"}},
        height: {type: "string", label: "高", model: {data: zhankai, key: "zhankaigao"}},
        num: {type: "string", label: "数量", model: {data: zhankai, key: "shuliang"}}
      });
    }
  }

  updateMubanInputs() {
    this.mubanInputs = [];
    const {cad, mubanData} = this;
    if (!cad || !mubanData) {
      return;
    }
    if (!cad.json) {
      cad.json = {};
    }
    if (!cad.json.zhankai) {
      cad.json.zhankai = [];
    }
    if (!cad.json.zhankai[0]) {
      cad.json.zhankai[0] = {};
    }
    const zhankai = cad.json.zhankai[0];
    if (!zhankai.flip || !zhankai.flip[0]) {
      zhankai.flip = [{chanpinfenlei: "", fanzhuanfangshi: "", kaiqi: ""}];
    }
    const flip = zhankai.flip[0];
    this.mubanInputs = [
      [
        {
          type: "select",
          label: "翻转",
          model: {data: flip, key: "fanzhuanfangshi"},
          options: [
            {label: "无", value: ""},
            {label: "水平翻转", value: "h"},
            {label: "垂直翻转", value: "v"}
          ]
        },
        {
          type: "select",
          label: "分类",
          model: {data: mubanData, key: "type"},
          options: ["自动展开+模板", "对回去面+模板", "CAD变化值+模板", "双向自动展开+模板"].map((v) => ({
            label: v.replace("+模板", ""),
            value: v
          })),
          onChange: async () => {
            const result = await this.http.setCad({collection: "kailiaocadmuban", cadData: mubanData, force: true}, true, {spinner: false});
            if (result) {
              this.message.snack("已保存");
            }
          }
        }
      ]
    ];
  }

  addZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i + 1, 0, new CadZhankai().export());
    this.update();
  }

  removeZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i, 1);
    this.update();
  }
}
