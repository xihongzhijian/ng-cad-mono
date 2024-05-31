export const pageSizes = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  A7: [74, 105],
  A8: [52, 74]
} as const;
export type PageSizeName = keyof typeof pageSizes;
export const pageSizeNames = Object.keys(pageSizes) as PageSizeName[];
export type PageSizeNameCustom = PageSizeName | "自定义";
export const pageSizeNamesCustom = [...pageSizeNames, "自定义"] as PageSizeNameCustom[];
export type PageOrientation = "portrait" | "landscape";
