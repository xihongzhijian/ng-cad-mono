import {SpinnerConfig} from "@modules/spinner/services/spinner.service";
import {AxiosRequestConfig} from "axios";

export interface CustomResponse<T> {
  code: number;
  msg?: string;
  data?: T;
  count?: number;
  importance?: number;
  duration?: number;
  title?: string;
}

export type DataEncrpty = "yes" | "no" | "both";

export interface HttpOptions extends AxiosRequestConfig {
  bypassCodes?: number[];
  silent?: boolean;
  encrypt?: DataEncrpty;
  offlineMode?: boolean;
  spinner?: string | boolean | {id?: string; config?: SpinnerConfig};
}

export class HttpServiceResponseError extends Error {
  constructor(public response: CustomResponse<any>) {
    const {msg} = response;
    let message = "";
    if (msg) {
      message = msg;
    } else {
      message = "未知错误";
    }
    super(message);
  }
}

export interface DataAndCount<T> {
  data: T | undefined;
  count: number;
}
