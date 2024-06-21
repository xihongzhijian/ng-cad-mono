import {pageComponentInfos, PageComponentType, PageComponentTypeAny} from "../page-component-infos";
import {PageComponentBase} from "./page-component-base";

export class PageComponentGroup extends PageComponentBase {
  readonly type = "group";

  expanded: boolean = false;
  children: PageComponentTypeAny[] = [];

  import(data: ReturnType<typeof this.export>) {
    super.import(data);
    this.expanded = data.expanded;
    const infos = pageComponentInfos;
    this.children = [];
    for (const childData of data.children) {
      const info = infos[childData.type as PageComponentType];
      if (!info) {
        continue;
      }
      const child = new info.class("");
      child.import(childData as any);
      this.children.push(child);
    }
  }
  export(): ReturnType<PageComponentBase["export"]> & {expanded: boolean; children: ReturnType<PageComponentBase["export"]>[]} {
    return {
      ...super.export(),
      expanded: this.expanded,
      children: this.children.map((child) => child.export())
    };
  }
}
