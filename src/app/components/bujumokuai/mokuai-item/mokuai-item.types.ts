import {ZixuanpeijianTypesInfoItemBase} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {选项} from "@components/lurushuju/xinghao-data";
import {ObjectOf} from "@lucilor/utils";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";

export interface MokuaiItem extends ZixuanpeijianTypesInfoItemBase {
  name: string;
  type: string;
  order: number;
  gongshishuru: string;
  xuanxiangshuru: string;
  shuchubianliang: string;
  xiaoguotushiyongbianliang: string;
  shuchuwenben: string;
  自定义数据?: MokuaiItemCustomData;
  menjiao?: string[];
  kaiqi?: string[];
  cads?: HoutaiCad[];
  hidden?: boolean;
}

export interface MokuaiItemCustomData {
  选项数据: 选项[];
  下单显示: string;
  下单时需要满足选项: ObjectOf<string>;
}

export interface MokuaiItemCloseEvent {
  isSaved: boolean;
}

export interface MokuaiItemCadInfo {
  index: number;
}
