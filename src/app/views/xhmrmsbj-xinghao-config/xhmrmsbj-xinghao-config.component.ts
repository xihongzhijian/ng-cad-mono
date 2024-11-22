import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, model, output, signal} from "@angular/core";
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
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {isEqual} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";

@Component({
  selector: "app-xhmrmsbj-xinghao-config",
  imports: [NgScrollbarModule, SuanliaogongshiComponent, TableComponent],
  templateUrl: "./xhmrmsbj-xinghao-config.component.html",
  styleUrl: "./xhmrmsbj-xinghao-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XhmrmsbjXinghaoConfigComponent {
  private bjmk = inject(BjmkStatusService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  dataIn = model.required<XhmrmsbjData | null>({alias: "data"});
  dataChange = output<XhmrmsbjData | null>();

  data = signal<XhmrmsbjData | null>(null);
  dataEff = effect(async () => {
    const data = this.dataIn();
    if (!data) {
      this.data.set(null);
      return;
    }
    const options = await this.bjmk.xinghaoOptionsManager.fetch();
    const config = data.xinghaoConfig;
    const options2 = config.选项;
    config.选项 = [];
    for (const name of Object.keys(options)) {
      const optionFound = options2.find((v) => v.名字 === name);
      if (optionFound) {
        config.选项.push(optionFound);
      } else {
        config.选项.push({名字: name, 可选项: []});
      }
    }
    this.data.set(data);
    if (!isEqual(config.选项, options2)) {
      this.refreshData();
    }
  });
  refreshData() {
    let data = this.data();
    if (data) {
      data = data.clone();
    }
    this.data.set(data);
    this.dataChange.emit(data);
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
}
