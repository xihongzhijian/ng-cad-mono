import {ChangeDetectionStrategy, Component, computed, forwardRef, HostBinding, Inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {flipOptions} from "@app/cad/options";
import {Utils} from "@mixins/utils.mixin";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";
import {SuanliaodanFlipInput, SuanliaodanFlipItem, SuanliaodanFlipOutput} from "./suanliaodan-flip.types";

@Component({
  selector: "app-suanliaodan-flip",
  standalone: true,
  imports: [forwardRef(() => InputComponent), MatButtonModule, MatIconModule, NgScrollbarModule],
  templateUrl: "./suanliaodan-flip.component.html",
  styleUrl: "./suanliaodan-flip.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuanliaodanFlipComponent extends Utils() {
  @HostBinding("class") class = "ng-page";

  constructor(
    public dialogRef: MatDialogRef<SuanliaodanFlipComponent, SuanliaodanFlipOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SuanliaodanFlipInput
  ) {
    super();
    let items = data?.items;
    if (!items) {
      items = [];
    }
    this.items.set(cloneDeep(items));
  }

  items = signal<SuanliaodanFlipItem[]>([]);
  addItem(i?: number) {
    this.arraySignalAdd(this.items, {kaiqi: "", chanpinfenlei: "", fanzhuanfangshi: ""}, i);
  }
  removeItem(i: number) {
    this.arraySignalRemove(this.items, i);
  }

  inputInfos = computed(() => {
    const infos: InputInfo[][] = [];
    const items = this.items();
    for (const [i, data] of items.entries()) {
      const onChange = () => {
        const arr = this.items();
        arr[i] = {...data};
        this.items.set([...arr]);
      };
      const getOptionInputInfo = (key: keyof SuanliaodanFlipItem, name: string): InputInfo<SuanliaodanFlipItem> => ({
        type: "string",
        label: name,
        selectOnly: true,
        optionsDialog: {optionKey: name},
        model: {data, key},
        onChange
      });
      const group: InputInfo<SuanliaodanFlipItem>[] = [
        getOptionInputInfo("kaiqi", "开启"),
        getOptionInputInfo("chanpinfenlei", "产品分类"),
        {type: "select", label: "翻转", options: flipOptions, model: {data, key: "fanzhuanfangshi"}, onChange}
      ];
      infos.push(group);
    }
    return infos;
  });

  submit() {
    this.dialogRef.close({items: this.items()});
  }
  close() {
    this.dialogRef.close();
  }
}

export const openSuanliaodanFlipDialog = getOpenDialogFunc<SuanliaodanFlipComponent, SuanliaodanFlipInput, SuanliaodanFlipOutput>(
  SuanliaodanFlipComponent,
  {
    width: "400px",
    maxWidth: "80vw",
    height: "80vh"
  }
);
