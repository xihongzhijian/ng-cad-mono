import {ZixuanpeijianTypesInfoItemBase} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";

export interface MokuaiItem extends ZixuanpeijianTypesInfoItemBase {
  name: string;
  type: string;
  order: number;
  gongshishuru: string;
  xuanxiangshuru: string;
  shuchubianliang: string;
  shuchuwenben: string;
  menjiao?: string[];
  kaiqi?: string[];
  cads?: HoutaiCad[];
  hidden?: boolean;
}
