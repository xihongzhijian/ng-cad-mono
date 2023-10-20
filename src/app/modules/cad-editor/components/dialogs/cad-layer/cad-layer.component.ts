import {Component, Inject, QueryList, ViewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadLayer} from "@lucilor/cad-viewer";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";

@Component({
  selector: "app-cad-layer",
  templateUrl: "./cad-layer.component.html",
  styleUrls: ["./cad-layer.component.scss"]
})
export class CadLayerComponent {
  layers: CadLayer[] = [];
  forms: InputInfo[][][] = [];
  @ViewChildren(InputComponent)
  inputComponents?: QueryList<InputComponent>;

  constructor(
    public dialogRef: MatDialogRef<CadLayerComponent, CadLayerOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadLayerInput,
    private message: MessageService
  ) {
    const layers = data?.layers || [];
    this.layers = layers.map((v) => v.clone());
    this.updateForms();
  }

  updateForms() {
    this.forms = [];
    for (const layer of this.layers) {
      const form: InputInfo[][] = [
        [
          {label: "名字", type: "string", model: {data: layer, key: "name"}, validators: Validators.required},
          {
            label: "颜色",
            type: "color",
            value: layer.getColor(),
            onChange: (val) => {
              layer.setColor(val);
            }
          },
          {label: "线宽", type: "number", model: {data: layer, key: "linewidth"}},
          {label: "隐藏", type: "boolean", model: {data: layer, key: "hidden"}}
        ]
      ];
      this.forms.push(form);
    }
  }

  submit() {
    let valid = true;
    if (this.inputComponents) {
      this.inputComponents.forEach((v) => {
        v.validateValue();
        if (!v.isValid()) {
          valid = false;
        }
      });
    }
    if (!valid) {
      this.message.error("数据有误，请检查输入");
      return;
    }
    this.dialogRef.close({layers: this.layers});
  }

  cancel() {
    this.dialogRef.close();
  }

  addLayer(i?: number) {
    if (typeof i === "number") {
      this.layers.splice(i + 1, 0, new CadLayer());
    } else {
      this.layers.push(new CadLayer());
    }
    this.updateForms();
  }

  removeLayer(i: number) {
    if (this.data.layersInUse?.find((v) => v.name === this.layers[i].name)) {
      this.message.error("无法删除使用中的图层");
      return;
    }
    this.layers.splice(i, 1);
    this.updateForms();
  }
}

export interface CadLayerInput {
  layers: CadLayer[];
  layersInUse?: CadLayer[];
}

export interface CadLayerOutput {
  layers: CadLayer[];
}

export const openCadLayerDialog = getOpenDialogFunc<CadLayerComponent, CadLayerInput, CadLayerOutput>(CadLayerComponent, {
  width: "80%",
  height: "80%"
});
