import {OptionsDataData} from "@app/modules/http/services/cad-data.service.types";
import {ObjectOf} from "@lucilor/utils";

export type OptionsAll = ObjectOf<OptionsDataData[]>;
export type OptionsAll2 = ObjectOf<{options: OptionsDataData[]; disabled?: boolean; multiple?: boolean}>;
