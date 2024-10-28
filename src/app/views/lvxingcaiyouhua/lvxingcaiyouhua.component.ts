import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, OnInit, signal} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {ActivatedRoute, Router} from "@angular/router";
import {session, timer} from "@app/app.common";
import {queryString} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CalcResultItem, InputData, LvxingcaiFilterForm, OutputData, 优化结果} from "./lvxingcaiyouhua.types";
import {calc, getNum} from "./lvxingcaiyouhua.utils";

@Component({
  selector: "app-lvxingcaiyouhua",
  standalone: true,
  imports: [InputComponent, MatButtonModule, MatDividerModule, MatIconModule, NgScrollbarModule],
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
    this.route.queryParams.subscribe(() => this.onQueryParamsChange());
  }

  private _dataKey = "lvxingcaiyouhuaData";
  inputData = signal<InputData | null>(session.load<InputData>(this._dataKey));
  inputDataEff = effect(() => session.save(this._dataKey, this.inputData()));

  private _qiekousunhaoKey = "lvxingcaiyouhuaQiekousunhao";
  qiekousunhao = signal(session.load<number>(this._qiekousunhaoKey) || 0);
  qiekousunhaoEff = effect(() => session.save(this._qiekousunhaoKey, this.qiekousunhao()));

  async onQueryParamsChange() {
    const {optimizeCode} = this.route.snapshot.queryParams;
    if (optimizeCode) {
      this.code.set(optimizeCode);
      await this.getOptimizeData();
      this.calc();
      await this.setOptimizeData();
    }
  }

  code = signal("");
  outputData = signal<OutputData | null>(null);
  calcResult = signal<{result: OutputData; duration: number} | null>(null);
  calc() {
    const data = this.inputData();
    if (!data) {
      this.message.error("没有数据");
      return;
    }
    const timerKey = "铝型材优化";
    timer.start(timerKey);
    const result = calc(data, this.qiekousunhao());
    const duration = getNum(timer.getDuration(timerKey) || -1);
    console.log(result);
    timer.end(timerKey, timerKey);
    this.calcResult.set({result, duration});
  }

  private _filterFormKey = "lvxingcaiFilterForm";
  filterForm = signal(session.load<LvxingcaiFilterForm>(this._filterFormKey) || {型材: ""});
  filterFormEff = effect(() => session.save(this._filterFormKey, this.filterForm()));
  filterInputInfos = computed(() => {
    const filterForm = this.filterForm();
    const infos: InputInfo[] = [
      {
        type: "string",
        label: "搜索：型材",
        value: filterForm.型材,
        clearable: true,
        onInput: debounce((型材) => this.filterForm.set({...filterForm, 型材}), 100)
      }
    ];
    return infos;
  });
  calcResultItemsAll = signal<CalcResultItem[]>([]);
  calcResultItemsAllEff = effect(
    () => {
      const reuslt = this.calcResult()?.result?.铝型材优化结果 || [];
      this.calcResultItemsAll.set(reuslt.map((v) => ({...v, showDetails: true})));
    },
    {allowSignalWrites: true}
  );
  calcResultItems = computed(() => {
    const form = this.filterForm();
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
    const code = this.code();
    const optimizeData = this.calcResult()?.result?.铝型材优化结果;
    if (!code || !optimizeData) {
      return;
    }
    await this.http.post("order/lvxingcai/saveOptimizeResult", {code, optimizeData});
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
