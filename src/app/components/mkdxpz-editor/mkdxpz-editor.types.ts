import {MsbjRectInfoRaw, 模块大小配置} from "@components/msbj-rects/msbj-rects.types";
import {MsbjInfo} from "@views/msbj/msbj.utils";
import {XhmrmsbjInfoMokuaiNode} from "@views/xhmrmsbj/xhmrmsbj.types";

export interface MkdxpzEditorData {
  dxpz?: 模块大小配置;
  nodes?: XhmrmsbjInfoMokuaiNode[];
  rectInfos?: MsbjRectInfoRaw[];
  msbj?: MsbjInfo | null;
}

export interface MkdxpzEditorCloseEvent {
  data: MkdxpzEditorData | null;
}
