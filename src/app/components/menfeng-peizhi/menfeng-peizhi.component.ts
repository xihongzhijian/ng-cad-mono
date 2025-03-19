import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, input, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {XhmrmsbjSbjbItem} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.types";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellEvent} from "@modules/table/components/table/table.types";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {MenfengpeizhiItem} from "./menfeng-peizhi.types";
import {getMenfengPeizhiBatchReplaceTableInfo, getMenfengPeizhiTableInfo} from "./menfeng-peizhi.utils";

@Component({
  selector: "app-menfeng-peizhi",
  imports: [FloatingDialogModule, MatButtonModule, TableComponent],
  templateUrl: "./menfeng-peizhi.component.html",
  styleUrl: "./menfeng-peizhi.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenfengPeizhiComponent {
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  xinghao = input.required<MrbcjfzXinghaoInfo | null>();
  sbjbItems = input.required<XhmrmsbjSbjbItem[]>();

  xinghaoName = computed(() => this.xinghao()?.raw.mingzi);

  items = signal<MenfengpeizhiItem[]>([]);
  async fetchData() {
    const xinghao = this.xinghaoName();
    const suobianjiaobian = this.sbjbItems();
    if (!xinghao || suobianjiaobian.length < 1) {
      return;
    }
    const data = await this.http.getData<MenfengpeizhiItem[]>("shuju/api/getMenfengConfig", {xinghao, suobianjiaobian});
    this.items.set(data || []);
  }
  fetchDataEff = effect(() => this.fetchData());

  async submit() {
    if (!(await this.validate())) {
      return false;
    }
    const menfengConfig: MenfengpeizhiItem[] = [];
    const items = this.items();
    const changedRowIndex = new Set(this.dataChangeHistory().map((v) => v.i));
    for (const [i, item] of items.entries()) {
      if (changedRowIndex.has(i)) {
        menfengConfig.push(item);
      }
    }
    if (menfengConfig.length < 1) {
      return true;
    }
    const res = await this.http.post("shuju/api/updateMenfengConfig", {menfengConfig});
    if (res?.code === 0) {
      this.dataChangeHistory.set([]);
    }
    return true;
  }

  tableInfo = computed(() => {
    const info = getMenfengPeizhiTableInfo(this.items());
    info.toolbarButtons = {
      extra: [{event: "batchReplace", title: "批量替换", onClick: () => this.batchReplace()}]
    };
    return info;
  });
  tableComponent = viewChild(TableComponent<MenfengpeizhiItem>);
  dataChangeHistory = signal<{i: number; j: number}[]>([]);
  onCellChange(event: CellEvent<MenfengpeizhiItem>) {
    const history = this.dataChangeHistory().slice();
    const index = history.findIndex((v) => v.i === event.rowIdx && v.j === event.colIdx);
    if (index >= 0) {
      history.splice(index, 1);
    }
    history.push({i: event.rowIdx, j: event.colIdx});
    this.dataChangeHistory.set(history);
  }

  async validate() {
    const table = this.tableComponent();
    if (!table) {
      return true;
    }
    if (!table.isVaild()) {
      await this.message.error("错误，门缝数据不完整，请补充");
      return false;
    }
    return true;
  }

  batchReplaceItem = signal<Partial<MenfengpeizhiItem> | null>(null);
  batchReplaceTableInfo = computed(() => {
    const item = this.batchReplaceItem();
    if (item) {
      const info = getMenfengPeizhiBatchReplaceTableInfo(item);
      return info;
    } else {
      return null;
    }
  });
  batchReplace() {
    const table = this.tableComponent();
    if (!table) {
      return;
    }
    const items = table.getSelectedItems();
    if (items.length < 1) {
      this.message.alert("请先选择要批量替换的数据");
      return;
    }
    this.batchReplaceItem.set({});
  }
  submitBatchReplace() {
    const batchReplaceItem = this.batchReplaceItem();
    const table = this.tableComponent();
    if (table && batchReplaceItem) {
      const items = table.getSelectedItems();
      const fields = ["suobianmenfeng", "jiaobianmenfeng", "dingbumenfeng", "dibumenfeng"] as const;
      for (const field of fields) {
        const val = batchReplaceItem[field];
        if (typeof val === "number") {
          for (const item of items) {
            item[field] = val;
          }
        }
      }
      table.refresh();
    }
    this.closeBatchReplace();
  }
  closeBatchReplace() {
    this.batchReplaceItem.set(null);
  }
}
