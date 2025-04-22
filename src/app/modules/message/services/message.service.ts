import {inject, Injectable} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog, MatDialogConfig, MatDialogRef} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {DomSanitizer} from "@angular/platform-browser";
import {ErrorDetailText, ResultWithErrors} from "@app/utils/error-message";
import {downloadByString, MaybePromise, ObjectOf, selectFiles, timeout} from "@lucilor/utils";
import {InputInfo, InputInfoOption} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {BehaviorSubject, lastValueFrom} from "rxjs";
import {MessageComponent} from "../components/message/message.component";
import {
  AlertMessageData,
  BookMessageData,
  ButtonMessageData,
  ConfirmMessageData,
  EditorMessageData,
  FormMessageData,
  IFrameMessageData,
  JsonMessageData,
  MessageData,
  MessageDataMap,
  MessageOutput
} from "../components/message/message.types";
import {getListEl} from "../components/message/message.utils";

export type MessageDataParams<T> = Omit<T, "type">;
export type MessageDataParams2<T> = Omit<MatDialogConfig<T>, "data">;

export const messageImportMode = ["replace", "append"] as const;
export type MessageImportMode = (typeof messageImportMode)[number];
export type MessageImportData<T> = {from: T[]; mode: MessageImportMode};
export type MessageExportData<T> = {from: T[]};

export const messageImportModeLabels = ["清空原有数据并全部替换为新数据", "添加到原有数据"] as const;
export const getMessageImportModeOptions = () => messageImportMode.map((v, i) => ({value: v, label: messageImportModeLabels[i]}));

@Injectable({
  providedIn: "root"
})
export class MessageService {
  private dialog = inject(MatDialog);
  private domSanitizer = inject(DomSanitizer);
  private snackBar = inject(MatSnackBar);

  openedDialogs: MatDialogRef<MessageComponent, MessageOutput>[] = [];
  open$ = new BehaviorSubject<MatDialogConfig<MessageData>>({});
  close$ = new BehaviorSubject<MessageOutput>(null);

  async open(config: MatDialogConfig<MessageData>) {
    config = {width: "50%", ...config};
    const data = config.data;
    if (data?.disableCancel || config.disableClose === undefined) {
      config.disableClose = true;
    }
    const ref = this.dialog.open<MessageComponent, MessageData, MessageOutput>(MessageComponent, config);
    this.openedDialogs.push(ref);
    this.open$.next(config);
    const result = await lastValueFrom(ref.afterClosed());
    this.openedDialogs = this.openedDialogs.filter((dialog) => dialog.id !== ref.id);
    this.close$.next(result);
    return result;
  }

  private _getData<T extends MessageData, K extends MessageData["type"]>(data: string | MessageDataParams<T>, type: K): MessageDataMap[K] {
    if (typeof data === "string") {
      data = {content: data} as MessageDataParams<T>;
    }
    if (type === "alert") {
      const {details} = data as MessageDataParams<AlertMessageData>;
      if (Array.isArray(details) && details.length > 0) {
        const el = getListEl(this.domSanitizer, details, data.content);
        data.content = el;
      } else if (details) {
        data.content = `${data.content}<br>${details}`;
      }
    }
    return {...data, type} as MessageData as MessageDataMap[K];
  }

  async alert(data: string | MessageDataParams<AlertMessageData>, others: MessageDataParams2<AlertMessageData> = {}) {
    return await this.open({data: this._getData(data, "alert"), ...others});
  }

  async error(message: string | MessageDataParams<AlertMessageData>, others: MessageDataParams2<AlertMessageData> = {}) {
    const data = this._getData(message, "alert");
    if (!data.title) {
      data.title = `<span class="error">错误</span>`;
    }
    return await this.open({data, width: "80vw", ...others});
  }

  async confirm(data: string | MessageDataParams<ConfirmMessageData>, others: MessageDataParams2<ConfirmMessageData> = {}) {
    return !!(await this.open({data: this._getData(data, "confirm"), ...others}));
  }

  async newTabConfirm(data?: string | MessageDataParams<ConfirmMessageData>, others: MessageDataParams2<ConfirmMessageData> = {}) {
    await timeout(100);
    if (!data) {
      data = "是否修改了数据？";
    }
    if (typeof data === "string") {
      data = {content: data} as MessageDataParams<ConfirmMessageData>;
    }
    data.btnTexts = {submit: "修改了", cancel: "没有修改"};
    return await this.confirm(data, others);
  }

  async form<T = any, K = ObjectOf<any>>(
    form: InputInfo<T>[],
    data?: Omit<MessageDataParams<FormMessageData>, "form">,
    others: MessageDataParams2<FormMessageData> = {}
  ) {
    const data2: MessageDataParams<FormMessageData> = {...data, form};
    const result = await this.open({data: this._getData(data2, "form"), ...others});
    if (result && typeof result === "object") {
      return result as K;
    }
    return null;
  }

