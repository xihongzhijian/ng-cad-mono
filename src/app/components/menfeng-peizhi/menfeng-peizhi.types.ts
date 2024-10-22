import {TableDataBase} from "@modules/http/services/cad-data.service.types";

export interface MenfengpeizhiItem extends TableDataBase {
  menjiao: string;
  suobian: string;
  chanpinfenlei: string;
  xinghaoyouxian: string;
  suobianmenfeng: number | null;
  jiaobianmenfeng: number | null;
  dingbumenfeng: number | null;
  dibumenfeng: number | null;
}
