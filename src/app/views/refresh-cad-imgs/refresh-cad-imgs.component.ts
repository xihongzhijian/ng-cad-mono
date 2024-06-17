import {ChangeDetectionStrategy, Component, computed, HostBinding, inject, OnInit, signal, viewChildren} from "@angular/core";
import {FormsModule, ValidatorFn} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {setGlobal} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {ProgressBarComponent, ProgressBarStatus} from "@app/components/progress-bar/progress-bar.component";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {HttpOptions} from "@app/modules/http/services/http.service.types";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {CadData} from "@lucilor/cad-viewer";
import {ProgressBar} from "@lucilor/utils";
import {RefreshCadImgsConfig} from "./refresh-cad-imgs.types";

@Component({
  selector: "app-refresh-cad-imgs",
  standalone: true,
  imports: [FormsModule, InputComponent, MatButtonModule, ProgressBarComponent],
  templateUrl: "./refresh-cad-imgs.component.html",
  styleUrl: "./refresh-cad-imgs.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefreshCadImgsComponent implements OnInit {
  http = inject(CadDataService);
  message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  collection: CadCollection = "cad";
  progressBar = new ProgressBar(1);
  progress = signal<number>(-1);
  status = signal<ProgressBarStatus>("hidden");
  msg = signal<string>("");
  ids = signal<string[]>([]);
  config: RefreshCadImgsConfig = {
    step: signal(1),
    startIndex: signal(0),
    endIndex: signal(0)
  };

  inputs = viewChildren(InputComponent);

  ngOnInit() {
    setGlobal("refreshCadImgs", this);
    this.init();
  }

  inputInfos = computed(() => {
    this.ids();
    const config = this.config;
    const getIndexValidator = (isStart: boolean): ValidatorFn => {
      return (control) => {
        const value = control.value;
        if (typeof value !== "number" || Math.floor(value) !== value) {
          return {请输入整数: true};
        }
        let min: number;
        let max: number;
        if (isStart) {
          min = 1;
          max = this.config.endIndex() + 1;
        } else {
          min = this.config.startIndex() + 1;
          max = this.ids().length;
        }
        if (value < min) {
          return {[`不能小于${min}`]: true};
        }
        if (value > max) {
          return {[`不能大于${max}`]: max};
        }
        return null;
      };
    };
    const infos: InputInfo<RefreshCadImgsConfig>[] = [
      {type: "number", label: "每次刷新几个", hint: "数量越大出错概率越大", value: config.step(), onChange: (v) => config.step.set(v)},
      {
        type: "number",
        label: "从第几个开始",
        value: config.startIndex() + 1,
        validators: getIndexValidator(true),
        onChange: (v) => config.startIndex.set(v - 1)
      },
      {
        type: "number",
        label: "到第几个结束",
        value: config.endIndex() + 1,
        validators: getIndexValidator(false),
        onChange: (v) => config.endIndex.set(v - 1)
      }
    ];
    return infos;
  });

  async init() {
    this.msg.set("正在获取cad总数...");
    const ids = await this.http.queryMongodb({collection: this.collection, fields: ["_id"]});
    this.ids.set(ids.map((v) => v._id));
    this.config.endIndex.set(ids.length - 1);
  }

  async validate() {
    const inputs = this.inputs();
    const errorMsgs: string[] = [];
    for (const input of inputs) {
      input.validateValue();
      const errorMsg = input.getErrorMsg();
      if (errorMsg) {
        errorMsgs.push(`【${input.info.label}】${errorMsg}`);
      }
    }
    if (errorMsgs.length > 0) {
      await this.message.error(errorMsgs.join("\n"));
      return false;
    }
    return true;
  }

  async start() {
    if (!(await this.validate())) {
      return;
    }
    const ids = this.ids();
    const step = this.config.step();
    const startIndex = this.config.startIndex();
    const endIndex = this.config.endIndex();
    const total = endIndex - startIndex + 1;
    this.progressBar.start(total);
    this.progress.set(0);
    this.status.set("progress");
    this.msg.set("");
    const httpOptions: HttpOptions = {spinner: false};
    const collection = this.collection;
    let successCount = 0;
    const refreshCads = async (ids: string[]) => {
      let cads: CadData[] = [];
      try {
        cads = (await this.http.getCad({collection, ids}, httpOptions)).cads;
      } catch (error) {}
      return await Promise.all(
        cads.map(async (cad) => {
          try {
            const img = await getCadPreview(collection, cad);
            await this.http.setCadImg(cad.id, img, httpOptions);
            successCount++;
          } catch (error) {}
        })
      );
    };
    for (let i = startIndex; i <= endIndex; i += step) {
      const j = Math.min(i + step - 1, endIndex);
      const currIndexs = i === j ? `${i + 1}` : `${i + 1}~${j + 1}`;
      this.msg.set(`正在刷新cad图片(${currIndexs}/${total})`);
      await refreshCads(ids.slice(i, j + 1));
      this.progressBar.forward(step);
      this.progress.set(this.progressBar.progress);
    }
    if (successCount < total) {
      if (successCount > 0) {
        this.status.set("warning");
        this.msg.set(`部分刷新成功，成功${successCount}个，失败${total - successCount}个`);
      } else {
        this.status.set("error");
        this.msg.set(`全部${total}个刷新失败`);
      }
    } else {
      this.status.set("success");
      this.msg.set(`全部${total}个刷新成功`);
    }
  }
}