  async prompt<T = any, K = any>(
    info: InputInfo<T>,
    data?: Omit<MessageDataParams<FormMessageData>, "form">,
    others: MessageDataParams2<FormMessageData> = {}
  ) {
    const result = await this.form([info], data, others);
    if (result && typeof result === "object") {
      return Object.values(result)[0] as K;
    }
    return null;
  }

  async book(data: string | MessageDataParams<BookMessageData>, others: MessageDataParams2<BookMessageData> = {}) {
    await this.open({data: this._getData(data, "book"), width: "80vw", ...others});
  }

  async editor(data: string | MessageDataParams<EditorMessageData>, others: MessageDataParams2<EditorMessageData> = {}) {
    return String(await this.open({data: this._getData(data, "editor"), width: "80vw", ...others}));
  }

  async button<R extends string = string, S extends string = "取消">(
    data: string | MessageDataParams<ButtonMessageData<R, S>>,
    others: MessageDataParams2<ButtonMessageData> = {}
  ) {
    return String(await this.open({data: this._getData(data, "button"), ...others})) as R | S;
  }

  async iframe(data: string | MessageDataParams<IFrameMessageData>, others: MessageDataParams2<IFrameMessageData> = {}) {
    return String(await this.open({data: this._getData(data, "iframe"), width: "100vw", height: "100vh", ...others}));
  }

  async json(json: any, data: Omit<MessageDataParams<JsonMessageData>, "json"> = {}, others: MessageDataParams2<JsonMessageData> = {}) {
    const data2 = {...data, content: "", json};
    return (await this.open({data: this._getData(data2, "json"), width: "80vw", height: "80vh", ...others})) as any;
  }

  async snack(message: string, action?: string, config?: MatSnackBarConfig) {
    const snackBarRef = this.snackBar.open(message, action, config);
    try {
      await lastValueFrom(snackBarRef.onAction());
    } catch {}
    if (!action) {
      snackBarRef.dismiss();
    }
  }

  async copyText(text: string, config?: {successText?: string; errorText?: string}) {
    const {successText = "已复制", errorText = "复制失败"} = config || {};
    try {
      navigator.clipboard.writeText(text);
      this.snack(successText);
    } catch (e) {
      console.error(e);
      this.snack(errorText);
    }
  }

  async importData<T = any, R = any, S extends ErrorDetailText = ErrorDetailText>(
    confirm: boolean | null,
    action: (data: T) => MaybePromise<void | ResultWithErrors<R, S> | boolean>,
    title = "数据",
    jsonOptions?: {reviver?: (this: any, key: string, value: any) => any}
  ) {
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    if (confirm && !(await this.confirm(`是否确定导入${title}？`))) {
      return;
    }
    const {reviver} = jsonOptions || {};
    try {
      const data = JSON.parse(await file.text(), reviver);
      let res = action(data);
      if (res instanceof Promise) {
        res = await res;
      }
      let fulfilled = true;
      if (res instanceof ResultWithErrors) {
        fulfilled = await res.check(this);
      }
      if (fulfilled) {
        await this.snack(`${title}导入成功`);
      }
    } catch (e) {
      console.error(e);
      await this.alert(`${title}导入失败，请检查导入文件是否正确`);
    }
  }
  async exportData<T = any>(data: T, title = "数据", jsonOptions?: {replacer?: (number | string)[] | null; space?: string | number}) {
    const {replacer, space} = jsonOptions || {};
    try {
      const str = JSON.stringify(data, replacer, space);
      downloadByString(str, {filename: `${title}.json`});
      await this.snack(`${title}导出成功`);
    } catch (e) {
      console.error(e);
      await this.alert(`${title}导出失败`);
    }
  }
  async getImportFrom<T>(items: T[], labelGetter: (item: T) => string, name = "数据") {
    const data: {from: T[]; mode: MessageImportMode} = {from: [], mode: "append"};
    const getter = new InputInfoWithDataGetter(data);
    const options: InputInfoOption<T>[] = items.map((v) => ({value: v, label: labelGetter(v)}));
    const result = await this.form([
      getter.selectMultiple<T>("from", options, {label: `选择导入哪些${name}`, appearance: "list", validators: Validators.required}),
      getter.selectSingle("mode", getMessageImportModeOptions(), {label: "导入方式", validators: Validators.required})
    ]);
    return result ? data : null;
  }
  async getExportFrom<T>(items: T[], labelGetter: (item: T) => string, name = "数据") {
    const data: {from: T[]} = {from: []};
    const getter = new InputInfoWithDataGetter(data);
    const options: InputInfoOption<T>[] = items.map((v) => ({value: v, label: labelGetter(v)}));
    const result = await this.form([
      getter.selectMultiple("from", options, {label: `选择导出哪些${name}`, appearance: "list", validators: Validators.required})
    ]);
    return result ? data : null;
  }
}
