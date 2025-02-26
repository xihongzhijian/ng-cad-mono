import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {ActivatedRoute, Router} from "@angular/router";
import {session, setGlobal, timer} from "@app/app.common";
import {PrintTableComponent} from "@components/print-table/print-table.component";
import {LvxingcaiyouhuaInfo, TableInfoData} from "@components/print-table/print-table.types";
import {queryString, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CalcResultItem, InputData, LvxingcaiFilterForm, OutputData, 优化结果, 铝型材优化结果} from "./lvxingcaiyouhua.types";
import {calc, getInputDataBoms, getNum} from "./lvxingcaiyouhua.utils";

@Component({
  selector: "app-lvxingcaiyouhua",
  imports: [InputComponent, MatButtonModule, MatIconModule, NgScrollbarModule, PrintTableComponent],
  templateUrl: "./lvxingcaiyouhua.component.html",
  styleUrl: "./lvxingcaiyouhua.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LvxingcaiyouhuaComponent implements OnInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @HostBinding("class") class = "ng-page";

  ngOnInit() {
    setGlobal("lvxingcaiyouhua", this);
    this.route.queryParams.subscribe(() => this.onQueryParamsChange());
  }

  async onQueryParamsChange() {
    const {optimizeCode} = this.route.snapshot.queryParams;
    if (optimizeCode) {
      this.code.set(optimizeCode);
      await this.getOptimizeData();
      await this.setOptimizeData();
    }
  }

  youhuaInfo = signal<LvxingcaiyouhuaInfo>({tableInfoData: null});
  printTableComponent = viewChild(PrintTableComponent<{BOM唯一码: string; 数量: number}>);

  private _youhuaInfoHiddenKey = "lvxingcaiyouhuaYouhuaInfoHidden";
  youhuaInfoHidden = signal(session.load<boolean>(this._youhuaInfoHiddenKey) || false);
  youhuaInfoHiddenEff = effect(() => {
    session.save(this._youhuaInfoHiddenKey, this.youhuaInfoHidden());
  });

  selectAllBoms() {
    const tables = this.printTableComponent()?.tables();
    if (!tables) {
      return;
    }
    const isAllSelected = tables.every((table) => table.isAllSelected());
    for (const table of tables) {
      if (isAllSelected) {
        table.deselectAllRows();
      } else {
        table.selectAllRows();
      }
    }
  }

  code = signal("");
  inputData = signal<InputData | null>(null);
  outputData = signal<OutputData | null>(null);
  calcResult = signal<{result: OutputData; duration: number} | null>(null);
  calcResult2 = signal<{result: OutputData; duration: number} | null>(null);
  calc() {
    const input = this.inputData();
    if (!input) {
      this.message.error("没有数据");
      return;
    }

    const pt = this.printTableComponent();
    if (pt && this.calcResult()) {
      input.不上设备的型材BOM = [];
      for (const table of pt.tables()) {
        const selectedIds = table.getSelectedItems().map((v) => v.BOM唯一码);
        for (const item of table.info.data) {
          if (!selectedIds.includes(item.BOM唯一码)) {
            input.不上设备的型材BOM.push({BOM唯一码: item.BOM唯一码, 要求数量: item.数量});
          }
        }
      }
    }

    const timerKey = "铝型材优化";
    timer.start(timerKey);
    const output = calc(input);
    const duration = getNum(timer.getDuration(timerKey) || -1);
    console.log({input, output});
    timer.end(timerKey, timerKey);
    this.calcResult.set({result: output, duration});

    if (!this.calcResult2()) {
      if ((input.不上设备的型材BOM || []).length < 1) {
        this.calcResult2.set({result: output, duration});
      } else {
        const timerKey2 = "铝型材优化2";
        timer.start(timerKey2);
        const output2 = calc({...input, 不上设备的型材BOM: []});
        const duration2 = getNum(timer.getDuration(timerKey2) || -1);
        timer.end(timerKey2, timerKey2);
        this.calcResult2.set({result: output2, duration: duration2});
      }
    }
  }

  xingcaiDiaplayKeys = signal<(keyof 铝型材优化结果)[]>(["型材", "余料入库最小长度", "头尾损耗", "切断损耗"]);

  private _filterOutputKey = "lvxingcaiFilterForm";
  filterOutput = signal(session.load<LvxingcaiFilterForm>(this._filterOutputKey) || {型材: ""});
  filterOutputEff = effect(() => {
    session.save(this._filterOutputKey, this.filterOutput());
  });
  filterOutputInputInfos = computed(() => {
    const filterForm = this.filterOutput();
    const infos: InputInfo[] = [
      {
        type: "string",
        label: "搜索：型材",
        value: filterForm.型材,
        clearable: true,
        onInput: debounce((型材) => {
          this.filterOutput.set({...filterForm, 型材});
        }, 100)
      }
    ];
    return infos;
  });
  calcResultItemsAll = signal<CalcResultItem[]>([]);
  calcResultItemsAllEff = effect(() => {
    const reuslt = this.calcResult()?.result.铝型材优化结果 || [];
    this.calcResultItemsAll.set(reuslt.map((v) => ({...v, showDetails: true})));
  });
  calcResultItems = computed(() => {
    const form = this.filterOutput();
    const itemsAll = this.calcResultItemsAll();
    if (Object.values(form).every((v) => !v)) {
      return itemsAll;
    }
    return itemsAll.filter((item) => {
      if (!queryString(form.型材, item.型材)) {
        return false;
      }
      return true;
    });
  });
  toggleCalcResultItemShowDetails(index: number) {
    const item = this.calcResultItems()[index];
    item.showDetails = !item.showDetails;
    this.calcResultItemsAll.update((v) => [...v]);
  }

  async getOptimizeDataCode() {
    const code = await this.message.prompt({type: "string", label: "订单号", value: this.code(), validators: Validators.required});
    if (!code) {
      return;
    }
    this.router.navigate([], {queryParams: {optimizeCode: code}, queryParamsHandling: "merge"});
  }
  async getOptimizeData() {
    const code = this.code();
    const data = await this.http.getData<InputData>("order/lvxingcai/getOptimizeData", {code});
    if (!data) {
      return;
    }
    this.inputData.set(data);
  }
  async setOptimizeData() {
    this.calc();
    const code = this.code();
    const optimizeData = this.calcResult()?.result.铝型材优化结果;
    if (!code || !optimizeData) {
      return;
    }
    const inputData = this.inputData();
    const pt = this.printTableComponent();
    if (!inputData || !pt) {
      return;
    }
    const bushangshebeidexingcaibom = inputData.不上设备的型材BOM || [];
    const quanbuliaodeyouhuashuju = this.calcResult2()?.result.铝型材优化结果;
    const data = await this.http.getData<{优化工单: TableInfoData}>("order/lvxingcai/saveOptimizeResult", {
      code,
      optimizeData,
      bushangshebeidexingcaibom,
      quanbuliaodeyouhuashuju
    });
    this.youhuaInfo.set({tableInfoData: data?.优化工单 || null});
    await timeout(0);
    const bomIds = getInputDataBoms(inputData).map((v) => v.BOM唯一码);
    for (const table of pt.tables()) {
      table.setSelectedItems(table.info.data.filter((v) => bomIds.includes(v.BOM唯一码)));
    }
  }
  async unsetOptimizeData() {
    const code = this.code();
    await this.http.post("order/lvxingcai/cancelOptimizeBars", {code});
  }

  getTypeStr(item: 优化结果) {
    let str = item.型材类型;
    if (item.型材类型 !== "余料") {
      return str;
    }
    str += `,${item.库存位置编码},库存码${item.库存码}`;
    return str;
  }
  getLengthsStr(item: 优化结果) {
    const str = item.BOM.map(({型材长度, 要求数量}) => (要求数量 > 1 ? `${型材长度}*${要求数量}` : 型材长度)).join("+");
    return `${item.物料长度}=${str}`;
  }
}
