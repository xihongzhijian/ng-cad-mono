import {ChangeDetectionStrategy, Component, computed, forwardRef, inject, Inject, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CadLine} from "@lucilor/cad-viewer";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellEvent, ItemGetter, TableRenderInfo} from "@modules/table/components/table/table.types";
import {cloneDeep} from "lodash";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {getOpenDialogFunc} from "../dialog.common";

type RawData = CadLine;
type RawDataLeft = RawData["tiaojianquzhi"][0];
type RawDataRight = RawDataLeft["data"][0];

@Component({
  selector: "app-cad-line-tjqz",
  templateUrl: "./cad-line-tjqz.component.html",
  styleUrls: ["./cad-line-tjqz.component.scss"],
  imports: [MatButtonModule, SpinnerComponent, forwardRef(() => TableComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadLineTjqzComponent {
  private console = inject(CadConsoleService);
  private message = inject(MessageService);

  loaderId = "cadLineTiaojianquzhiSavingCad";
  openSelection = {type: "", index: -1};

  newItemLeft: ItemGetter<RawDataLeft> = (rowIdx: number) => ({key: "", level: rowIdx + 1, type: "数值", data: []});

  constructor(
    public dialogRef: MatDialogRef<CadLineTjqzComponent, RawData>,
    @Inject(MAT_DIALOG_DATA) public data: RawData
  ) {}

  submit() {
    if (!this.tableLeft()?.isVaild()) {
      this.message.alert("当前数据存在错误");
    } else {
      this.data.tiaojianquzhi = this.infoLeft().data;
      this.console.execute("save", {loaderId: this.loaderId});
    }
  }

  async close() {
    const str1 = JSON.stringify(this.data.tiaojianquzhi);
    const str2 = JSON.stringify(this.infoLeft().data);
    if (str1 !== str2) {
      const yes = await this.message.confirm("是否放弃所作修改?");
      if (!yes) {
        return;
      }
    }
    this.dialogRef.close();
  }

  setOpenSelection(item: RawDataLeft, rowIdx: number) {
    const {type} = item;
    this.openSelection = {type, index: type.includes("选择") ? rowIdx : -1};
  }

  infoLeft = computed(() => {
    const tiaojianquzhi = cloneDeep(this.data.tiaojianquzhi);
    const info: TableRenderInfo<RawDataLeft> = {
      data: tiaojianquzhi,
      rowSelection: {mode: "multiple"},
      columns: [
        {field: "key", name: "名字", type: "string", editable: true},
        {
          field: "level",
          name: "优先级",
          type: "number",
          editable: true,
          validators: (control) => {
            const items = tiaojianquzhi.filter((v) => v.level === control.value);
            if (items.length > 1) {
              return {优先级重复: true};
            }
            return null;
          }
        },
        {field: "type", name: "类型", type: "select", options: ["选择", "数值", "数值+选择"], editable: true}
      ],
      title: "条件取值",
      editMode: true,
      newItem: (rowIdx: number) => ({key: "", level: rowIdx + 1, type: "数值", data: []}),
      toolbarButtons: {add: true, remove: true, import: true, export: true}
      // dataTransformer: (type, data) => {
      //   if (type === "import") {
      //     let maxLevel = -Infinity;
      //     this.infoLeft.data.data.forEach((v) => (maxLevel = Math.max(maxLevel, v.level)));
      //     if (isFinite(maxLevel)) {
      //       data.forEach((v) => {
      //         v.level = ++maxLevel;
      //       });
      //     }
      //   }
      //   return data;
      // }
    };
    return info;
  });
  tableLeft = viewChild<TableComponent<RawDataLeft>>("tableLeft");
  onCellClickLeft(event: CellEvent<RawDataLeft>) {
    const {item, rowIdx} = event;
    this.infoRight.update((v) => ({...v, data: item.data}));
    this.setOpenSelection(item, rowIdx);
  }
  onCellChangeLeft(event: CellEvent<RawDataLeft>) {
    this.setOpenSelection(event.item, event.rowIdx);
  }

  infoRight = signal<TableRenderInfo<RawDataRight>>({
    data: [],
    rowSelection: {mode: "multiple"},
    columns: [
      {field: "name", name: "选项/范围", type: "string", editable: true},
      {field: "value", name: "取值", type: "string", editable: true},
      {field: "input", name: "可以输入修改", type: "boolean", editable: true}
    ],
    title: "条件取值数据",
    editMode: true,
    newItem: {name: "", value: 0, input: true},
    toolbarButtons: {add: true, remove: true, import: true, export: true}
  });
  tableRight = viewChild<TableComponent<RawDataRight>>("tableRight");
  private _openFormLock = false;
  async editCellRight(event: CellEvent<RawDataRight>) {
    if (this._openFormLock) {
      return;
    }
    this._openFormLock = true;
    const {type, index} = this.openSelection;
    if (event.column.field !== "name" || index < 0) {
      return;
    }
    const keys = this.infoLeft()
      .data[index].key.split(/;|；|,|，/)
      .filter((v) => v);
    if (keys.length < 1) {
      return;
    }
    let values: string[];
    if (event.item.name.match(/;|；/)) {
      values = event.item.name.split(/;|；/);
    } else {
      values = event.item.name.split(/,|，/);
    }
    const form = keys.map<InputInfo>((key, i) => {
      const value = values[i] ?? "";
      if (type.includes("数值") && i === 0) {
        return {type: "string", label: key, model: {key: i, data: values}, value};
      } else {
        return {
          type: "string",
          label: key,
          model: {key: i, data: values},
          value,
          optionsDialog: {optionKey: key},
          optionMultiple: true,
          optionSeparator: "*",
          selectOnly: true
        };
      }
    });
    const result = await this.message.form(form);
    if (result) {
      this.infoRight.update((v) => {
        v.data[event.rowIdx].name = values.join(";");
        return {...v};
      });
    }
    this._openFormLock = false;
  }
  onCellFocusRight(event: CellEvent<RawDataRight>) {
    this.editCellRight(event);
  }
  onCellClickRight(event: CellEvent<RawDataRight>) {
    this.editCellRight(event);
  }
}

export const openCadLineTiaojianquzhiDialog = getOpenDialogFunc<CadLineTjqzComponent, RawData, RawData>(CadLineTjqzComponent);
