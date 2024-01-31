import {CadItemComponent} from "./cad-item.component";

export interface CadItemButton<T> {
  name: string;
  onClick: (component: CadItemComponent<T>) => void;
}
