import {ChangeDetectionStrategy, Component, computed, forwardRef, HostBinding, inject, Inject, signal} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FetchManager} from "@app/utils/fetch-manager";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {OptionsDialog} from "@modules/input/components/input.types";
import {convertOptions, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {TableRenderInfo} from "@modules/table/components/table/table.types";
import {cloneDeep} from "lodash";
import {CadMenfengConfigInput, CadMenfengConfigItem, CadMenfengConfigOutput} from "./cad-menfeng-config.utils";

@Component({
  selector: "app-cad-menfeng-config",
  imports: [MatButtonModule, forwardRef(() => TableComponent)],
  templateUrl: "./cad-menfeng-config.component.html",
  styleUrl: "./cad-menfeng-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadMenfengConfigComponent {
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  constructor(
    public dialogRef: MatDialogRef<CadMenfengConfigComponent, CadMenfengConfigOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadMenfengConfigInput
  ) {}

  items = signal<CadMenfengConfigItem[]>(cloneDeep(this.data.items || []));
  menfengName = computed(() => this.data.type + "门缝");

  optionsMultiFetchManager = new FetchManager({}, async () => this.http.getOptionsMulti({names: ["产品分类", "开启"]}));

  async getMenfengConfigItem(item?: CadMenfengConfigItem) {
    let item2: Omit<CadMenfengConfigItem, "门缝"> & {门缝?: number};
    if (item) {
      item2 = cloneDeep(item);
    } else {
      item2 = {产品分类: [], 开启: []};
    }
    const getter = new InputInfoWithDataGetter(item2);
    const optionsMulti = await this.optionsMultiFetchManager.fetch();
    const getOptions = (name: string) => convertOptions(optionsMulti[name] || []);
    const optionsDialog: OptionsDialog = {useLocalOptions: true, optionsUseId: true};
    const result = await this.message.form([
      getter.selectMultiple("产品分类", getOptions("产品分类"), {optionsDialog}),
      getter.selectMultiple("开启", getOptions("开启"), {optionsDialog}),
      getter.number("门缝", {label: this.menfengName(), validators: Validators.required})
    ]);
    return result ? (item2 as CadMenfengConfigItem) : null;
  }
  async addMenfengConfigItem() {
    const item = await this.getMenfengConfigItem();
    if (item) {
      this.items.update((v) => [...v, item]);
    }
  }
  async editMenfengConfigItem(index: number) {
    const itemOld = this.items()[index];
    const item = await this.getMenfengConfigItem(itemOld);
    if (item) {
      this.items.update((v) => {
        v[index] = item;
        return [...v];
      });
    }
  }
  async removeMenfengConfigItem(index: number) {
    if (!(await this.message.confirm(`确定删除吗？`))) {
      return;
    }
    this.items.update((v) => {
      v.splice(index, 1);
      return [...v];
    });
  }

  tableInfo = computed(() => {
    const optionsMulti = this.optionsMultiFetchManager.data();
    const getOptionStr = (key: string, ids: string[]) => {
      const options = optionsMulti[key] || [];
      const arr: string[] = [];
      for (const id of ids) {
        const option = options.find((v) => String(v.vid) === id);
        if (option) {
          arr.push(option.label || option.name);
        }
      }
      return arr.join(", ");
    };
    const info: TableRenderInfo<CadMenfengConfigItem & {操作?: boolean}> = {
      title: "",
      data: this.items(),
      toolbarButtons: {
        extra: [{event: "add", title: "添加", onClick: () => this.addMenfengConfigItem()}]
      },
      columns: [
        {field: "产品分类", type: "string", getString: (v) => getOptionStr("产品分类", v.产品分类)},
        {field: "开启", type: "string", getString: (v) => getOptionStr("开启", v.开启)},
        {field: "门缝", type: "number", name: this.menfengName()},
        {
          field: "操作",
          type: "button",
          buttons: [
            {event: "edit", title: "编辑", onClick: ({rowIdx}) => this.editMenfengConfigItem(rowIdx)},
            {event: "remove", title: "删除", onClick: ({rowIdx}) => this.removeMenfengConfigItem(rowIdx)}
          ]
        }
      ]
    };
    return info;
  });

  submit() {
    const items = this.items();
    this.dialogRef.close({items});
  }
  cancel() {
    this.dialogRef.close();
  }
}

export const openCadMenfengConfigDialog = getOpenDialogFunc<CadMenfengConfigComponent, CadMenfengConfigInput, CadMenfengConfigOutput>(
  CadMenfengConfigComponent,
  {
    width: "80vw",
    height: "80vh"
  }
);
