import {CadData} from "@lucilor/cad-viewer";

export type SuanliaodanFlipItem0 = CadData["zhankai"][number]["flip"][number];
export interface SuanliaodanFlipItem extends SuanliaodanFlipItem0 {
  suoxiang?: string;
}

export interface SuanliaodanFlipInput {
  items: SuanliaodanFlipItem[] | null;
}

export interface SuanliaodanFlipOutput {
  items: SuanliaodanFlipItem[];
}
