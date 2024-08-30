import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {openBancaiFormDialog} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf} from "@lucilor/utils";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {BancaiListData} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {MrbcjfzInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {getEmptyMrbcjfzInfo, isMrbcjfzInfoEmpty2, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {cloneDeep, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {firstValueFrom, Subject} from "rxjs";
import {CadItemComponent} from "../../lurushuju/cad-item/cad-item.component";
import {MokuaiCadsComponent} from "../mokuai-cads/mokuai-cads.component";
import {BjmkStatusService} from "../services/bjmk-status.service";
import {MokuaiItem} from "./mokuai-item.types";
import {getEmptyMokuaiItem} from "./mokuai-item.utils";

@Component({
  selector: "app-mokuai-item",
  standalone: true,
  imports: [
    CadImageComponent,
    CadItemComponent,
    FloatingDialogModule,
    FormulasEditorComponent,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MokuaiCadsComponent,
    NgScrollbarModule
  ],
  templateUrl: "./mokuai-item.component.html",
  styleUrl: "./mokuai-item.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MokuaiItemComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);

  @HostBinding("class") class = ["ng-page"];

  cadYaoqiu = this.bjmkStatus.cadYaoqiu;
  collection = this.bjmkStatus.collection;

  mokuaiIn = input.required<MokuaiItem>({alias: "mokuai"});
  bancaiListData = input.required<BancaiListData | null>();
  imgPrefix = input<string>("");
  closeOut = output({alias: "close"});

  async ngOnInit() {
    await this.bjmkStatus.fetchCads();
  }

  mokuai = signal<MokuaiItem>(getEmptyMokuaiItem());
  mokuaiEff = effect(() => this.mokuai.set(cloneDeep(this.mokuaiIn())), {allowSignalWrites: true});
  async editMokuai() {
    const mokuai = this.mokuai();
    const mokuai2 = await this.bjmkStatus.getMokuaiWithForm(mokuai);
    Object.assign(mokuai, mokuai2);
    this.cd.markForCheck();
  }

  morenbancais = signal<{key: string; val: MrbcjfzInfo}[]>([]);
  morenbancaisEff = effect(
    () => {
      const morenbancai = this.mokuai().morenbancai || {};
      this.morenbancais.set(Object.entries(morenbancai).map(([key, val]) => ({key, val})));
    },
    {allowSignalWrites: true}
  );
  morenbancaiInputInfos = computed(() => {
    const infos: InputInfo[] = [];
    for (const [i, {key, val}] of this.morenbancais().entries()) {
      let str = "";
      if (!isMrbcjfzInfoEmpty2(key, val)) {
        const {默认开料材料, 默认开料板材, 默认开料板材厚度} = val;
        str = `${默认开料材料}/${默认开料板材}/${默认开料板材厚度}`;
      }
      infos.push({
        type: "string",
        label: key,
        value: str,
        readonly: true,
        suffixIcons: [
          {name: "edit", isDefault: true, onClick: () => this.editMorenbancai(i)}
          // {name: "add", onClick: () => this.addMorenbancai(i)},
          // {name: "remove", onClick: () => this.removeMorenbancai(i)}
        ]
      });
    }
    return infos;
  });
  async getMorenbancaiItem(i?: number) {
    const morenbancais = this.morenbancais();
    const item = typeof i === "number" ? cloneDeep(morenbancais[i]) : {key: "", val: getEmptyMrbcjfzInfo("")};
    const xinghao = new MrbcjfzXinghaoInfo("", {vid: 0, mingzi: ""});
    const {key, val} = item;
    xinghao.默认板材 = {[key]: val};
    xinghao.update();
    const extraInputInfos = xinghao.inputInfos[key];
    const names = morenbancais.map((v) => v.key);
    if (typeof i === "number") {
      names.splice(i, 1);
    }
    extraInputInfos[0].unshift({
      type: "string",
      label: "板材分组名字",
      model: {data: item, key: "key"},
      autoFocus: true,
      validators: [Validators.required, (control) => (names.includes(control.value) ? {名字不能重复: true} : null)],
      style: {...extraInputInfos[0][0].style}
    });
    const bancaiList = this.bancaiListData()?.bancais || [];
    const result = await openBancaiFormDialog(this.dialog, {
      data: {
        data: {
          bancai: val.默认开料板材,
          cailiao: val.默认开料材料,
          houdu: val.默认开料板材厚度,
          bancaiList: val.可选板材,
          cailiaoList: val.可选材料,
          houduList: val.可选厚度
        },
        bancaiList,
        key,
        extraInputInfos,
        noTitle: true
      }
    });
    if (result) {
      item.val = xinghao.默认板材[key];
      item.val.默认开料板材 = result.bancai;
      item.val.默认开料材料 = result.cailiao;
      item.val.默认开料板材厚度 = result.houdu;
      item.val.可选板材 = result.bancaiList || [];
      item.val.可选材料 = result.cailiaoList || [];
      item.val.可选厚度 = result.houduList || [];
      return item;
    }
    return null;
  }
  async addMorenbancai(i?: number) {
    const morenbancais = this.morenbancais().slice();
    const item = await this.getMorenbancaiItem();
    if (item) {
      if (typeof i === "number") {
        morenbancais.splice(i + 1, 0, item);
      } else {
        morenbancais.push(item);
      }
      this.morenbancais.set(morenbancais);
    }
  }
  async editMorenbancai(i: number) {
    const morenbancais = this.morenbancais().slice();
    const item = await this.getMorenbancaiItem(i);
    if (item) {
      morenbancais[i] = item;
      this.morenbancais.set(morenbancais);
    }
  }
  async removeMorenbancai(i: number) {
    const morenbancais = this.morenbancais().slice();
    if (!(await this.message.confirm(`确定删除${morenbancais[i].key}吗？`))) {
      return;
    }
    morenbancais.splice(i, 1);
    this.morenbancais.set(morenbancais);
  }
  async openMrbcjfz() {
    const result = await openMrbcjfzDialog(this.dialog, {
      data: {id: this.mokuai().id, table: "p_peijianmokuai", collection: this.bjmkStatus.collection}
    });
    if (result) {
      await this.bjmkStatus.fetchMokuais(true);
    }
  }

  mokuaiInputInfos = computed(() => {
    const mokuai = this.mokuai();
    const onChange = () => this.mokuai.update((v) => ({...v}));
    const getSelectInputInfo = (label: string, key: keyof MokuaiItem, table: string): InputInfo => ({
      type: "select",
      label,
      multiple: true,
      options: [],
      model: {key, data: mokuai},
      optionsDialog: {
        optionKey: table,
        openInNewTab: true,
        onChange
      }
    });
    const getStringInputInfo = (label: string, key: keyof MokuaiItem): InputInfo => ({
      type: "string",
      label,
      model: {key, data: mokuai},
      onChange
    });
    const infos: InputInfo[] = [
      getSelectInputInfo("门铰", "menjiao", "p_menjiao"),
      getSelectInputInfo("开启", "kaiqi", "p_kaiqi"),
      getStringInputInfo("公式输入", "gongshishuru"),
      getStringInputInfo("选项输入", "xuanxiangshuru"),
      getStringInputInfo("输出变量", "shuchubianliang"),
      getStringInputInfo("输出文本", "shuchuwenben")
    ];
    return infos;
  });
  mokuaiInputInfos2 = computed(() => {
    const infos: InputInfo[] = [
      {type: "select", label: "花件压条", appearance: "list", options: ["D1", "D2", "无"]},
      {type: "select", label: "竖压条", appearance: "list", options: ["有", "无"]}
    ];
    return infos;
  });

  activeCad = signal<CadData | null>(null);
  activeCadEff = effect(
    () => {
      const cads = this.selectedCads();
      const activeCad = untracked(() => this.activeCad());
      if (activeCad) {
        this.activeCad.set(cads.find((v) => v.id === activeCad.id) || null);
      }
    },
    {allowSignalWrites: true}
  );
  afterEditCad() {
    this.cd.markForCheck();
  }
  showCadsDialog = signal(false);
  selectedCads = signal<CadData[]>([]);
  selectedCadsEff = effect(
    () => {
      const cads = this.mokuai().cads || [];
      this.selectedCads.set(cads.map((v) => new CadData(v.json)));
    },
    {allowSignalWrites: true}
  );
  selectCads$ = new Subject<MokuaiCadsComponent | null>();
  async selectCads() {
    const mokuai = this.mokuai();
    this.selectedCads.set((mokuai.cads || []).map((v) => new CadData(v.json)));
    this.showCadsDialog.set(true);
    const component = await firstValueFrom(this.selectCads$);
    if (!component) {
      return;
    }
    const cads = this.selectedCads().map((v) => getHoutaiCad(v));
    this.mokuai.update((v) => ({...v, cads}));
  }
  closeCadsDialog(mokuaiCads: MokuaiCadsComponent | null) {
    this.showCadsDialog.set(false);
    this.selectCads$.next(mokuaiCads);
  }
  clickCad(cad: CadData) {
    this.activeCad.set(cad);
  }

  close() {
    this.closeOut.emit();
  }
  slgsComponent = viewChild<FormulasEditorComponent>("slgs");
  updateMokaui() {
    const mokuai = this.mokuai();
    mokuai.morenbancai = this.morenbancais().reduce<ObjectOf<MrbcjfzInfo>>((acc, {key, val}) => {
      acc[key] = val;
      return acc;
    }, {});
    mokuai.suanliaogongshi = this.slgsComponent()?.submitFormulas() || {};
    return mokuai;
  }
  async save() {
    const mokuai = this.updateMokaui();
    const mokuaiOld = this.mokuaiIn();
    const mokuaiNew: Partial<MokuaiItem> = {id: mokuai.id, name: mokuai.name};
    for (const key of keysOf(mokuai)) {
      const val = mokuai[key];
      const valOld = mokuaiOld[key];
      if (!isEqual(val, valOld)) {
        mokuaiNew[key] = val as any;
      }
    }
    await this.bjmkStatus.editMokuai(mokuaiNew, true);
  }
  async saveAs() {
    await this.bjmkStatus.copyMokuai(this.updateMokaui());
  }
}
