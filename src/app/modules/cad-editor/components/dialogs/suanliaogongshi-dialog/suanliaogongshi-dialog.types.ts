import {SuanliaogongshiInfo} from "../../suanliaogongshi/suanliaogongshi.types";

export interface SuanliaogongshiDialogInput {
  info: SuanliaogongshiInfo;
}

export interface SuanliaogongshiDialogOutput {
  data: SuanliaogongshiInfo["data"];
}
