import {CadDataService} from "@modules/http/services/cad-data.service";
import {VarNameItem, VarNamesRaw} from "./var-names.types";

export const getVarNames = async (http: CadDataService, type: "门扇布局用" | "" = "") => {
  const varNamesRaw = await http.getData<VarNamesRaw>("shuju/api/getVarNames", {type});
  return (varNamesRaw || []).map((itemRaw) => {
    const item: VarNameItem = {width: itemRaw.width, 门扇位置: itemRaw.门扇位置};
    if (itemRaw.names) {
      item.nameGroups = Object.entries(itemRaw.names).map(([groupName, varNames]) => ({groupName, varNames}));
    }
    return item;
  });
};
