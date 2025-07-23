import {Component, computed, HostBinding, inject, viewChildren} from "@angular/core";
import {AbstractControl, ValidatorFn} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {cadDimensionOptions} from "@app/cad/options";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadDimensionLinear} from "@lucilor/cad-viewer";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter, validateForm} from "@modules/input/components/input.utils";
import {isEmpty} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";

export interface CadDimensionData {
  data: CadDimensionLinear;
}

@Component({
  selector: "app-cad-dimension-form",
  templateUrl: "./cad-dimension-form.component.html",
  styleUrls: ["./cad-dimension-form.component.scss"],
  imports: [InputComponent, MatButtonModule, NgScrollbar]
})
export class CadDimensionFormComponent {
  dialogRef = inject<MatDialogRef<CadDimensionFormComponent, CadDimensionLinear>>(MatDialogRef);
  data: CadDimensionData = inject<CadDimensionData>(MAT_DIALOG_DATA, {optional: true}) ?? {data: new CadDimensionLinear()};

  @HostBinding("class") class = "ng-page";

  dimensionPrev: CadDimensionLinear;
  dimensionCurr: CadDimensionLinear;

  constructor() {
    const dimension = this.data.data || new CadDimensionLinear();
    this.dimensionPrev = dimension;
    this.dimensionCurr = dimension.clone();
  }

  cadDimensionOptions = cadDimensionOptions;
  mqValidator(): ValidatorFn {
    return () => {
      const dimension = this.dimensionCurr;
      if (dimension.qujian || dimension.mingzi) {
        return null;
      }
      return {mqNull: "区间和名字不能同时为空"};
    };
  }
  qujianValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const err = {qujian: "区间应有且仅有一个~或-，且该符号不位于开头或结尾。"};
      return !control.value || control.value.match(/^[^-~]+(-|~)[^-~]+$/) ? null : err;
    };
  }
  inputInfos = computed(() => {
    const dimension = this.dimensionCurr;
    const getter = new InputInfoWithDataGetter(dimension, {clearable: true});
    const getter2 = new InputInfoWithDataGetter(dimension.entity1, {clearable: true});
    const getter3 = new InputInfoWithDataGetter(dimension.entity2, {clearable: true});
    const nameInput = getter.string("mingzi", {
      label: "名字",
      validators: this.mqValidator(),
      onChange: () => {
        qujianInput.forceValidateNum = (qujianInput.forceValidateNum || 0) + 1;
      }
    });
    const qujianInput = getter.string("qujian", {
      label: "区间",
      validators: [this.mqValidator(), this.qujianValidator()],
      onChange: () => {
        nameInput.forceValidateNum = (nameInput.forceValidateNum || 0) + 1;
      }
    });
    const infos: InputInfo[] = [
      nameInput,
      getter.string("活动标注显示扣数"),
      getter.string("xianshigongshiwenben", {label: "显示公式文本"}),
      qujianInput,
      getter.string("cad1", {label: "CAD1", readonly: true}),
      getter.string("cad2", {label: "CAD2", readonly: true}),
      getter2.selectSingle("location", cadDimensionOptions.location.values, {label: "线1位置"}),
      getter3.selectSingle("location", cadDimensionOptions.location.values, {label: "线2位置"}),
      getter.selectSingle("axis", cadDimensionOptions.axis.values, {label: "方向"}),
      getter.selectSingle("ref", cadDimensionOptions.ref.values),
      getter.number("distance", {label: "距离"}),
      {
        type: "number",
        label: "字体大小",
        value: dimension.style.text?.size,
        onChange: (val) => {
          dimension.setStyle({text: {size: val}});
        }
      },
      getter.string("quzhifanwei", {label: "取值范围"}),
      getter.boolean("hideDimLines", {label: "隐藏尺寸线", appearance: "checkbox"}),
      getter.selectSingle("xiaoshuchuli", cadDimensionOptions.xiaoshuchuli.values, {label: "小数处理"}),
      getter.boolean("算料单缩放标注文字")
    ];
    return infos;
  });

  inputComponents = viewChildren(InputComponent);
  async submit() {
    const result = validateForm(this.inputComponents());
    if (isEmpty((await result).errors)) {
      Object.assign(this.dimensionPrev, this.dimensionCurr);
      this.dialogRef.close(this.dimensionPrev);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}

export const openCadDimensionFormDialog = getOpenDialogFunc<CadDimensionFormComponent, CadDimensionData, CadDimensionLinear>(
  CadDimensionFormComponent,
  {width: "50%", height: "80%"}
);
