import {Component, computed, HostBinding, inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {CadQiegemuban, CadQiegemubanGroup, isQiegemubanEmpty} from "@app/cad/cad-qiegemuban";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-qiegemuban-group",
  imports: [InputComponent, MatButtonModule, MatIconModule, MatTabsModule, NgScrollbar],
  templateUrl: "./cad-qiegemuban-group.component.html",
  styleUrl: "./cad-qiegemuban-group.component.scss"
})
export class CadQiegemubanGroupComponent {
  dialogRef = inject<MatDialogRef<CadQiegemubanGroupComponent, CadQiegemubanGroupOutput>>(MatDialogRef);
  data = inject<CadQiegemubanGroupInput>(MAT_DIALOG_DATA, {optional: true});
  private dialog = inject(MatDialog);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  constructor() {
    if (this.data) {
      this.group.set(cloneDeep(this.data.group));
    }
  }

  group = signal<CadQiegemubanGroup>({index: -1, qiegemubans: []});
  items = computed(() => this.group().qiegemubans);
  itemInfos = computed(() => {
    const items = this.items();
    const infos: {inputInfos: InputInfo[]; isEmpty: boolean}[] = [];
    for (const item of items) {
      const getter = new InputInfoWithDataGetter(item, {clearable: true});
      infos.push({
        isEmpty: isQiegemubanEmpty(item),
        inputInfos: [
          getter.string("cadId", {
            label: "CAD",
            value: item.cadId,
            model: undefined,
            onChange: (value) => {
              item.cadId = value;
              this.refreshGroup();
            },
            suffixIcons: [
              {name: "open_in_new", onClick: () => this.status.openCadInNewTab(item.cadId, "cad")},
              {name: "list", onClick: (info) => this.selectQiegemubanCad(item, info)}
            ]
          }),
          getter.coordinate("destAnchor", {label: "开料模板锚点", compact: true}),
          getInputInfoGroup([
            getter.selectSingle(
              "startPoint",
              [
                {value: "left", label: "左边"},
                {value: "right", label: "右边"}
              ] satisfies InputInfoOption<CadQiegemuban["startPoint"]>[],
              {label: "切割模板起点"}
            ),
            getter.string("heightOffset", {label: "高度余量"})
          ]),
          getInputInfoGroup([getter.string("cutStart", {label: "起点微连"}), getter.string("cutEnd", {label: "终点微连"})]),
          getInputInfoGroup([getter.boolean("依附板材边缘"), getter.boolean("删除标记线")])
        ]
      });
    }
    return infos;
  });

  refreshGroup() {
    this.group.update((g) => ({...g, qiegemubans: [...g.qiegemubans]}));
  }

  async selectQiegemubanCad(item: CadQiegemuban, info: InputInfo) {
    const result = await openCadListDialog(this.dialog, {
      data: {selectMode: "single", collection: "cad", checkedItems: [item.cadId], fixedSearch: {分类: "45度切割"}}
    });
    if (result) {
      item.cadId = result[0]?.id ?? "";
      info.value = item.cadId;
      this.refreshGroup();
    }
  }

  submit() {
    this.dialogRef.close({group: this.group()});
  }
  cancel() {
    this.dialogRef.close();
  }
}

export interface CadQiegemubanGroupInput {
  group: CadQiegemubanGroup;
}
export interface CadQiegemubanGroupOutput {
  group: CadQiegemubanGroup;
}
export const openCadQiegemubanGroupDialog = getOpenDialogFunc<
  CadQiegemubanGroupComponent,
  CadQiegemubanGroupInput,
  CadQiegemubanGroupOutput
>(CadQiegemubanGroupComponent);
