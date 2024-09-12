import {ChangeDetectionStrategy, Component, HostBinding, inject, input} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {VarNameItem} from "./var-names.types";

@Component({
  selector: "app-var-names",
  standalone: true,
  imports: [MatButtonModule, MatDividerModule, MatIconModule, NgScrollbarModule],
  templateUrl: "./var-names.component.html",
  styleUrl: "./var-names.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VarNamesComponent {
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  varNameItem = input.required<VarNameItem>();
  namesPerRow = input(1);

  clickVarName(name: string) {
    this.message.copyText(name);
  }

  openDoc() {
    window.open("https://www.kdocs.cn/l/ckbuWeJhOajS");
  }
}
