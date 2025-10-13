import {signal} from "@angular/core";
import {tryParseJson} from "@app/utils/json-helper";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {NavsResultItem} from "@components/dialogs/navs-dialog/navs-dialog.types";
import {ObjectOf} from "@lucilor/utils";
import {Utils} from "@mixins/utils.mixin";
import {InputInfo} from "@modules/input/components/input.types";
import {cloneDeep} from "lodash";

export interface XinghaoOverviewTableData extends TableDataBase {
  data?: string;
}

export class XinghaoOverviewData extends Utils() {
  id = signal(-1);
  sections = signal<XinghaoOverviewSection[]>([]);

  constructor(id = -1) {
    super();
    this.id.set(id);
  }

  import(data: string) {
    const sections: XinghaoOverviewSection[] = [];
    const data2 = tryParseJson(data);
    if (data2) {
      for (const section of data2?.sections || []) {
        this.addSection(undefined, section, sections);
      }
    }
    this.sections.set(sections);
  }

  export() {
    const sections = cloneDeep(this.sections());
    for (const section of sections) {
      delete section.nameInputInfo;
    }
    return JSON.stringify({sections});
  }

  addSection(index?: number, data?: XinghaoOverviewSection, sections?: XinghaoOverviewSection[]) {
    const section: XinghaoOverviewSection = {name: "", items: []};
    section.nameInputInfo = {type: "string", label: "分组", model: {key: "name", data: section}};
    if (data) {
      section.name = data.name;
      for (const item of data.items || []) {
        this.addItem(section, undefined, item);
      }
    }
    if (sections) {
      this.arrayAdd(sections, section, index);
    } else {
      const sections2 = [...this.sections()];
      this.arrayAdd(sections2, section, index);
      this.sections.set(sections2);
    }
  }

  removeSection(index: number, sections?: XinghaoOverviewSection[]) {
    if (sections) {
      this.arrayRemove(sections, index);
    } else {
      const sections2 = [...this.sections()];
      this.arrayRemove(sections2, index);
      this.sections.set(sections2);
    }
  }

  addItem(i: number | XinghaoOverviewSection, j?: number, data?: NavsResultItem) {
    const item: NavsResultItem = {tou: {id: -1, name: ""}, da: {id: -1, name: ""}, xiao: {id: -1, name: "", table: ""}};
    if (data) {
      Object.assign(item, data);
    }
    if (typeof i === "number") {
      const sections = [...this.sections()];
      this.arrayAdd(sections[i].items, item, j);
      this.sections.set(sections);
    } else {
      this.arrayAdd(i.items, item, j);
    }
  }

  removeItem(i: number | XinghaoOverviewSection, index: number) {
    if (typeof i === "number") {
      const sections = [...this.sections()];
      this.arrayRemove(sections[i].items, index);
      this.sections.set(sections);
    } else {
      this.arrayRemove(i.items, index);
    }
  }

  justify(xiaodaohangs: ObjectOf<NavsResultItem>) {
    const sections = [...this.sections()];
    for (const section of sections) {
      const items = section.items;
      section.items = [];
      for (const item of items) {
        const item2 = xiaodaohangs[item.xiao.name];
        if (item2) {
          section.items.push(item2);
        }
      }
    }
    this.sections.set(sections);
  }
}

export interface XinghaoOverviewSection {
  name: string;
  nameInputInfo?: InputInfo;
  items: NavsResultItem[];
}
