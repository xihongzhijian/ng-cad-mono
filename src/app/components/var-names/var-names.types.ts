import {ObjectOf} from "@lucilor/utils";

export type VarNamesRaw = VarNameItemRaw[];
export interface VarNameItemRaw {
  names?: ObjectOf<string[]>;
  width?: number;
  门扇位置?: string;
}

export type VarNames = VarNameItem[];
export interface VarNameItemNameItem {
  groupName: string;
  varNames: string[];
}
export interface VarNameItem {
  nameGroups?: VarNameItemNameItem[];
  width?: number;
  门扇位置?: string;
}
