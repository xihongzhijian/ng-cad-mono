import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, signal} from "@angular/core";
import {toSignal} from "@angular/core/rxjs-interop";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbar} from "ngx-scrollbar";
import {Jiaowei, jiaoweiAnchorOptions, JiaoweiDataItem, JiaoweiTableData} from "./jiaowei";

const table = "p_menjiao";

@Component({
  selector: "app-jiaowei",
  templateUrl: "./jiaowei.component.html",
  styleUrls: ["./jiaowei.component.scss"],
  imports: [InputComponent, MatButtonModule, MatCheckboxModule, NgScrollbar],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiaoweiComponent {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);

  @HostBinding("class") class = "ng-page";

  constructor() {
    setGlobal("jiaowei", this);
  }

  name = signal("");
  jiaowei = signal(new Jiaowei());

  queryParams = toSignal(this.route.queryParams);
  refreshEff = effect(async () => {
    const {id} = this.queryParams() || {};
    const data = await this.http.queryMySql<JiaoweiTableData>({table, filter: {where: {vid: id}}});
    let jiaowei: Jiaowei | undefined;
    try {
      if (data[0]?.jiaowei) {
        this.name.set(data[0].mingzi);
        jiaowei = new Jiaowei(JSON.parse(data[0].jiaowei || ""));
      }
    } catch (error) {
      console.error(error);
      this.message.error("数据格式错误");
    }
    if (!jiaowei) {
      return;
    }
    for (const num of ["2", "3", "4", "5"]) {
      if (!jiaowei.data[num]) {
        jiaowei.addItem({条件: [`门铰数量==${num}`]});
      }
    }
    this.jiaowei.set(jiaowei);
  });

  items = computed(() => {
    const data = this.jiaowei().data;
    const items: {key: string; inputInfoGroups: {name: string; infos: InputInfo[]}[]}[] = [];
    for (const [key, value] of Object.entries(data)) {
      const getter = new InputInfoWithDataGetter(value);
      const updateDisabled = () => {
        const {disabled} = value;
        for (const group of item.inputInfoGroups) {
          if (group.name) {
            for (const info of group.infos) {
              info.disabled = disabled;
            }
          }
        }
      };
      const item: (typeof items)[number] = {
        key,
        inputInfoGroups: [
          {
            name: "",
            infos: [
              getter.boolean("disabled", {
                label: `不做${key}个铰`,
                appearance: "checkbox",
                onChange: () => {
                  updateDisabled();
                }
              })
            ]
          }
        ]
      };
      for (const [i, item2] of value.items.entries()) {
        const getter2 = new InputInfoWithDataGetter(item2, {style: {flex: "0 1 auto"}});
        const updateDisabled2 = () => {
          if (distanceInput.disabled) {
            return;
          }
          distanceInput.disabled = item2.anchor === "剩余平分";
        };
        const anchorInput = getter2.selectSingle("anchor", this.getJiaoweiAnchorOptions(value, i), {
          label: "",
          onChange: () => updateDisabled2(),
          style: {width: "130px"}
        });
        const distanceInput = getter2.numberWithUnit("distance", "mm", {label: "", style: {width: "100px"}});
        updateDisabled2();
        item.inputInfoGroups.push({
          name: `铰位${i + 1}中⼼Y距离`,
          infos: [anchorInput, distanceInput]
        });
      }
      updateDisabled();
      items.push(item);
    }
    return items;
  });

  submit() {
    const {id} = this.route.snapshot.queryParams;
    const data: TableUpdateParams<JiaoweiTableData>["data"] = {vid: id};
    data.jiaowei = JSON.stringify(this.jiaowei().export());
    this.http.tableUpdate({table, data});
  }

  getJiaoweiAnchorOptions(item: JiaoweiDataItem, i: number) {
    const total = item.items.length;
    if (total > 3 && i < total - 1) {
      return jiaoweiAnchorOptions;
    }
    return jiaoweiAnchorOptions.filter((v) => v !== "剩余平分");
  }
}
