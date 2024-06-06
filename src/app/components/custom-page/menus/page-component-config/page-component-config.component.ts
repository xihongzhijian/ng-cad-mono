import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {ChangeDetectionStrategy, Component, inject, model} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MessageService} from "@app/modules/message/services/message.service";
import {PageComponentBase} from "../../models/page-components/page-component-base";

@Component({
  selector: "app-page-component-config",
  standalone: true,
  imports: [CdkDrag, CdkDropList, MatButtonModule, MatIconModule],
  templateUrl: "./page-component-config.component.html",
  styleUrl: "./page-component-config.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponentConfigComponent {
  private message = inject(MessageService);

  components = model.required<PageComponentBase[]>();
  activeComponent = model.required<PageComponentBase | null>();

  async getActiveComponent() {
    const component = this.activeComponent();
    if (!component) {
      await this.message.error("请先选择一个组件");
    }
    return component;
  }
  async copy() {
    const component = await this.getActiveComponent();
    if (!component) {
      return;
    }
    this.components.update((v) => [...v, component.clone()]);
  }
  async remove() {
    const component = await this.getActiveComponent();
    if (!component) {
      return;
    }
    this.components.update((v) => v.filter((v) => v.id !== component.id));
  }

  toggleHidden(component: PageComponentBase) {
    component.toggleHidden();
  }
  toggleLock(component: PageComponentBase) {
    component.toggleLock();
  }
  click(component: PageComponentBase) {
    this.activeComponent.set(component);
  }

  drop(event: CdkDragDrop<PageComponentBase[]>) {
    const components = this.components();
    moveItemInArray(components, event.previousIndex, event.currentIndex);
    this.components.set([...components]);
  }
}
