import {ZixuanpeijianTypesInfoItemBase} from "@app/components/dialogs/zixuanpeijian/zixuanpeijian.types";

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
  hidden?: boolean;
}
