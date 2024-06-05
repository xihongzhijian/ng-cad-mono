import {imgEmpty} from "@app/app.common";
import {keysOf} from "@lucilor/utils";
import {PageComponentBase} from "./page-components/page-component-base";
import {PageComponentImage} from "./page-components/page-component-image";
import {PageComponentText} from "./page-components/page-component-text";

export const pageComponentInfos = {
  text: {name: "文字", description: "这是文字组件", previewImg: imgEmpty, class: PageComponentText} as PageComponentInfo<
    typeof PageComponentText
  >,
  image: {name: "图片", description: "这是图片组件", previewImg: imgEmpty, class: PageComponentImage} as PageComponentInfo<
    typeof PageComponentImage
  >
};
export const pageComponentNames = keysOf(pageComponentInfos);
export type PageComponentName = keyof typeof pageComponentInfos;

export interface PageComponentInfo<T> {
  name: string;
  description: string;
  previewImg: string;
  class: T;
  conditions?: string[];
}

export interface PageComponentItem<T extends PageComponentBase = PageComponentBase> {
  key: PageComponentName;
  component: T;
}
