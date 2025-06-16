import {Component, computed, forwardRef, inject, signal, viewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {CustomValidators} from "@app/utils/input-validators";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadLayer} from "@lucilor/cad-viewer";
import {queryString} from "@lucilor/utils";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";

@Component({
  selector: "app-cad-layer",
  templateUrl: "./cad-layer.component.html",
  styleUrls: ["./cad-layer.component.scss"],
  imports: [forwardRef(() => InputComponent), NgScrollbar, MatButtonModule, MatIconModule]
})
export class CadLayerComponent {
  dialogRef = inject<MatDialogRef<CadLayerComponent, CadLayerOutput>>(MatDialogRef);
  data: CadLayerInput = inject<CadLayerInput>(MAT_DIALOG_DATA, {optional: true}) ?? {layers: []};

  private message = inject(MessageService);

  constructor() {
    const data = this.data;

    const layers = data.layers || [];
    this.layersAll.set(layers.map((v) => v.clone()));
  }

  layersAll = signal<CadLayer[]>([]);
  layerFilterString = signal("");
  layerFilterInputInfo = computed(() => {
    const info: InputInfo = {
      type: "string",
      label: "搜索图层",
      value: this.layerFilterString(),
      onInput: debounce((val) => {
        this.layerFilterString.set(val);
      }, 500)
    };
    return info;
  });

  layers = computed(() => {
    const needle = this.layerFilterString();
    const layersAll = this.layersAll();
    return layersAll.filter((layer) => queryString(needle, layer.name));
  });

  forms = computed(() => {
    const forms: {infos: InputInfo[][]}[] = [];
    const layers = this.layers();
    const names = layers.map((v) => v.name);
    for (const layer of layers) {
      const getter = new InputInfoWithDataGetter(layer);
      const infos: InputInfo[][] = [
        [
          getter.string("name", {label: "名字", validators: [Validators.required, CustomValidators.duplicate(names)]}),
          {
            label: "颜色",
            type: "color",
            value: layer.getColor(),
            onChange: (val) => {
              layer.setColor(val);
            }
          },
          getter.number("linewidth", {label: "线宽"}),
          getter.boolean("hidden", {label: "隐藏"})
        ]
      ];
      forms.push({infos});
    }
    return forms;
  });

  inputComponents = viewChildren(forwardRef(() => InputComponent));
  submit() {
    let valid = true;
    this.inputComponents().forEach((v) => {
      v.validateValue();
      if (!v.isValid()) {
        valid = false;
      }
    });
    if (!valid) {
      this.message.error("数据有误，请检查输入");
      return;
    }
    this.dialogRef.close({layers: this.layersAll()});
  }

  cancel() {
    this.dialogRef.close();
  }

  addLayer(i?: number) {
    const layers = this.layersAll().slice();
    if (typeof i === "number") {
      layers.splice(i + 1, 0, new CadLayer());
    } else {
      layers.push(new CadLayer());
    }
    this.layersAll.set(layers);
  }

  removeLayer(i: number) {
    const layers = this.layersAll().slice();
    if (this.data.layersInUse?.find((v) => v.name === layers[i].name)) {
      this.message.error("无法删除使用中的图层");
      return;
    }
    layers.splice(i, 1);
    this.layersAll.set(layers);
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
