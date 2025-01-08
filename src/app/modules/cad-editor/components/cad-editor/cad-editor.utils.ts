export const cadEditorMenuNames = ["cadInfo", "cadAssemble", "cadSplit"] as const;
export type CadEditorMenuName = (typeof cadEditorMenuNames)[number];
