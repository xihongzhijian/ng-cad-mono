import {CdkDrag, CdkDragEnd} from "@angular/cdk/drag-drop";
import {NgTemplateOutlet} from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  input,
  model,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {session} from "@app/app.common";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo, InputInfoNumber} from "@app/modules/input/components/input.types";
import {getElementVisiblePercentage, isTypeOf} from "@lucilor/utils";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getGroupStyle, getNumberUnitInput} from "../../models/input-info-utils";
import {pageComponentInfos, PageComponentTypeAny} from "../../models/page-component-infos";
import {PageComponentBase} from "../../models/page-components/page-component-base";
import {PageComponentText} from "../../models/page-components/page-component-text";

@Component({
  selector: "app-page-component-config2",
  standalone: true,
  imports: [CdkDrag, InputComponent, MatButtonModule, MatExpansionModule, MatIconModule, NgScrollbarModule, NgTemplateOutlet],
  templateUrl: "./page-component-config2.component.html",
  styleUrl: "./page-component-config2.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentConfig2Component {
  @HostBinding("class") class = "ng-page";

  components = model.required<PageComponentTypeAny[]>();
  activeComponent = model.required<PageComponentTypeAny | null>();
  activeComponent2 = model.required<PageComponentTypeAny | null>();
  showComponentMenu = model.required<boolean>();
  workSpaceEl = input.required<HTMLElement>();

  private _expandedGroupsKey = "expandedGroups";
  private _componentMenuStyleKey = "customPageComponentMenuStyle";
  expandedGroups = signal<string[]>(session.load(this._expandedGroupsKey) || []);
  componentMenuStyleOverride = signal<Properties | null>(null);

  componentMenuEl = viewChild<ElementRef<HTMLDivElement>>("componentMenu");

  constructor() {
    effect(() => {
      session.save(this._expandedGroupsKey, this.expandedGroups());
    });
  }

  componentMenuStyle = computed(() => {
    const component = this.activeComponent();
    const componentMenuStyleOverride = this.componentMenuStyleOverride();
    if (!component || !this.showComponentMenu()) {
      return null;
    }
    const style: Properties = {};
    const stylePrev = session.load(this._componentMenuStyleKey);
    if (isTypeOf(stylePrev, "object")) {
      Object.assign(style, stylePrev);
    }
    if (componentMenuStyleOverride) {
      Object.assign(style, componentMenuStyleOverride);
    }
    setTimeout(() => {
      this.constrainComponentMenu();
    }, 0);
    return style;
  });
  moveComponentMenuEnd(event: CdkDragEnd) {
    const style: Properties = {};
    const rect = event.source.element.nativeElement.getBoundingClientRect();
    const workSpaceRect = this.workSpaceEl().getBoundingClientRect();
    style.top = `${rect.top - workSpaceRect.top}px`;
    style.left = `${rect.left - workSpaceRect.left}px`;
    session.save(this._componentMenuStyleKey, style);
  }
  constrainComponentMenu() {
    if (!session.load(this._componentMenuStyleKey)) {
      return;
    }
    const workSpaceEl = this.workSpaceEl();
    const componentMenuEl = this.componentMenuEl()?.nativeElement;
    if (componentMenuEl && getElementVisiblePercentage(componentMenuEl, workSpaceEl) < 25) {
      session.remove(this._componentMenuStyleKey);
      this.componentMenuStyleOverride.update((v) => {
        if (v) {
          delete v.top;
          delete v.left;
        } else {
          v = {};
        }
        return v;
      });
    }
  }
  closeComponentMenu() {
    this.showComponentMenu.set(false);
  }

  componentMenuInputs = computed(() => {
    this.components();
    const component = this.activeComponent2() || this.activeComponent();
    const inputGroups: {name: string; infos: InputInfo[]; expanded?: boolean}[] = [];
    const onChange = () => {
      this.components.update((v) => [...v]);
    };
    if (component instanceof PageComponentText) {
      inputGroups.push(...this.getTextInputs(component, onChange));
    }

    if (component instanceof PageComponentBase) {
      inputGroups.push(...this.getCommonInputs(component, onChange));
    }

    const expandedGroups = this.expandedGroups();
    for (const group of inputGroups) {
      group.expanded = expandedGroups.includes(group.name);
    }
    return inputGroups;
  });
  getTextInputs(component: PageComponentText, onChange: () => void): ReturnType<typeof this.componentMenuInputs> {
    return [
      {
        name: "",
        infos: [
          {
            type: "string",
            label: "字体",
            model: {data: component, key: "fontFamily"},
            onChange
          },
          {
            ...getNumberUnitInput(false, "字号", "px"),
            model: {data: component, key: "fontSize"},
            onChange
          }
        ]
      }
    ];
  }
  getCommonInputs(component: PageComponentTypeAny, onChange: () => void): ReturnType<typeof this.componentMenuInputs> {
    const {resizable = {}} = pageComponentInfos[component.type] || {};
    const widthInput: InputInfoNumber<typeof component.size> = {
      ...getNumberUnitInput(true, "宽", "px"),
      model: {data: component.size, key: "x"},
      readonly: !resizable.x,
      onChange
    };
    if (!resizable.x) {
      widthInput.readonly = true;
      widthInput.hint = "宽度自动调整";
    }
    const heightInput: InputInfoNumber<typeof component.size> = {
      ...getNumberUnitInput(true, "高", "px"),
      model: {data: component.size, key: "y"},
      readonly: !resizable.y,
      onChange
    };
    if (!resizable.y) {
      heightInput.readonly = true;
      heightInput.hint = "高度自动调整";
    }

    const xInput: InputInfoNumber<typeof component.position> = {
      ...getNumberUnitInput(true, "X", "px"),
      model: {data: component.position, key: "x"},
      onChange
    };
    const yInput: InputInfoNumber<typeof component.position> = {
      ...getNumberUnitInput(true, "Y", "px"),
      model: {data: component.position, key: "y"},
      onChange
    };

    return [
      {
        name: "尺寸与位置",
        infos: [
          {type: "group", label: "尺寸", groupStyle: getGroupStyle(), infos: [widthInput, heightInput]},
          {type: "group", label: "位置", groupStyle: getGroupStyle(), infos: [xInput, yInput]}
        ]
      }
    ];
  }

  onExpandedChange(group: ReturnType<typeof this.componentMenuInputs>[number], expanded: boolean) {
    this.expandedGroups.update((v) => {
      if (expanded) {
        return [...v, group.name];
      } else {
        return v.filter((name) => name !== group.name);
      }
    });
  }
}
