import {CadDimensionStyle, FontStyle} from "./cad-data/cad-styles";
import {EntityType} from "./cad-data/cad-types";

export interface CadViewerFont {
  name: string;
  url: string;
}

export interface CadViewerHotKey {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export type CadViewerSelectMode = "none" | "single" | "multiple";
export type CadViewerDragAxis = "" | "x" | "y" | "xy";

export interface CadViewerConfig {
  /**
   * Width of container.
   * @default 300
   */
  width: number;
  /**
   * Height of container.
   * @default 150
   */
  height: number;
  /**
   * Background color of container.
   * @default "black"
   * @example "white", "#fff", "rgba(255, 255, 255, 0.5)"
   */
  backgroundColor: string;
  /**
   * Padding of container when content is centered.
   * @default [0]
   * @example [0, 0, 0, 0] or [0, 0]
   */
  padding: number[];
  /**
   * Auto change entity color when it's color is similar to background color.
   * @default true
   */
  reverseSimilarColor: boolean;
  /**
   * Entity select mode.
   * @default "multiple"
   * @example "none", "single", "multiple"
   */
  selectMode: CadViewerSelectMode;
  /**
   * Specify the drag axis of the content.
   * @default "xy"
   * @example "", "x", "y", "xy"
   */
  dragAxis: CadViewerDragAxis;
  /**
   * Whether the entities is draggable.
   * @default true
   * @example true, false, ["LINE", "ARC"]
   * @description
   * - true: all entities are draggable
   * - false: all entities are not draggable
   * - ["LINE", "ARC"]: only LINE and ARC entities are draggable
   */
  entityDraggable: boolean | EntityType[];
  /**
   * Whether to hide dimensions.
   * @default false
   */
  hideDimensions: boolean;
  /**
   * All lines' min width, increase it to make it easier to select.
   * @default 1
   */
  minLinewidth: number;
  /**
   * Global font style.
   * @default {}
   */
  fontStyle: FontStyle;
  /**
   * Global dimension style.
   * @default {}
   */
  dimStyle: CadDimensionStyle;
  /**
   * Whether to enable zoom.
   * @default true
   */
  enableZoom: boolean;
  /**
   * Padding of dashed line.
   * @default 2
   * @example 2, [2, 4]
   * @description
   * - 2: 2px padding at start and end
   * - [2, 4]: 2px padding at start and 4px padding at end
   */
  dashedLinePadding: number | number[];
  /**
   * Customize hotkeys.
   * @description List of default hotkeys:
   * - selectAll: Ctrl + A
   * - unSelectAll: Esc
   * - copyEntities: Ctrl + C
   * - pasteEntities: Ctrl + V or Enter
   * - deleteEntities: Delete or Backspace
   */
  hotKeys: {
    selectAll: CadViewerHotKey[];
    unSelectAll: CadViewerHotKey[];
    copyEntities: CadViewerHotKey[];
    pasteEntities: CadViewerHotKey[];
    deleteEntities: CadViewerHotKey[];
  };
  /**
   * Whether to validate lines.
   * @default false
   * @ignore
   */
  validateLines: boolean;
  /**
   * Line gongshi font size, hidden if ≤0.
   * @default 0
   * @ignore
   */
  lineGongshi: number;
  /**
   * Whether to hide line length.
   * @default false
   * @ignore
   */
  hideLineLength: boolean;
  /**
   * Whether to hide line gongshi.
   * @default false
   * @ignore
   */
  hideLineGongshi: boolean;
}
export const getDefalutCadViewerConfig = (): CadViewerConfig => ({
  width: 300,
  height: 150,
  backgroundColor: "white",
  padding: [0],
  reverseSimilarColor: true,
  selectMode: "multiple",
  dragAxis: "xy",
  entityDraggable: true,
  hideDimensions: false,
  minLinewidth: 1,
  fontStyle: {},
  dimStyle: {},
  enableZoom: true,
  dashedLinePadding: 2,
  hotKeys: {
    selectAll: [{key: "a", ctrl: true}],
    unSelectAll: [{key: "Escape"}],
    copyEntities: [{key: "c", ctrl: true}],
    pasteEntities: [{key: "v", ctrl: true}, {key: "Enter"}],
    deleteEntities: [{key: "Delete"}, {key: "Backspace"}]
  },
  validateLines: false,
  lineGongshi: 0,
  hideLineLength: false,
  hideLineGongshi: false
});
