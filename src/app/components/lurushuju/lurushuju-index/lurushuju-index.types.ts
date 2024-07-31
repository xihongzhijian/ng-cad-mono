import {OptionsDataData} from "@modules/http/services/cad-data.service.types";
import {Properties} from "csstype";

export interface ToolbarBtn {
  name: string;
  color?: string;
  class?: string[];
  style?: Properties;
}

export interface MenshanOption extends OptionsDataData {
  zuchenghuajian?: string;
}
