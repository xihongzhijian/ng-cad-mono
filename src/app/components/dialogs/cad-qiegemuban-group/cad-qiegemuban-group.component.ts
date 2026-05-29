import {Component, computed, HostBinding, inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {CadQiegemubanGroup, isQiegemubanEmpty, justifyQiegemubanGroup, QiegemubanGroupName} from "@app/cad/cad-qiegemuban";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
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
      this.group.set(justifyQiegemubanGroup(cloneDeep(this.data.group)));
    }
  }

  group = signal<CadQiegemubanGroup>({index: -1, qiegemubans: []});
  items = computed(() => this.group().qiegemubans);
  itemInfos = computed(() => {
    const items = this.items();
    const infos: {inputInfos: InputInfo[]; isEmpty: boolean}[] = [];
    for (const item of items) {
      const getPositionOptions = () => {
        const name = item.名字 as QiegemubanGroupName;
        switch (name) {
          case "顶框上":
            return ["上"];
          case "顶框下":
            return ["下"];
          default:
            return ["上", "下"];
        }
      };
      const isPositionEmpty = !item.位置;
      const getter = new InputInfoWithDataGetter(item, {clearable: true, onChange: () => this.refreshGroup(), disabled: isPositionEmpty});
      infos.push({
        isEmpty: isQiegemubanEmpty(item),
        inputInfos: [
          getInputInfoGroup([
            getter.selectSingle("位置", getPositionOptions(), {
              disabled: false,
              hint: isPositionEmpty ? "不选位置时其他选项不生效" : ""
            }),
            getter.string("高度余量")
          ]),
          getInputInfoGroup([getter.string("起点微连"), getter.string("终点微连")]),
          getInputInfoGroup([getter.string("微连位置"), getter.string("微连长度")]),
          getInputInfoGroup([getter.boolean("依附板材边缘"), getter.boolean("删除标记线")])
        ]
      });
    }
    return infos;
  });

  refreshGroup() {
    this.group.update((g) => ({...g, qiegemubans: [...g.qiegemubans]}));
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
