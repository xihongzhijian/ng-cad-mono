import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  HostBinding,
  inject,
  Inject,
  signal,
  viewChildren
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadData, CadLine, CadLineLike, setLinesLength, sortLines} from "@lucilor/cad-viewer";
import {InputComponent} from "@modules/input/components/input.component";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellChangeEvent} from "@modules/table/components/table/table.types";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadKailiaoConfigInput, CadKailiaoConfigOutput} from "./cad-kailiao-config.types";
import {getLineTable, getMultiSetData, getMultiSetInputInfos, MultiSetData} from "./cad-kailiao-config.utils";

@Component({
  selector: "app-cad-kailiao-config",
  imports: [forwardRef(() => InputComponent), MatButtonModule, NgScrollbarModule, TableComponent],
  templateUrl: "./cad-kailiao-config.component.html",
  styleUrl: "./cad-kailiao-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadKailiaoConfigComponent {
  message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  constructor(
    public dialogRef: MatDialogRef<CadKailiaoConfigComponent, CadKailiaoConfigOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadKailiaoConfigInput
  ) {}

  cad = signal<CadData>(new CadData());
  cadEff = effect(() => {
    this.cad.set(this.data.cad.clone());
  });

  lineGroups = computed(() => sortLines(this.cad()));
  lineTables = computed(() => this.lineGroups().map((v) => getLineTable(v)));
  lineTableComponents = viewChildren<TableComponent<CadLineLike>>("lineTables");
  refreshTable() {
    for (const info of this.lineTables()) {
      info.data = [...info.data];
    }
  }
  onCellChange(event: CellChangeEvent<CadLineLike>, i: number) {
    const lines = this.lineGroups()[i];
    const line = lines[event.rowIdx];
    switch (event.column.field) {
      case "length":
        if (line instanceof CadLine) {
          setLinesLength(this.cad(), [line], event.value);
        } else {
          this.message.error("只能修改直线的长度");
        }
    }
    this.refreshTable();
  }

  multiSetData = signal<MultiSetData>(getMultiSetData());
  multiSetInputInfos = computed(() => getMultiSetInputInfos(this.multiSetData));
  resetMultiSetData() {
    this.multiSetData.set(getMultiSetData());
  }
  multiSet() {
    const data = this.multiSetData();
    let isChanged = false;
    for (const table of this.lineTableComponents()) {
      for (const item of table.getSelectedRows()) {
        item.zhankaifangshi = data.展开方式;
        item.zidingzhankaichang = data.指定展开长;
        isChanged = true;
      }
    }
    if (isChanged) {
      this.refreshTable();
    } else {
      this.message.error("没有选中线");
    }
  }

  submit() {
    this.dialogRef.close({cad: this.cad()});
  }
  cancel() {
    this.dialogRef.close();
  }
}

export const openCadKailiaoConfigDialog = getOpenDialogFunc<CadKailiaoConfigComponent, CadKailiaoConfigInput, CadKailiaoConfigOutput>(
  CadKailiaoConfigComponent,
  {width: "80%", height: "80%"}
);
