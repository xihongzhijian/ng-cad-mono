import {ZixuanpeijianTypesInfoItemBase} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {输入, 选项} from "@components/lurushuju/xinghao-data";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";

export interface MokuaiItem extends ZixuanpeijianTypesInfoItemBase {
  name: string;
  type: string;
  order: number;
  gongshishuru: string;
  xuanxiangshuru: string;
  shuchubianliang: string;
  shuchuwenben: string;
  自定义数据?: MokuaiItemCustomData;
  menjiao?: string[];
  kaiqi?: string[];
  cads?: HoutaiCad[];
  hidden?: boolean;
}

export interface MokuaiItemCustomData {
  选项数据?: 选项[];
  输入数据?: 输入[];
}

export interface MokuaiItemCloseEvent {
  isSaved: boolean;
}
