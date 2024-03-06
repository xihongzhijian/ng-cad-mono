import {ObjectOf} from "packages/utils/lib";
import {SuanliaoDataParams} from "../xinghao-data";

export const getSuanliaoDataSearch = (params: SuanliaoDataParams) => {
  const search: ObjectOf<any> = {...params};
  const options = search.选项;
  delete search.选项;
  for (const key in options) {
    if (key === "产品分类") {
      search[`选项.${key}`] = {$in: [options[key], undefined]};
    } else {
      search[`选项.${key}`] = options[key];
    }
  }
  return search;
};
