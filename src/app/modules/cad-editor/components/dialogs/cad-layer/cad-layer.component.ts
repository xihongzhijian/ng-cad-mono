import {Component, Inject, QueryList, ViewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadLayer} from "@lucilor/cad-viewer";
import {queryString} from "@lucilor/utils";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";

@Component({
  selector: "app-cad-layer",
  templateUrl: "./cad-layer.component.html",
  styleUrls: ["./cad-layer.component.scss"],
  standalone: true,
  imports: [InputComponent, NgScrollbar, MatButtonModule, MatIconModule]
})
export class CadLayerComponent {
  layers: CadLayer[] = [];
  forms: {infos: InputInfo[][]; hidden: boolean}[] = [];
  layerFilterString = "";
  layerFilterInputInfo: InputInfo = {
    type: "string",
    label: "搜索图层",
    model: {data: this, key: "layerFilterString"},
    onInput: debounce(() => {
      this.filterLayers();
    }, 500)
  };

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
      const infos: InputInfo[][] = [
        [
          {
            label: "名字",
            type: "string",
            model: {data: layer, key: "name"},
            validators: [
              Validators.required,
              (control) => {
                const name = control.value;
                const layers = this.layers.filter((v) => v.name === name);
                if (layers.length > 1) {
                  return {名字重复: "名字重复"};
                }
                return null;
              }
            ]
          },
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
      this.forms.push({infos, hidden: false});
    }
    this.filterLayers();
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

  filterLayers() {
    const needle = this.layerFilterString;
    for (const [i, form] of this.forms.entries()) {
      const layer = this.layers[i];
      form.hidden = !queryString(needle, layer.name);
    }
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
