import {booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input} from "@angular/core";
import {CadEntity} from "@lucilor/cad-viewer";
import {Subscribed} from "@mixins/subscribed.mixin";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {AppStatusService} from "@services/app-status.service";

@Component({
  selector: "app-cad-layer-input[entities]",
  templateUrl: "./cad-layer-input.component.html",
  styleUrls: ["./cad-layer-input.component.scss"],
  imports: [InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadLayerInputComponent extends Subscribed() {
  status = inject(AppStatusService);

  entities = input<CadEntity[]>([]);
  disabled = input(false, {transform: booleanAttribute});

  layerText = computed(() => {
    const names = new Set(this.entities().map((e) => e.layer));
    if (names.size === 1) {
      return names.values().next().value;
    }
    return "";
  });
  layerOptions = computed<string[]>(() => {
    const data = this.status.cadData();
    const layerNames = new Set(["不显示", "跳过判断封闭图形", "微连", "分页线"]);
    const layerNamesExclude = new Set(["Defpoints", "走线", "开料额外信息", "打孔", "展开长标注", "line-info", "导入错误信息"]);
    data.layers.forEach((layer) => {
      const name = layer.name;
      if (!layerNamesExclude.has(name)) {
        layerNames.add(name);
      }
    });
    data.entities.forEach((e) => {
      if (e.layer) {
        layerNames.add(e.layer);
      }
    }, true);
    return Array.from(layerNames);
  });
  layerNameInputInfo = computed<InputInfo>(() => {
    const value = this.layerText();
    const options = this.layerOptions();
    const disabled = this.disabled();
    return {
      type: "string",
      label: "图层",
      value,
      options,
      fixedOptions: options,
      disabled,
      onChange: (val) => {
        this.entities().forEach((e) => (e.layer = val));
      }
    };
  });
}
