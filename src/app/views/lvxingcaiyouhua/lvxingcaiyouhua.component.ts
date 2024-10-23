import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, OnInit, signal} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {ActivatedRoute, Router} from "@angular/router";
import {session, timer} from "@app/app.common";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {Mode} from "vanilla-jsoneditor";
import {calc, getNum, InputData, OutputData, 优化结果} from "./lvxingcaiyouhua.utils";

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
    }
  }

  inputs = computed(() => {
    const inputData = this.inputData();
    const infos: InputInfo[] = [
      {
        type: "string",
        label: "数据",
        textarea: {autosize: {minRows: 1, maxRows: 2}},
        value: inputData ? JSON.stringify(inputData) : "",
        onChange: (val) => {
          if (val) {
            try {
              this.inputData.set(JSON.parse(val));
            } catch (e) {
              console.error(e);
            }
          } else {
            this.inputData.set(null);
          }
        },
        suffixIcons: [
          {
            name: "edit",
            onClick: async () => {
              const result = await this.message.json(inputData, {options: {mode: Mode.table}});
              if (result) {
                this.inputData.set(result);
              }
            }
          }
        ]
      },
      {type: "number", label: "切口损耗", value: this.qiekousunhao(), onChange: (val) => this.qiekousunhao.set(val)}
    ];
    return infos;
  });

  code = signal("");
  outputData = signal<OutputData | null>(null);
  calcResult = signal<{result: OutputData; duration: number} | null>(null);
  calcResultInfo = signal<{showDetails: boolean}[]>([]);
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
    timer.end(timerKey, timerKey);
    console.log(result);
    this.calcResult.set({result, duration});
    this.calcResultInfo.set(result.铝型材优化结果.map(() => ({showDetails: true})));
  }
  toggleCalcResultInfoShowDetails(index: number) {
    const info = this.calcResultInfo().slice();
    info[index].showDetails = !info[index].showDetails;
    this.calcResultInfo.set(info);
  }

  async import() {
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    const dataStr = await file.text();
    let data: InputData | undefined;
    try {
      data = JSON.parse(dataStr);
    } catch (e) {
      console.error(e);
    }
    if (data) {
      this.inputData.set(data);
    }
  }
  export() {
    downloadByString(JSON.stringify(this.inputData()), {filename: "铝型材优化.json"});
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
    const str = item.BOM.map((item) => item.型材长度).join("+");
    return `${item.物料长度}=${str}`;
  }
}
