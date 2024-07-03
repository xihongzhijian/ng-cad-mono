import {CdkDrag, CdkDragEnd, CdkDragHandle} from "@angular/cdk/drag-drop";
import {NgTemplateOutlet} from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {session} from "@app/app.common";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {InputComponent} from "@app/modules/input/components/input.component";
import {getElementVisiblePercentage, isTypeOf} from "@lucilor/utils";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {pageComponentInfos, PageComponentTypeAny} from "../../models/page-component-infos";
import {updateGroup} from "../../models/page-component-utils";
import {PageComponentBase} from "../../models/page-components/page-component-base";
import {PageComponentForm} from "../../models/page-components/page-component-form";
import {PageComponentImage} from "../../models/page-components/page-component-image";
import {PageComponentText} from "../../models/page-components/page-component-text";
import {PageStatusService} from "../../services/page-status.service";
import {InputGroup} from "./page-component-config2.types";
import {getCommonInputs, getFormInputs, getImageInputs, getTextInputs, mergeGroups} from "./page-component-config2.utils";

pageComponentInfos; // ? 虽然没用，但删除了会报错

@Component({
  selector: "app-page-component-config2",
  standalone: true,
  imports: [
    CdkDrag,
    CdkDragHandle,
    InputComponent,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    NgScrollbarModule,
    NgTemplateOutlet
  ],
  templateUrl: "./page-component-config2.component.html",
  styleUrl: "./page-component-config2.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentConfig2Component {
  private http = inject(CadDataService);
  private pageStatus = inject(PageStatusService);

  @HostBinding("class") class = "ng-page";

  workSpaceEl = input.required<HTMLElement>();

  get components() {
    return this.pageStatus.components;
  }
  get activeComponent() {
    return this.pageStatus.activeComponent;
  }
  get activeComponent2() {
    return this.pageStatus.activeComponent2;
  }
  get showComponentMenu() {
    return this.pageStatus.showComponentMenu;
  }

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
    const inputGroups: InputGroup[] = [];
    const onChange = () => {
      this.components.update((v) => [...v]);
    };
    if (component instanceof PageComponentText) {
      mergeGroups(inputGroups, getTextInputs(component, onChange));
    }
    if (component instanceof PageComponentImage) {
      mergeGroups(inputGroups, getImageInputs(component, onChange, this.http));
    }
    if (component instanceof PageComponentForm) {
      mergeGroups(inputGroups, getFormInputs(component, onChange));
    }
    if (component instanceof PageComponentBase) {
      mergeGroups(inputGroups, getCommonInputs(component, onChange, this.onComponentSizeChange.bind(this)));
    }

    const expandedGroups = this.expandedGroups();
    for (const group of inputGroups) {
      group.expanded = expandedGroups.includes(group.name);
    }
    return inputGroups;
  });
  onComponentSizeChange(component: PageComponentTypeAny, axis: "x" | "y") {
    if (component instanceof PageComponentImage) {
      if (component.keepRatio) {
        const ratio = component.naturalRatio;
        if (axis === "x") {
          component.size.y = component.size.x / ratio;
        } else {
          component.size.x = component.size.y * ratio;
        }
      }
    }
    updateGroup(this.components(), component);
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
