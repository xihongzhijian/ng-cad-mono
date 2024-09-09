import {ObjectOf} from "@lucilor/utils";

export type VarNamesRaw = VarNameItemRaw[];
export interface VarNameItemRaw {
  names?: ObjectOf<string[]>;
  width?: number;
  门扇位置?: string;
}

export type VarNames = VarNameItem[];
export interface VarNameItem {
  nameGroups?: {groupName: string; varNames: string[]}[];
  width?: number;
  门扇位置?: string;
}
