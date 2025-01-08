import {WritableSignal} from "@angular/core";
import {CadLineLike, cadLineOptions} from "@lucilor/cad-viewer";
import {InputInfo} from "@modules/input/components/input.types";
import {TableRenderInfo} from "@modules/table/components/table/table.types";

export const getLineTable = (data: CadLineLike[]) => {
  const info: TableRenderInfo<CadLineLike> = {
    data,
    editMode: true,
    noScroll: true,
    rowSelection: {mode: "multiple"},
    columns: [
      {type: "number", field: "length", name: "线长", ndigits: 2, editable: true, width: "80px"},
      {type: "string", field: "mingzi", name: "线名字", editable: true, width: "120px"},
      {
        type: "select",
        field: "zhankaifangshi",
        name: "展开方式",
        options: cadLineOptions.zhankaifangshi.values.slice(),
        editable: true,
        width: "120px"
      },
      {type: "string", field: "zidingzhankaichang", name: "指定展开长", editable: true, width: "120px"}
    ]
  };
  return info;
};

export interface MultiSetData {
  展开方式: (typeof cadLineOptions.zhankaifangshi.values)[number];
  指定展开长: string;
}
export const getMultiSetData = (data?: Partial<MultiSetData>): MultiSetData => ({
  展开方式: cadLineOptions.zhankaifangshi.defaultValue,
  指定展开长: "",
  ...data
});
export const getMultiSetInputInfos = (dataSignal: WritableSignal<MultiSetData>) => {
  const data = dataSignal();
  const get = (key: keyof MultiSetData) => {
    return {
      label: key,
      model: {data, key},
      onChange: () => {
        dataSignal.set({...data});
      }
    } satisfies Partial<InputInfo<MultiSetData>>;
  };
  const infos: InputInfo<MultiSetData>[] = [
    {type: "select", options: cadLineOptions.zhankaifangshi.values.slice(), ...get("展开方式")},
    {type: "string", ...get("指定展开长")}
  ];
  return infos;
};
