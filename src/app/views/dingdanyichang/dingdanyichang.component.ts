import {Component, HostBinding, QueryList, ViewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute, Params} from "@angular/router";
import {filePathUrl} from "@app/app.common";
import {WindowMessageManager} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {DingdanyichangData} from "./dingdanyichang.types";

@Component({
  selector: "app-dingdanyichang",
  standalone: true,
  imports: [InputComponent, MatButtonModule, NgScrollbarModule],
  templateUrl: "./dingdanyichang.component.html",
  styleUrl: "./dingdanyichang.component.scss"
})
export class DingdanyichangComponent extends Subscribed() {
  @HostBinding("class") class = "ng-page";
  type = "";
  code = "";
  inputInfos: InputInfo[] = [];
  wmm = new WindowMessageManager("订单异常", this, window.parent);
  formData: DingdanyichangData | null = null;

  @ViewChildren(InputComponent) inputComponents?: QueryList<InputComponent>;

  constructor(
    route: ActivatedRoute,
    private http: CadDataService,
    private message: MessageService
  ) {
    super();
    this.subscribe(route.queryParams, this.onQueryParamsChange.bind(this));
  }

  onQueryParamsChange(params: Params) {
    this.type = params.type || "";
    this.code = params.code || "";
    this.updateInputInfos();
  }

  updateInputInfos() {
    const {type, code} = this;
    if (type === "报告异常") {
      const data: DingdanyichangData = {dingdanbianhao: code, yichangxinxi: "", yichangtupian: "", yichangchuliren: ""};
      const infos: InputInfo<DingdanyichangData>[] = [
        {type: "string", label: "订单编号", model: {data, key: "dingdanbianhao"}, readonly: !!code, validators: Validators.required},
        {type: "string", label: "异常信息", model: {data, key: "yichangxinxi"}, textarea: {autosize: {minRows: 3, maxRows: 6}}},
        {
          type: "image",
          label: "异常图片",
          prefix: filePathUrl,
          value: data.yichangtupian,
          onChange: async (val) => {
            const result = await this.http.uploadImage(val);
            if (result) {
              data.yichangtupian = result.url;
              infos[2].value = result.url;
            }
          }
        },
        {
          type: "select",
          label: "报告人",
          model: {data, key: "baogaoren"},
          options: [],
          optionsDialog: {
            optionKey: "所有用户",
            nameField: "xingming",
            noImage: true
          }
        }
      ];
      this.inputInfos = infos;
      this.formData = data;
    } else if (type === "异常处理") {
      const data: DingdanyichangData = {chulijieguo: "", chulishuoming: "", chulitupian: "", keyishendan: ""};
      const infos: InputInfo<DingdanyichangData>[] = [
        {
          type: "select",
          label: "处理结果",
          model: {data, key: "chulijieguo"},
          options: ["已解决", "无法解决", "解决中"],
          validators: Validators.required
        },
        {
          type: "select",
          label: "可以审单",
          model: {data, key: "keyishendan"},
          options: ["可以", "不可以"],
          validators: Validators.required
        },
        {type: "string", label: "处理说明", model: {data, key: "chulishuoming"}, textarea: {autosize: {minRows: 3, maxRows: 6}}},
        {
          type: "image",
          label: "处理图片",
          prefix: filePathUrl,
          value: data.chulitupian,
          onChange: async (val) => {
            const result = await this.http.uploadImage(val);
            if (result) {
              data.chulitupian = result.url;
              infos[2].value = result.url;
            }
          }
        },
        {
          type: "select",
          label: "异常处理人",
          model: {data, key: "yichangchuliren"},
          options: [],
          optionsDialog: {
            optionKey: "所有用户",
            nameField: "xingming",
            noImage: true
          }
        }
      ];
      this.inputInfos = infos;
      this.formData = data;
    } else {
      this.inputInfos = [];
    }
  }

  close(submit: boolean) {
    const {inputComponents} = this;
    if (submit && inputComponents) {
      let hasError = false;
      for (const input of inputComponents) {
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
