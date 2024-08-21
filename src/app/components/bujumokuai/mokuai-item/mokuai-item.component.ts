import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {CadImageComponent} from "@app/components/cad-image/cad-image.component";
import {openBancaiFormDialog} from "@app/components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {openCadListDialog} from "@app/components/dialogs/cad-list/cad-list.component";
import {FormulasEditorComponent} from "@app/components/formulas-editor/formulas-editor.component";
import {BancaiListData} from "@app/modules/http/services/cad-data.service.types";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {MrbcjfzInfo} from "@app/views/mrbcjfz/mrbcjfz.types";
import {getEmptyMrbcjfzInfo, isMrbcjfzInfoEmpty2, MrbcjfzXinghaoInfo} from "@app/views/mrbcjfz/mrbcjfz.utils";
import {CadData} from "@lucilor/cad-viewer";
import {keysOf, ObjectOf} from "@lucilor/utils";
import {cloneDeep, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {BjmkStatusService} from "../services/bjmk-status.service";
import {MokuaiItem} from "./mokuai-item.types";

@Component({
  selector: "app-mokuai-item",
  standalone: true,
  imports: [
    CadImageComponent,
    FormulasEditorComponent,
    ImageComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    NgScrollbarModule
  ],
  templateUrl: "./mokuai-item.component.html",
  styleUrl: "./mokuai-item.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MokuaiItemComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);

  @HostBinding("class") class = ["ng-page"];

  mokuaiIn = input.required<MokuaiItem>({alias: "mokuai"});
  bancaiListData = input.required<BancaiListData | null>();
  imgPrefix = input<string>("");
  closeOut = output({alias: "close"});

  async ngOnInit() {
    await this.bjmkStatus.fetchCads();
  }

  mokuai = computed(() => cloneDeep(this.mokuaiIn()));
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
          {name: "edit", isDefault: true, onClick: () => this.editMorenbancai(i)},
          {name: "add", onClick: () => this.addMorenbancai(i)},
          {name: "remove", onClick: () => this.removeMorenbancai(i)}
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

  mokuaiInputInfos = computed(() => {
    const mokuai = this.mokuai();
    const getInfos = (arr: string[][], type: string) =>
      arr.map<InputInfo>((v) => ({
        type: "string",
        label: `${type}-${v[0]}`,
        model: {key: "1", data: v}
      }));
    const infos: {type: string; infos: InputInfo[]}[] = [];
    infos.push({type: "gongshi", infos: getInfos(mokuai.gongshishuru, "公式输入")});
    infos.push({type: "xuanxiang", infos: getInfos(mokuai.xuanxiangshuru, "选项输入")});
    return infos;
  });
  mokuaiInputInfos2 = computed(() => {
    const infos: InputInfo[] = [
      {type: "select", label: "花件压条", appearance: "list", options: ["D1", "D2", "无"]},
      {type: "select", label: "竖压条", appearance: "list", options: ["有", "无"]}
    ];
    return infos;
  });

  cadsAll = signal<CadData[]>([]);
  cadsSelected = signal<CadData[]>([]);
  cadsAllEff = effect(
    () => {
      const cadsAll = this.cadsAll();
      this.cadsSelected.update((v) => v.filter((v2) => cadsAll.find((v3) => v2.id === v3.id)));
    },
    {allowSignalWrites: true}
  );
  async selectCadsAll() {
    const result = await openCadListDialog(this.dialog, {
      data: {
        selectMode: "multiple",
        collection: this.bjmkStatus.collection,
        source: this.bjmkStatus.cads(),
        checkedItems: this.cadsAll().map((v) => v.id)
      }
    });
    if (result) {
      this.cadsAll.set(result);
    }
  }
  selectCad(cad: CadData) {
    const cads = this.cadsSelected().slice();
    if (!cads.find((v) => v.id === cad.id)) {
      cads.push(cad);
      this.cadsSelected.set(cads);
    }
  }
  unselectCad(cad: CadData) {
    const cads = this.cadsSelected().slice();
    const index = cads.findIndex((v) => v.id === cad.id);
    if (index >= 0) {
      cads.splice(index, 1);
      this.cadsSelected.set(cads);
    }
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
    const itemNew: Partial<MokuaiItem> = {id: mokuai.id, name: mokuai.name};
    for (const key of keysOf(mokuai)) {
      const val = mokuai[key];
      const valOld = mokuaiOld[key];
      if (!isEqual(val, valOld)) {
        itemNew[key] = val as any;
      }
    }
    await this.bjmkStatus.editMokuai(itemNew, true);
  }
  async saveAs() {
    await this.bjmkStatus.copyMokuai(this.updateMokaui());
  }
}
