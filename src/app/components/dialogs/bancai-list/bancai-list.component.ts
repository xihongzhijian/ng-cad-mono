import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, Inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatTooltipModule} from "@angular/material/tooltip";
import {session, setGlobal} from "@app/app.common";
import {MaybePromise, queryString} from "@lucilor/utils";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {debounce, isEqual} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {InputComponent} from "../../../modules/input/components/input.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-bancai-list",
  templateUrl: "./bancai-list.component.html",
  styleUrls: ["./bancai-list.component.scss"],
  imports: [InputComponent, MatButtonModule, MatCheckboxModule, MatTooltipModule, NgScrollbar],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BancaiListComponent {
  private spinner = inject(SpinnerService);

  @HostBinding("class") class = "ng-page";

  constructor(
    public dialogRef: MatDialogRef<BancaiListComponent, BancaiListOutput>,
    @Inject(MAT_DIALOG_DATA) public data: BancaiListInput
  ) {
    const {checkedItems} = this.data || {};
    if (checkedItems) {
      if (!this.data.multi) {
        const checkedItem = checkedItems[0];
        if (checkedItem) {
          this.zidingyi.set(checkedItem.zidingyi || "");
        }
      }
    }
    this.checkedItems.set(checkedItems || []);
    setGlobal("bancai", this);
  }

  filterText = signal(session.load("bancaiListSearchText") || "");
  filterTextEff = effect(() => {
    session.save("bancaiListSearchText", this.filterText());
  });
  filterInputInfo = computed<InputInfo>(() => ({
    type: "string",
    label: "搜索",
    autoFocus: true,
    clearable: true,
    value: this.filterText(),
    onInput: debounce((val) => {
      this.filterText.set(val);
    }, 200)
  }));

  bancaiTypes = computed(() => {
    const typesSet = new Set<string>();
    let hasEmptyType = false;
    for (const item of this.list()) {
      const bancaileixing = item.bancai.bancaileixing;
      if (bancaileixing) {
        typesSet.add(bancaileixing);
      } else {
        hasEmptyType = true;
      }
    }
    const types = ["全部"].concat(Array.from(typesSet));
    if (hasEmptyType && typesSet.size > 0) {
      types.splice(1, 0, "未分组");
    }
    return types;
  });
  activeBancaiType = signal("全部");

  checkedItems = signal<BancaiList[]>([]);
  isBancaiInType(bancai: BancaiList, type: string) {
    if (type === "全部") {
      return true;
    }
    if (type === "未分组") {
      return !bancai.bancaileixing;
    }
    return bancai.bancaileixing === type;
  }
  listRefreshed = signal<BancaiList[] | null>(null);
  list = computed(() => {
    const checkedItemNames = this.checkedItems().map((v) => v.mingzi) || [];
    let list = this.listRefreshed() || this.data.list;
    if (this.data.multi) {
      list = [{mingzi: "全部", cailiaoList: [], houduList: [], guigeList: []}, ...list];
    }
    const text = this.filterText();
    const type = this.activeBancaiType();
    return list.map<BancaiListItem>((bancai) => {
      const hidden = !queryString(text, bancai.mingzi) || !this.isBancaiInType(bancai, type);
      return {bancai, hidden, checked: checkedItemNames.includes(bancai.mingzi)};
    });
  });

  zidingyi = signal("");
  zidingyiIndex = computed(() => {
    for (const [i, item] of this.list().entries()) {
      if (!item.hidden && item.bancai.mingzi === "自定义") {
        return i;
      }
    }
    return -1;
  });

  submit() {
    const bancais: BancaiList[] = [];
    for (const item of this.list()) {
      if (!item.checked) {
        continue;
      }
      const bancai = item.bancai;
      if (bancai.mingzi === "自定义") {
        bancai.zidingyi = this.zidingyi();
      }
      bancais.push(bancai);
    }
    this.dialogRef.close(bancais);
  }

  cancel() {
    this.dialogRef.close();
  }

  async onCheckboxChange(item: BancaiListItem) {
    const checkedItems = this.checkedItems().slice();
    const item2 = checkedItems.find((v) => v.mingzi === item.bancai.mingzi);
    if (this.data.multi) {
      if (item2) {
        checkedItems.splice(checkedItems.indexOf(item2), 1);
      } else {
        checkedItems.push(item.bancai);
      }
      this.checkedItems.set(checkedItems);
    } else {
      this.checkedItems.set(item2 ? [] : [item.bancai]);
    }
  }

  selectAll() {
    const list1 = this.list().filter((v) => !v.hidden);
    const list2 = this.checkedItems();
    const names1 = new Set(list2.map((v) => v.mingzi));
    const names2 = new Set(list1.map((v) => v.bancai.mingzi));
    if (isEqual(names1, names2)) {
      this.checkedItems.set([]);
    } else {
      this.checkedItems.set(list1.map((v) => v.bancai));
    }
  }

  async refresh() {
    this.spinner.show(this.spinner.defaultLoaderId);
    const listRefreshed = await this.data.listRefresh();
    this.spinner.hide(this.spinner.defaultLoaderId);
    this.listRefreshed.set(listRefreshed);
  }
}

export const openBancaiListDialog = getOpenDialogFunc<BancaiListComponent, BancaiListInput, BancaiListOutput>(BancaiListComponent, {
  width: "85%",
  height: "85%"
});

export interface BancaiListInput {
  list: BancaiList[];
  listRefresh: () => MaybePromise<BancaiList[]>;
  checkedItems?: BancaiList[];
  multi?: boolean;
}

export type BancaiListOutput = BancaiList[];

export interface BancaiListItem {
  bancai: BancaiList;
  hidden: boolean;
  checked: boolean;
}
