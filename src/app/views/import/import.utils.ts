import {inject} from "@angular/core";
import {addJs, session} from "@app/app.common";
import {addCadInfoError, CadInfo} from "@app/cad/portable";
import {alertError, ErrorItem, ResultWithErrors} from "@app/utils/error-message";
import {ObjectOf} from "@lucilor/utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {ImportCache} from "./import.types";

export const openImportPage = (status: AppStatusService, data: ImportCache) => {
  const key = new Date().getTime().toString(16);
  session.save("importParams-" + key, data);
  status.openInNewTab(["import"], {queryParams: {key}});
};

export class BatchUploadChecker {
  private message = inject(MessageService);

  constructor() {
    addJs("batchUploadChecker");
  }

  private getErrorMsg(error: any, methodName: string): ErrorItem {
    console.error(error);
    let errMsg = `【batchUploadChecker.js】调用【${methodName}】出错`;
    if (error instanceof Error) {
      errMsg += `: ${error.message}`;
    }
    return {content: "【batchUploadChecker.js】出错", details: [[{text: errMsg}]]};
  }

  parseBaobianzhengmianRules(content: string, vars?: ObjectOf<any>) {
    const result = new ResultWithErrors(null);
    try {
      const parseResult = window.parseBaobianzhengmianRules(content, vars);
      for (const error of parseResult.errors) {
        result.addErrorStr(error);
      }
    } catch (error) {
      result.addError(this.getErrorMsg(error, this.parseBaobianzhengmianRules.name));
    }
    return result;
  }

  batchCheck(cads: CadInfo[]) {
    const data = cads.map((v) => {
      const json = v.data.export();
      json.选项 = json.options;
      json.条件 = json.conditions;
      return {
        json,
        _id: json.id,
        选项: json.options,
        条件: json.conditions,
        名字: json.name,
        显示名字: json.xianshimingzi,
        分类: json.type,
        分类2: json.type2
      };
    });
    let result: ObjectOf<string[]> | null = null;
    try {
      result = (window as any).batchCheck(data);
    } catch (error) {
      alertError(this.message, this.getErrorMsg(error, this.batchCheck.name));
    }
    if (result) {
      for (const cad of cads) {
        const errors = result[cad.data.id];
        if (Array.isArray(errors)) {
          for (const error of errors) {
            addCadInfoError(cad, {content: error, details: [[{text: "【batchUploadChecker.js】的报错"}]]});
          }
        }
      }
    }
    return {data, result};
  }
}
