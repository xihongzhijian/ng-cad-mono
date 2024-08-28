import {InputInfo} from "@modules/input/components/input.types";

export interface InputGroup<T = any> {
  name: string;
  infos: InputInfo<T>[];
  expanded?: boolean;
}
