import {Component, ElementRef, HostBinding, inject, input, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {VarNameItem} from "./var-names.types";

@Component({
  selector: "app-var-names",
  imports: [MatButtonModule, MatDividerModule, MatIconModule, NgScrollbarModule],
  templateUrl: "./var-names.component.html",
  styleUrl: "./var-names.component.scss"
})
export class VarNamesComponent {
  private message = inject(MessageService);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostBinding("class") class = "ng-page";

  varNameItem = input.required<VarNameItem>();
  namesPerRow = input(1);

  clickVarName(name: string) {
    this.message.copyText(name);
  }

  openDoc() {
    window.open("https://www.kdocs.cn/l/ckbuWeJhOajS");
  }

  scrollbar = viewChild(NgScrollbar);
  activeNameGroupIndexs = signal<number[]>([]);
  scrollToGroup(name: string) {
    const el = this.el.nativeElement;
    const scrollbar = this.scrollbar();
    const index = this.varNameItem().nameGroups?.findIndex((v) => v.groupName === name);
    if (!scrollbar || typeof index !== "number" || index < 0) {
      return;
    }
    const target = el.querySelectorAll(`.var-names-group`).item(index);
    if (target) {
      scrollbar.scrollToElement(target);
      this.activeNameGroupIndexs.set([index]);
    }
  }
}
