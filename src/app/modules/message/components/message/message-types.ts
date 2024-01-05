import {SecurityContext} from "@angular/core";
import {DomSanitizer} from "@angular/platform-browser";
import {ObjectOf} from "@lucilor/utils";
import {InputInfo} from "@modules/input/components/input.types";
import {JSONEditorPropsOptional} from "vanilla-jsoneditor";

export interface BaseMessageData {
  title?: string;
  content?: any;
  disableCancel?: boolean;
  titleClass?: string;
  contentClass?: string;
}

export interface AlertBaseMessageData {
  btnTexts?: {submit?: string};
}

export interface ConfirmBaseMessageData {
  btnTexts?: {submit?: string; cancel?: string};
}

export interface FormBaseMessageData {
  btnTexts?: {submit?: string; cancel?: string; reset?: string};
}

export interface AlertMessageData extends BaseMessageData, AlertBaseMessageData {
  type: "alert";
  details?: string | string[];
}

export interface ConfirmMessageData extends BaseMessageData, ConfirmBaseMessageData {
  type: "confirm";
}

export interface ButtonMessageData extends BaseMessageData {
  type: "button";
  buttons: (string | {label: string; value: string})[];
  btnTexts?: {cancel?: string};
}

export interface FormMessageData extends BaseMessageData, ConfirmBaseMessageData {
  type: "form";
  inputs: InputInfo[];
}

export interface BookPageData {
  title?: string;
  content: string;
}

export type BookData = BookPageData[];

export interface BookMessageData extends BaseMessageData {
  type: "book";
  bookData: BookData;
  btnTexts?: {prev?: string; next?: string; exit?: string};
}

export interface EditorMessageData extends BaseMessageData, ConfirmBaseMessageData {
  type: "editor";
  editable?: boolean;
}

export interface IFrameMessageData extends BaseMessageData {
  type: "iframe";
  content: string;
}

export interface JsonMessageData extends BaseMessageData, FormBaseMessageData {
  type: "json";
  json: any;
  defaultJson?: any;
  options?: Partial<JSONEditorPropsOptional>;
}

export type MessageData =
  | AlertMessageData
  | ConfirmMessageData
  | FormMessageData
  | BookMessageData
  | EditorMessageData
  | ButtonMessageData
  | IFrameMessageData
  | JsonMessageData;

export interface MessageDataMap {
  alert: AlertMessageData;
  confirm: ConfirmMessageData;
  form: FormMessageData;
  book: BookMessageData;
  editor: EditorMessageData;
  button: ButtonMessageData;
  iframe: IFrameMessageData;
  json: JsonMessageData;
}

export type MessageOutput = boolean | string | ObjectOf<any> | null | undefined;

export const getListEl = (domSanitizer: DomSanitizer, content: string[], title = "") => {
  const ulEl = document.createElement("ul");
  content.forEach((v) => {
    const liEl = document.createElement("li");
    liEl.innerHTML = domSanitizer.sanitize(SecurityContext.HTML, v) || "";
    ulEl.appendChild(liEl);
  });
  const titleEl = document.createElement("div");
  titleEl.classList.add("title");
  titleEl.innerHTML = title;
  const divEl = document.createElement("div");
  divEl.classList.add("message-list");
  divEl.appendChild(titleEl);
  divEl.appendChild(ulEl);
  return divEl;
};

export const getListStr = (domSanitizer: DomSanitizer, content: string[], title = "") => {
  const el = getListEl(domSanitizer, content, title);
  return el.outerHTML;
};
