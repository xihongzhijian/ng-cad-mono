import {Component, computed, inject, signal, viewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxChange, MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {joinOptions, splitOptions} from "@app/app.common";
import {flipOptions} from "@app/cad/options";
import {CadData, CadZhankai, FlipType} from "@lucilor/cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter, validateForm} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep, difference, union} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {openCadOptionsDialog} from "../cad-options/cad-options.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-zhankai",
  templateUrl: "./cad-zhankai.component.html",
  styleUrls: ["./cad-zhankai.component.scss"],
  imports: [InputComponent, MatButtonModule, MatCheckboxModule, MatIconModule, NgScrollbar]
})
export class CadZhankaiComponent extends Utils() {
  dialogRef = inject<MatDialogRef<CadZhankaiComponent, CadZhankai[]>>(MatDialogRef);
  data = inject<CadData["zhankai"]>(MAT_DIALOG_DATA, {optional: true}) ?? [];
  private dialog = inject(MatDialog);

  private message = inject(MessageService);
  private status = inject(AppStatusService);

  checkedIndices = signal<number[]>([]);
  keysMap = {
    kaiqi: "开启",
    chanpinfenlei: "产品分类",
    flip: "翻转"
  };
  flipOptions = flipOptions;
  get emptyFlipItem(): CadZhankai["flip"][0] {
    return {kaiqi: "", chanpinfenlei: "", fanzhuanfangshi: ""};
  }

  zhankais = signal<CadData["zhankai"]>([]);

  constructor() {
    super();
    this.zhankais.set(cloneDeep(this.data));
  }

