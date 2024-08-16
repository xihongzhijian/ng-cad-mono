import {ZixuanpeijianTypesInfoItem} from "@app/components/dialogs/zixuanpeijian/zixuanpeijian.types";

export interface MokuaiItem extends ZixuanpeijianTypesInfoItem {
  name: string;
  type: string;
  order: number;
  hidden?: boolean;
}
