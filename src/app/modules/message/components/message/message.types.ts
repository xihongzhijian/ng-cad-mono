import {MaybePromise, ObjectOf} from "@lucilor/utils";
import {InputInfo} from "@modules/input/components/input.types";
import {JSONEditorPropsOptional} from "vanilla-jsoneditor";

export interface MessageDataButton<T extends string = string> {
  label: T;
  onClick?: () => void;
}

export interface BaseMessageData<R extends string = string> {
  title?: string;
  content?: any;
  disableCancel?: boolean;
  titleClass?: string;
  beforeClose?: (event: MessageBeforeCloseEvent) => MaybePromise<boolean>;
  titleBtns?: MessageDataButton<R>[];
}
export interface MessageBeforeCloseEvent {
  type: "submit" | "cancel";
}

export interface AlertBaseMessageData {
  btnTexts?: {submit?: string};
}

export interface ConfirmBaseMessageData {
  btnTexts?: {submit?: string; cancel?: string};
}

export interface FormBaseMessageData {
  resetable?: boolean;
  btnTexts?: {submit?: string; cancel?: string; reset?: string; autoFill?: string};
}

export interface AlertMessageData extends BaseMessageData, AlertBaseMessageData {
  type: "alert";
  details?: string | string[];
}

export interface ConfirmMessageData extends BaseMessageData, ConfirmBaseMessageData {
  type: "confirm";
}

export interface ButtonMessageDataButton<T extends string = string> extends MessageDataButton<T> {
  value: string;
}
export interface ButtonMessageData<R extends string = string, S extends string = "取消"> extends BaseMessageData {
  type: "button";
  buttons: (R | ButtonMessageDataButton<R>)[];
  btnTexts?: {cancel?: S};
}

export interface FormMessageData extends BaseMessageData, FormBaseMessageData {
  type: "form";
  form: InputInfo[];
  autoFill?: (inputs: InputInfo[]) => void;
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
