export const cadCollections = [
  "cad",
  "CADmuban",
  "qiliaozuhe",
  "qieliaocad",
  "order",
  "kailiaocadmuban",
  "material",
  "zixuanpeijian",
  "luomatoucad",
  "kailiaocanshu",
  "kailiaokongweipeizhi",
  "suanliaoceshishuju"
] as const;

export type CadCollection = (typeof cadCollections)[number];
