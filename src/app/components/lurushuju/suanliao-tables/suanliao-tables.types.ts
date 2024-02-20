import {MongodbDataBase} from "@modules/http/services/cad-data.service.types";

export interface KlkwpzData extends MongodbDataBase {
  孔位配置: string;
}

export interface KlcsData extends MongodbDataBase {
  参数: string;
}
