import {AsyncPipe} from "@angular/common";
import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, signal, viewChildren} from "@angular/core";
import {toSignal} from "@angular/core/rxjs-interop";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute} from "@angular/router";
import {WindowMessageManager} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {DingdanyichangData} from "./dingdanyichang.types";

@Component({
  selector: "app-dingdanyichang",
  imports: [AsyncPipe, InputComponent, MatButtonModule, NgScrollbarModule],
  templateUrl: "./dingdanyichang.component.html",
  styleUrl: "./dingdanyichang.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DingdanyichangComponent extends Subscribed() {
  private route = inject(ActivatedRoute);
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  type = signal("");

  queryParams = toSignal(this.route.queryParams);
  queryParamsEff = effect(() => {
    const params = this.queryParams() || {};
    this.type.set(params.type || "");
  });

  wmm = new WindowMessageManager("订单异常", this, window.parent);

  formData = computed(async () => {
    this.wmm.postMessage("getItemStart");
    const item = await this.wmm.waitForMessage<DingdanyichangData | undefined>("getItemEnd");
    const data: DingdanyichangData = {dingdanbianhao: "", yichangxinxi: "", yichangtupian: "", yichangchuliren: "", ...item};
    return data;
  });

  inputInfos = computed(async () => {
    const type = this.type();
    const data = await this.formData();
    const getter = new InputInfoWithDataGetter(data);
    let infos: InputInfo[];
    if (type === "报告异常") {
      infos = [
        getter.string("dingdanbianhao", {label: "订单编号", readonly: !!data.dingdanbianhao, validators: Validators.required}),
        getter.selectSingle("dingdanzhuangtai", [], {
          label: "订单状态",
          optionsDialog: {optionKey: "订单状态", info: {订单异常报告: true}},
          validators: Validators.required
        }),
        getter.string("yichangxinxi", {label: "异常信息", textarea: {autosize: {minRows: 3, maxRows: 6}}}),
        getter.image("yichangtupian", this.http, {label: "异常图片"}),
        getter.selectSingle("yichangchuliren", [], {
          label: "异常处理人",
          optionsDialog: {
            optionKey: "所有用户",
            nameField: "xingming"
          }
        })
      ];
    } else if (type === "异常处理") {
      infos = [
        getter.selectSingle("chulijieguo", ["已解决", "无法解决", "解决中"], {label: "处理结果", validators: Validators.required}),
        getter.selectSingle("keyishendan", ["可以", "不可以"], {label: "可以审单", validators: Validators.required}),
        getter.string("chulishuoming", {label: "处理说明", textarea: {autosize: {minRows: 3, maxRows: 6}}}),
        getter.image("chulitupian", this.http, {label: "处理图片"}),
        getter.selectSingle("yichangchuliren", [], {
          label: "异常处理人",
          optionsDialog: {
            optionKey: "所有用户",
            nameField: "xingming"
          }
        })
      ];
    } else {
      infos = [];
    }
    return infos;
  });

  inputComponents = viewChildren(InputComponent);
  close(submit: boolean) {
    if (submit) {
      let hasError = false;
      for (const input of this.inputComponents()) {
        const errors = input.validateValue();
        if (!isEmpty(errors)) {
          hasError = true;
        }
      }
      if (hasError) {
        this.message.error("请填写完整信息");
        return;
      }
    }
    this.wmm.postMessage("closeStart", {data: submit ? this.formData : null});
  }
}
