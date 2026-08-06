import {Component, computed, HostBinding, inject, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {Cad数据要求} from "@app/cad/cad-shujuyaoqiu";
import {exportCadData} from "@app/cad/utils";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MongodbDataBase} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {AppStatusService} from "@services/app-status.service";
import {isNil} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";

@Component({
  selector: "app-custom-mark-lines",
  imports: [CadItemComponent, InputComponent, MatButtonModule, NgScrollbarModule],
  templateUrl: "./custom-mark-lines.component.html",
  styleUrl: "./custom-mark-lines.component.scss"
})
export class CustomMarkLinesComponent implements OnInit {
  private http = inject(CadDataService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  cadType = "标记线模板";
  cadYaoqiu = signal<Cad数据要求 | undefined>(undefined);
  items = signal<ConfigItem[]>([]);
  async ngOnInit() {
    const [cadYaoqiu, items] = await Promise.all([
      this.status.fetchAndGetCadYaoqiu(this.cadType, false, new Cad数据要求({vid: 1, mingzi: ""})),
      this.http.getData<ConfigItemRaw[]>("ngcad/getCustomMarkLineItems")
    ]);
    if (cadYaoqiu) {
      this.cadYaoqiu.set(cadYaoqiu);
    }
    if (items) {
      this.items.set(items.map((v) => ({...v, cadData: v.cadData ? new CadData(v.cadData) : undefined})));
    }
  }

  inputInfoGroups = computed<InputInfo[][]>(() => {
    const items = this.items();
    return items.map((item) => {
      const infos: InputInfo[] = [];
      const getter = new InputInfoWithDataGetter(item);
      if (isNil(item.anchor)) {
        item.anchor = [0.5, 0];
      }
      infos.push(getter.coordinate("anchor", {label: "锚点", compact: true}));
      return infos;
    });
  });

  addCadData(item: ConfigItem) {
    const data = new CadData();
    data.name = item.name;
    data.type = this.cadType;
    item.cadData = data;
    this.items.update((v) => [...v]);
  }
  removeCadData(item: ConfigItem) {
    delete item.cadData;
    this.items.update((v) => [...v]);
  }

  async submit() {
    const items = this.items().map((v) => ({...v, cadData: v.cadData ? exportCadData(v.cadData) : undefined}));
    await this.http.post("ngcad/setCustomMarkLineItems", {items});
  }
}

interface ConfigItemRaw extends MongodbDataBase {
  name: string;
  cadData?: ObjectOf<any>;
  anchor?: [number, number];
}
interface ConfigItem extends ConfigItemRaw {
  cadData?: CadData;
}
