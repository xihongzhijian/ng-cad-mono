import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, input, model} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {BjmkStatusService} from "@components/bujumokuai/services/bjmk-status.service";
import {ShuruTableDataSorted, XuanxiangTableData} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.types";
import {
  emptyXuanxiangItem,
  getShuruItem,
  getShuruTable,
  getXuanxiangItem,
  getXuanxiangTable
} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.utils";
import {SuanliaogongshiComponent} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {menshanKeys} from "@views/xhmrmsbj/xhmrmsbj.types";
import {XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {clone, isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {SuanliaoConfigMszjbzxs, XhmrmsbjXinghaoConfigComponentType} from "./xhmrmsbj-xinghao-config.types";
import {suanliaoMszjbzxsNames} from "./xhmrmsbj-xinghao-config.utils";

@Component({
  selector: "app-xhmrmsbj-xinghao-config",
  imports: [InputComponent, MatButtonModule, NgScrollbarModule, SuanliaogongshiComponent, TableComponent],
  templateUrl: "./xhmrmsbj-xinghao-config.component.html",
  styleUrl: "./xhmrmsbj-xinghao-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XhmrmsbjXinghaoConfigComponent {
  private bjmk = inject(BjmkStatusService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  data = model.required<XhmrmsbjData | null>({alias: "data"});
  type = input.required<XhmrmsbjXinghaoConfigComponentType | null>();

  dataEff = effect(async () => {
    const data = this.data();
    if (!data) {
      return;
    }
    const options = await this.bjmk.xinghaoOptionsManager.fetch();
    const config = data.xinghaoConfig;
    const options2 = config.选项;
    config.选项 = [];
    for (const name of Object.keys(options)) {
      const optionFound = options2?.find((v) => v.名字 === name);
      if (optionFound) {
        config.选项.push(optionFound);
      } else {
        config.选项.push({名字: name, 可选项: []});
      }
    }
    if (!isEqual(config.选项, options2)) {
      this.refreshData();
    }
  });
  refreshData() {
    this.data.update((v) => clone(v));
  }

  shurus = computed(() => this.data()?.xinghaoConfig.输入 || []);
  shuruTable = computed(() => getShuruTable(this.shurus(), {title: "型号输入"}));
  async onShuruToolbar(event: ToolbarButtonEvent) {
    switch (event.button.event) {
      case "添加": {
        const item = await getShuruItem(this.message, this.shurus());
        const data = this.data();
        if (item && data) {
          const config = data.xinghaoConfig;
          config.输入 = [...(config.输入 || []), item];
          this.refreshData();
        }
      }
    }
  }
  async onShuruRow(event: RowButtonEvent<ShuruTableDataSorted>) {
    const data = this.data();
    switch (event.button.event) {
      case "编辑":
        {
          const item = await getShuruItem(this.message, this.shurus(), event.item);
          if (item && data) {
            const config = data.xinghaoConfig;
            config.输入 = (config.输入 || []).map((v, i) => (i === event.rowIdx ? item : v));
            this.refreshData();
          }
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${event.item.名字}】吗？`)) {
          const config = data?.xinghaoConfig;
          if (config) {
            config.输入 = config.输入.filter((_, i) => i !== event.rowIdx);
            this.refreshData();
          }
        }
    }
  }

  xuanxiangs = computed(() => this.data()?.xinghaoConfig.选项 || []);
  xuanxiangTable = computed(() => getXuanxiangTable(this.xuanxiangs(), {title: "型号选项"}));
  async onXuanxiangToolbar(event: ToolbarButtonEvent) {
    const data = this.data();
    switch (event.button.event) {
      case "添加": {
        const options = await this.bjmk.xinghaoOptionsManager.fetch();
        const item = await getXuanxiangItem(this.message, options, this.xuanxiangs());
        if (item && data) {
          const config = data.xinghaoConfig;
          config.选项 = [...(config.选项 || []), item];
          this.refreshData();
        }
      }
    }
  }
  async onXuanxiangRow(event: RowButtonEvent<XuanxiangTableData>) {
    const data = this.data();
    switch (event.button.event) {
      case "编辑":
        {
          const options = await this.bjmk.xinghaoOptionsManager.fetch();
          const item = await getXuanxiangItem(this.message, options, this.xuanxiangs(), event.item);
          if (item && data) {
            const config = data.xinghaoConfig;
            config.选项 = config.选项.map((v, i) => (i === event.rowIdx ? item : v));
            this.refreshData();
          }
        }
        break;
      case "清空数据":
        if (await emptyXuanxiangItem(this.message, event.item)) {
          const config = data?.xinghaoConfig;
          if (config) {
            config.选项 = [...config.选项];
            this.refreshData();
          }
        }
    }
  }

  gongshis = computed(() => this.data()?.xinghaoConfig.公式 || []);
  slgsInfo = computed<SuanliaogongshiInfo>(() => ({data: {算料公式: this.gongshis()}, slgs: {title: "型号公式"}}));
  onSlgsChange() {
    this.refreshData();
  }

  suanliaoMszjbzxses = computed(() => this.data()?.xinghaoConfig.算料单配置?.门扇中间标注显示 || []);
  suanliaoMszjbzxsInfos = computed(() => {
    const infos: {item: SuanliaoConfigMszjbzxs; inputInfos: InputInfo[]}[] = [];
    for (const item of this.suanliaoMszjbzxses()) {
      const getter = new InputInfoWithDataGetter(item);
      const onChange = () => {
        this.refreshData();
      };
      infos.push({
        item,
        inputInfos: [
          getter.selectMultiple("显示位置", menshanKeys.slice(), {onChange}),
          getter.object("选项", {onChange, optionType: "选项", optionMultiple: true, optionsDialog: {}}),
          getter.array("条件", {onChange})
        ]
      });
    }
    return infos;
  });
  async addSuanliaoMszjbzxs() {
    const data = this.data();
    if (!data) {
      return;
    }
    const suanliaoConfig = data.xinghaoConfig.算料单配置;
    const result = await this.message.prompt({
      type: "select",
      label: "名字",
      options: suanliaoMszjbzxsNames,
      validators: [Validators.required]
    });
    if (!result) {
      return;
    }
    suanliaoConfig.门扇中间标注显示 = [...suanliaoConfig.门扇中间标注显示, {名字: result, 显示位置: [], 选项: {}, 条件: []}];
    this.refreshData();
  }
  async removeSuanliaoMszjbzxs(index: number) {
    const data = this.data();
    if (!data) {
      return;
    }
    const suanliaoConfig = data.xinghaoConfig.算料单配置;
    const item = suanliaoConfig.门扇中间标注显示[index];
    if (!item) {
      return;
    }
    if (!(await this.message.confirm(`确定删除【${item.名字}】吗？`))) {
      return;
    }
    suanliaoConfig.门扇中间标注显示 = suanliaoConfig.门扇中间标注显示.filter((_, i) => i !== index);
    this.refreshData();
  }
}