  async submit() {
    if (await this.validate()) {
      this.dialogRef.close(this.zhankais());
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  openCadmuban(item: CadZhankai, key: "kailiaomuban" | "neikaimuban") {
    this.status.openCadInNewTab(item[key], "kailiaocadmuban");
  }

  async selectCadmuban(item: CadZhankai, key: "kailiaomuban" | "neikaimuban", i: number) {
    const checkedItems = [item[key]];
    const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
    if (result) {
      item[key] = result[0]?.id || "";
      this.zhankais.update((v) => {
        v[i][key] = item[key];
        return [...v];
      });
    }
  }

  onCheckboxChange(event: MatCheckboxChange, i: number) {
    if (event.checked) {
      this.checkedIndices.update((v) => difference(v, [i]));
    } else {
      this.checkedIndices.update((v) => union(v, [i]));
    }
  }

  selectAll() {
    const indices = this.data.map((_v, i) => i);
    this.checkedIndices.set(indices.slice(1));
  }
  unselectAll() {
    this.checkedIndices.set([]);
  }
  toggleItemSelected(i: number) {
    const checkedIndices = this.checkedIndices();
    if (checkedIndices.includes(i)) {
      this.checkedIndices.update((v) => difference(v, [i]));
    } else {
      this.checkedIndices.update((v) => union(v, [i]));
    }
  }

  addItem() {
    this.zhankais.update((v) => [...v, new CadZhankai()]);
    this.validate();
  }
  copyItem(i: number) {
    const zhankais = this.zhankais().slice();
    zhankais.splice(i + 1, 0, cloneDeep(zhankais[i]));
    this.zhankais.set(zhankais);
    this.validate();
  }
  removeItem(i: number) {
    if (i === 0) {
      this.message.alert("不能删除第一项");
      return;
    } else {
      const zhankais = this.zhankais().slice();
      zhankais.splice(i, 1);
      this.zhankais.set(zhankais);
    }
    this.validate();
  }

  async selectOptions(obj: any, field: string) {
    if (!field) {
      await this.message.error("键名不能为空");
    }
    const checkedItems = splitOptions(obj[field]);
    const name = (this.keysMap as any)[field] || field;
    const result = await openCadOptionsDialog(this.dialog, {data: {name, checkedItems, multi: true}});
    if (result?.options) {
      obj[field] = joinOptions(result.options);
    }
  }

  inputInfoGroups = computed(() => {
    const groups: {zhankai: CadZhankai; inputInfos: InputInfo[]; inputInfosFlip: InputInfo[][]; inputInfosFlipChai: InputInfo[][]}[] = [];
    const zhankais = this.zhankais();
    for (const [i, zhankai] of zhankais.entries()) {
      const getter = new InputInfoWithDataGetter(zhankai);
      const group: (typeof groups)[number] = {zhankai, inputInfos: [], inputInfosFlip: [], inputInfosFlipChai: []};
      groups.push(group);
      group.inputInfos = [
        getter.string("name", {
          label: "名字",
          suffixTexts: [
            {name: "复制", onClick: () => this.copyItem(i)},
            {name: "删除", onClick: () => this.removeItem(i)}
          ],
          validators: Validators.required
        }),
        getInputInfoGroup([
          getter.string("kailiaomuban", {
            label: "开料CAD模板",
            clearable: true,
            suffixIcons: [
              {name: "open_in_new", onClick: () => this.openCadmuban(zhankai, "kailiaomuban")},
              {name: "list", onClick: () => this.selectCadmuban(zhankai, "kailiaomuban", i)}
            ]
          }),
          getter.string("neikaimuban", {
            label: "内开模板",
            clearable: true,
            suffixIcons: [
              {name: "open_in_new", onClick: () => this.openCadmuban(zhankai, "neikaimuban")},
              {name: "list", onClick: () => this.selectCadmuban(zhankai, "neikaimuban", i)}
            ]
          })
        ]),
        getInputInfoGroup([getter.string("zhankaikuan", {label: "展开宽"}), getter.string("zhankaigao", {label: "展开高"})]),
        getInputInfoGroup([getter.string("shuliang", {label: "数量"}), getter.string("shuliangbeishu", {label: "数量倍数"})]),
        getter.boolean("chai", {label: "开料数量不为1时拆成单个", appearance: "switch"}),
        getter.string("包边正面按分类拼接"),
        getter.array("conditions", {label: "条件"}),
        getter.object("neibugongshi", {label: "内部公式"})
      ];

      for (const flip of zhankai.flip) {
        const getterFlip = new InputInfoWithDataGetter(flip);
        group.inputInfosFlip.push([
          getterFlip.selectMultipleAsStr("kaiqi", [], {label: "开启", optionsDialog: {optionKey: "开启"}}),
          getterFlip.selectMultipleAsStr("chanpinfenlei", [], {label: "产品分类", optionsDialog: {optionKey: "产品分类"}}),
          getterFlip.selectSingle("fanzhuanfangshi", flipOptions, {label: "翻转"})
        ]);
      }

      const flipChaiKeys = Object.keys(zhankai.flipChai);
      flipChaiKeys.sort();
      const onFlipChaiChange = (n: string, type: FlipType) => {
        zhankai.flipChai[n] = type;
        this.zhankais.update((v) => {
          v[i].flipChai = {...v[i].flipChai};
          return [...v];
        });
      };
      for (const key of flipChaiKeys) {
        group.inputInfosFlipChai.push([
          getInputInfoGroup([
            {
              type: "string",
              label: "序号",
              value: key,
              readonly: true,
              suffixIcons: [{name: "remove_circle", onClick: () => this.removeFlipChai(i, key)}]
            },
            {
              type: "select",
              label: "翻转",
              options: flipOptions,
              value: zhankai.flipChai[key],
              onChange: (val: FlipType) => onFlipChaiChange(key, val)
            }
          ])
        ]);
      }
    }
    return groups;
  });

  addFlip(i: number, j?: number) {
    const zhankai = this.zhankais()[i];
    const flip = this.emptyFlipItem;
    if (typeof j === "number") {
      zhankai.flip.splice(j + 1, 0, flip);
    } else {
      zhankai.flip.push(flip);
    }
    this.zhankais.update((v) => {
      v[i].flip = [...v[i].flip];
      return [...v];
    });
  }
  removeFlip(i: number, j: number) {
    const zhankai = this.zhankais()[i];
    zhankai.flip.splice(j, 1);
    this.zhankais.update((v) => {
      v[i].flip = [...v[i].flip];
      return [...v];
    });
  }

  async addFlipChai(i: number) {
    const num = await this.message.prompt({label: "序号", type: "number", validators: Validators.min(0)});
    if (num === null) {
      return;
    }
    const flipChai = this.zhankais()[i].flipChai;
    if (flipChai[num] !== undefined) {
      this.message.snack("该序号已存在");
      return;
    }
    flipChai[num] = "h";
    this.zhankais.update((v) => {
      v[i].flipChai = {...flipChai};
      return [...v];
    });
  }
  removeFlipChai(i: number, key: string) {
    const flipChai = this.zhankais()[i].flipChai;
    delete flipChai[key];
    this.zhankais.update((v) => {
      v[i].flipChai = {...flipChai};
      return [...v];
    });
  }

  inputComponents = viewChildren(InputComponent);
  async validate() {
    const {errorMsg} = await validateForm(this.inputComponents());
    if (errorMsg) {
      this.message.error(errorMsg);
      return false;
    }
    return true;
  }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankai[], CadZhankai[]>(CadZhankaiComponent);

export const editCadZhankai = async (dialog: MatDialog, data: CadData) => {
  const result = await openCadZhankaiDialog(dialog, {data: data.zhankai});
  if (result) {
    data.zhankai = result;
    if (result.length) {
      data.name = result[0].name;
    }
  }
};
