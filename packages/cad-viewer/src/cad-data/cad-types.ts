// * 数组顺序决定渲染顺序
export const entityTypes = ["IMAGE", "DIMENSION", "HATCH", "MTEXT", "CIRCLE", "ARC", "LINE", "SPLINE", "LEADER", "INSERT"] as const;
export type EntityType = (typeof entityTypes)[number];

export const entityTypesKey = ["image", "dimension", "hatch", "mtext", "circle", "arc", "line", "spline", "leader", "insert"] as const;
export type EntityTypeKey = (typeof entityTypesKey)[number];

export const entityTypesMap: Record<EntityTypeKey, EntityType> = (() => {
  const map: Record<string, EntityType> = {};
  entityTypesKey.forEach((key, index) => {
    map[key] = entityTypes[index];
  });
  return map;
})();

export type CadAxis = "x" | "y";

export const cadDimensionBlocks = [
  "",
  "CLOSEDBLANK",
  "Closed",
  "Dot",
  "DotSmall",
  "DotBlank",
  "Small",
  "Oblique",
  "ARCHTICK",
  "Open",
  "Open30",
  "Open90",
  "Origin",
  "Origin2",
  "BoxFilled",
  "BoxBlank",
  "DatumFilled",
  "DatumBlank",
  "Integral"
] as const;
export type CadDimensionBlock = (typeof cadDimensionBlocks)[number];
