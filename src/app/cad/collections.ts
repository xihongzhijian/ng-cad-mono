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
  "suanliaoceshishuju",
  "ngcadNavs",
  "peijianku"
] as const;

export type CadCollection = (typeof cadCollections)[number];
