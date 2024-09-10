export const bjmkPageNames = ["门扇布局", "配件库", "模块库"] as const;
export type BjmkPageName = (typeof bjmkPageNames)[number];
export interface BjmkPages {
  name: BjmkPageName;
}
