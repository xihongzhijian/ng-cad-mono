import {CadData} from "@lucilor/cad-viewer";

export type SuanliaodanFlipItem = CadData["zhankai"][number]["flip"][number];

export interface SuanliaodanFlipInput {
  items: SuanliaodanFlipItem[] | null;
}

export interface SuanliaodanFlipOutput {
  items: SuanliaodanFlipItem[];
}
