import {Properties} from "csstype";

export interface ToolbarBtn {
  name: string;
  accent?: boolean;
  class?: string[];
  style?: Properties;
  hidden?: boolean;
  onClick?: () => void;
  type?: "button" | "text";
}
