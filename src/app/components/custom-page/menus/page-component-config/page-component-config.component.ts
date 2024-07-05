import {CdkDrag, CdkDragDrop, CdkDropList, transferArrayItem} from "@angular/cdk/drag-drop";
import {NgTemplateOutlet} from "@angular/common";
import {ChangeDetectionStrategy, Component, computed, inject, signal} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {getCopyName, getInsertName} from "@app/app.common";
import {ClickStopPropagationDirective} from "@app/modules/directives/click-stop-propagation.directive";
import {TypedTemplateDirective} from "@app/modules/directives/typed-template.directive";
import {MessageService} from "@app/modules/message/services/message.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {PageComponentTypeAny} from "../../models/page-component-infos";
import {
  beforeJoinGroup,
  beforeLeaveGroup,
  flatMapPageComponents,
  flatPageComponents,
  getPageComponentGroup,
  removePageComponent
} from "../../models/page-component-utils";
import {PageComponentGroup} from "../../models/page-components/page-component-group";
import {PageStatusService} from "../../services/page-status.service";

@Component({
  selector: "app-page-component-config",
  standalone: true,
  imports: [
    CdkDrag,
    CdkDropList,
    ClickStopPropagationDirective,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    NgScrollbarModule,
    NgTemplateOutlet,
    TypedTemplateDirective
  ],
  templateUrl: "./page-component-config.component.html",
  styleUrl: "./page-component-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentConfigComponent {
  private message = inject(MessageService);
  private pageStatus = inject(PageStatusService);

  get components() {
    return this.pageStatus.components;
  }

  componentsTplType!: {$implicit: PageComponentTypeAny[]; level: number; id: string};
  hoveringId = signal<string | null>(null);
  editingId = signal<string | null>(null);

  async getActiveComponents() {
    const components = this.pageStatus.activeComponents();
    if (components.length < 1) {
      await this.message.snack("请先选择一个组件");
    }
    return components;
  }
  canGroup = computed(() => {
    const activeComponents = this.pageStatus.activeComponents();
    return activeComponents.length > 1 || (activeComponents.length === 1 && activeComponents[0] instanceof PageComponentGroup);
  });
  async group() {
    const activeComponents = await this.getActiveComponents();
    if (!this.canGroup()) {
      return;
    }
    const components = this.components();
    const names = Array.from(flatMapPageComponents(components, true, (v) => v.name));
    const activeComponentGroups = activeComponents.map((v) => getPageComponentGroup(components, v));
    const groupIndex = activeComponentGroups.findIndex((v) => v instanceof PageComponentGroup);
    if (groupIndex >= 0) {
      for (const [i, group] of activeComponentGroups.entries()) {
        if (i === groupIndex || !group) {
          continue;
        }
        beforeLeaveGroup(group, [activeComponents[i]]);
      }
      const group = activeComponentGroups[groupIndex] as PageComponentGroup;
      for (const [i, component] of activeComponents.entries()) {
        if (i === groupIndex) {
          continue;
        }
        beforeJoinGroup(group, [component]);
        group.children.push(component);
      }
    } else {
      const group = new PageComponentGroup(getInsertName(names, "分组"));
      beforeJoinGroup(group, activeComponents);
      group.children = activeComponents;
      group.expanded = true;
      const component2 = components.filter((v) => !activeComponents.some((v2) => v2.id === v.id));
      component2.push(group);
      this.components.set(component2);
    }
  }
  canUngroup = computed(() => {
    const activeComponents = this.pageStatus.activeComponents();
    return activeComponents.length === 1 && activeComponents[0] instanceof PageComponentGroup;
  });
  async ungroup() {
    const activeComponents = await this.getActiveComponents();
    if (!this.canUngroup()) {
      return;
    }
    const component = activeComponents[0] as PageComponentGroup;
    const components = this.components();
    const components2 = getPageComponentGroup(components, component)?.children || components;
    const index = components2.findIndex((v) => v.id === component.id);
    beforeLeaveGroup(component, component.children);
    components2.splice(index, 1, ...component.children);
    this.components.set([...components]);
  }
  private _componentsToCopy: PageComponentTypeAny[] = [];
  async copy() {
    this._componentsToCopy = await this.getActiveComponents();
  }
  paste() {
    const componentsToCopy = this._componentsToCopy;
    if (componentsToCopy.length < 1) {
      return;
    }
    const components = this.components();
    const names = Array.from(flatMapPageComponents(components, true, (v) => v.name));
    for (const component of componentsToCopy) {
      const clone = component.clone(true);
      clone.name = getCopyName(names, clone.name);
      const components2 = getPageComponentGroup(components, component)?.children || components;
      components2.push(clone);
    }
    this.components.set([...components]);
  }
  async copyAndPaste() {
    await this.copy();
    this.paste();
  }
  async remove() {
    const componentsToRemove = await this.getActiveComponents();
    const components = this.components();
    for (const component of componentsToRemove) {
      removePageComponent(components, component);
    }
    this.components.set([...components]);
  }

  toggleHidden(component: PageComponentTypeAny) {
    component.toggleHidden();
    this.components.update((v) => [...v]);
  }
  toggleLock(component: PageComponentTypeAny) {
    component.toggleLock();
    this.components.update((v) => [...v]);
  }
  toggleExpanded(component: PageComponentGroup) {
    component.expanded = !component.expanded;
    this.components.update((v) => [...v]);
  }
  click(event: MouseEvent, component: PageComponentTypeAny) {
    if (event.ctrlKey) {
      const activeComponents = this.pageStatus.activeComponents();
      if (activeComponents.find((v) => v.id === component.id)) {
        this.pageStatus.activeComponents.set(activeComponents.filter((v) => v.id !== component.id));
      } else {
        this.pageStatus.activeComponents.set([...activeComponents, component]);
      }
    } else {
      this.pageStatus.activeComponents.set([component]);
    }
  }
  dblClick(event: Event, component: PageComponentTypeAny) {
    event.stopPropagation();
    this.editingId.set(component.id);
  }
  blur() {
    this.editingId.set(null);
    this.components.update((v) => [...v]);
  }
  pointerEnter(event: PointerEvent, component: PageComponentTypeAny) {
    event.stopPropagation();
    this.hoveringId.set(component.id);
  }
  pointerLeave(event: PointerEvent, component: PageComponentTypeAny) {
    event.stopPropagation();
    if (this.hoveringId() === component.id) {
      const group = getPageComponentGroup(this.components(), component);
      this.hoveringId.set(group?.id || null);
    }
  }

  // todo: https://stackblitz.com/edit/angular-cdk-nested-drag-drop-tree-structure
  dropListIds = computed(() => {
    const ids = ["main"];
    for (const component of flatPageComponents(this.components(), true)) {
      if (component.type === "group") {
        ids.push(component.id);
      }
    }
    return ids;
  });
  isDropListDisabled() {
    return !!this.editingId();
  }
  drop(event: CdkDragDrop<PageComponentTypeAny[]>) {
    const {previousContainer, container, previousIndex, currentIndex} = event;
    const prev = previousContainer.data[previousIndex];
    const curr = container.data[currentIndex];
    const components = this.components();
    const prevGroup = getPageComponentGroup(components, prev);
    const currGroup = curr ? getPageComponentGroup(components, curr) : null;
    if (prevGroup) {
      beforeLeaveGroup(prevGroup, [prev]);
    }
    if (currGroup) {
      beforeJoinGroup(currGroup, [prev]);
    }
    transferArrayItem(previousContainer.data, container.data, previousIndex, currentIndex);
    this.components.update((v) => [...v]);
  }

  isComponentGroup(component: PageComponentTypeAny): component is PageComponentGroup {
    return component.type === "group";
  }

  isActiveComponent(component: PageComponentTypeAny) {
    return this.pageStatus.activeComponents().some((v) => v.id === component.id);
  }
}
