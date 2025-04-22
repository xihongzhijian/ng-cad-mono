import {ChangeDetectorRef, Component, computed, inject, Inject, signal} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {isBetween} from "@lucilor/utils";
import {BancaiCadExtend} from "@views/select-bancai/select-bancai.types";
import {NgScrollbar} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-select-bancai-cads",
  templateUrl: "./select-bancai-cads.component.html",
  styleUrls: ["./select-bancai-cads.component.scss"],
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatDialogActions, MatDividerModule, MatSlideToggleModule, NgScrollbar]
})
export class SelectBancaiCadsComponent {
  private cd = inject(ChangeDetectorRef);

  noPaiban = false;

  constructor(
    public dialogRef: MatDialogRef<SelectBancaiCadsComponent, SelectBancaiCadsOutput>,
    @Inject(MAT_DIALOG_DATA) public data: SelectBancaiCadsInput
  ) {
    if (!Array.isArray(this.data.orders)) {
      this.data.orders = [];
    }
    this.noPaiban = !!this.data.noPaiban;
  }

  *getAllCads() {
    for (const order of this.data.orders) {
      for (const group of order.cads) {
        for (const cad of group) {
          yield cad;
        }
      }
    }
  }

  checkedCadsMark = signal(0);
  checkedCads = computed(() => {
    this.checkedCadsMark();
    const checkedCads: BancaiCadExtend[] = [];
    for (const cad of this.getAllCads()) {
      if (cad.checked) {
        checkedCads.push(cad);
      }
    }
    return checkedCads;
  });

  isSubmitDisabled = computed(() => {
    const {submitLimit} = this.data;
    let min: number;
    let max: number;
    switch (typeof submitLimit) {
      case "number":
        min = max = submitLimit;
        break;
      case "object":
        min = submitLimit.min ?? 0;
        max = submitLimit.max ?? Infinity;
        break;
      default:
        min = 0;
        max = Infinity;
        break;
    }
    min = isNaN(min) ? 0 : min;
    max = isNaN(max) ? Infinity : max;
    return !isBetween(this.checkedCads().length, min, max, true);
  });

  submit() {
    this.dialogRef.close({noPaiban: this.noPaiban});
  }

  close() {
    this.dialogRef.close();
  }

  setCadChecked(cad: BancaiCadExtend, checked: boolean) {
    if (!this.data.editDisabled && cad.disabled) {
      cad.checked = false;
    } else {
      cad.checked = checked;
    }
  }

  selectOversized() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, cad.oversized);
    }
    this.cd.markForCheck();
  }

  selectAll() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, true);
    }
    this.onCheckedCadsChange();
  }

  unselectAll() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, false);
    }
    this.onCheckedCadsChange();
  }

  selectReverse() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, !cad.checked);
    }
    this.onCheckedCadsChange();
  }

  disable() {
    for (const cad of this.getAllCads()) {
      cad.disabled = cad.checked;
    }
    this.cd.markForCheck();
  }

  enable() {
    for (const cad of this.getAllCads()) {
      cad.disabled = !cad.checked;
    }
    this.cd.markForCheck();
  }

  onCheckedCadsChange() {
    this.checkedCadsMark.update((v) => v + 1);
    this.cd.markForCheck();
  }
}

export const openSelectBancaiCadsDialog = getOpenDialogFunc<SelectBancaiCadsComponent, SelectBancaiCadsInput, SelectBancaiCadsOutput>(
  SelectBancaiCadsComponent
);

export interface SelectBancaiCadsInput {
  orders: {code: string; cads: BancaiCadExtend[][]}[];
  submitBtnText?: string;
  submitLimit?: number | {min?: number; max?: number};
  editDisabled?: boolean;
  noPaiban?: boolean;
}

export interface SelectBancaiCadsOutput {
  noPaiban?: boolean;
}
