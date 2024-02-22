import {CadItemComponent} from "./cad-item.component";

export interface CadItemButton<T> {
  name: string;
  onClick: (component: CadItemComponent<T>) => void;
}

export const typeOptions = ["模板公式展开", "自动展开+模板", "双向自动展开+模板"] as const;
