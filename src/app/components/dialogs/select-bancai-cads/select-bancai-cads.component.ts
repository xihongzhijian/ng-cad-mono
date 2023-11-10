import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {isBetween} from "@lucilor/utils";
import {BancaiCadExtend} from "@views/select-bancai/select-bancai.types";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-select-bancai-cads",
  templateUrl: "./select-bancai-cads.component.html",
  styleUrls: ["./select-bancai-cads.component.scss"]
})
export class SelectBancaiCadsComponent {
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

  get checkedCads() {
    const checkedCads: BancaiCadExtend[] = [];
    for (const cad of this.getAllCads()) {
      if (cad.checked) {
        checkedCads.push(cad);
      }
    }
    return checkedCads;
  }

  get isSubmitDisabled() {
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
    return !isBetween(this.checkedCads.length, min, max, true);
  }

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
  }

  selectAll() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, true);
    }
  }

  unselectAll() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, false);
    }
  }

  selectReverse() {
    for (const cad of this.getAllCads()) {
      this.setCadChecked(cad, !cad.checked);
    }
  }

  disable() {
    for (const cad of this.getAllCads()) {
      cad.disabled = cad.checked;
    }
  }

  enable() {
    for (const cad of this.getAllCads()) {
      cad.disabled = !cad.checked;
    }
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
