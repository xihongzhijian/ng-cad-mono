import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {ChangeDetectionStrategy, Component, inject, model} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {getCopyName} from "@app/app.common";
import {MessageService} from "@app/modules/message/services/message.service";
import {PageComponentTypeAny} from "../../models/page-component-infos";

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

  components = model.required<PageComponentTypeAny[]>();
  activeComponent = model.required<PageComponentTypeAny | null>();
  showComponentMenu = model.required<boolean>();

  async getActiveComponent() {
    const component = this.activeComponent();
    if (!component) {
      await this.message.snack("请先选择一个组件");
    }
    return component;
  }
  async copy() {
    const component = await this.getActiveComponent();
    if (!component) {
      return;
    }
    const components = this.components();
    const names = components.map((v) => v.name);
    const clone = component.clone(true);
    clone.name = getCopyName(names, clone.name);
    this.components.set([...components, clone]);
  }
  async remove() {
    const component = await this.getActiveComponent();
    if (!component) {
      return;
    }
    this.components.update((v) => v.filter((v) => v.id !== component.id));
  }

  toggleHidden(component: PageComponentTypeAny) {
    component.toggleHidden();
  }
  toggleLock(component: PageComponentTypeAny) {
    component.toggleLock();
  }
  click(component: PageComponentTypeAny) {
    this.activeComponent.set(component);
    this.showComponentMenu.set(true);
  }

  drop(event: CdkDragDrop<PageComponentTypeAny[]>) {
    const components = this.components();
    moveItemInArray(components, event.previousIndex, event.currentIndex);
    this.components.set([...components]);
  }
}
