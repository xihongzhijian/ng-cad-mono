export interface CadMenfengConfigItem {
  产品分类: string[];
  开启: string[];
  门缝: number;
}
export interface CadMenfengConfigItemOption {
  id: number;
  name: string;
}

export interface CadMenfengConfigInput {
  type: string;
  items?: CadMenfengConfigItem[];
}
export interface CadMenfengConfigOutput {
  items: CadMenfengConfigItem[];
}
